"use client";

/**
 * Offline frame renderer. Never linked, never visited by a person.
 *
 * `scripts/render-sequences.mjs` drives this page: it asks for one frame at a
 * time, screenshots the canvas, and writes the sequence to disk. The site
 * itself ships none of this — at runtime the products are flat images drawn to
 * a 2D canvas.
 *
 * Frames are rendered on transparent backgrounds and cropped to the product,
 * so the section colour behind them is plain CSS. That keeps the sequences
 * small and lets a background change instantly without re-rendering anything.
 */

import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import * as THREE from "three";

import { RenderStudio } from "@/components/three/RenderStudio";
import { buildClamshell, type Clamshell } from "@/lib/clamshell";
import { normalize, tuneProduct } from "@/lib/materials";
import { PRODUCTS, type ProductId } from "@/lib/products";
import { SHOTS } from "@/lib/render-config";

/** Set by the driver before each `advance()`; read inside the frame callback. */
const cursor = { frame: 0 };

declare global {
  interface Window {
    __seek?: (frame: number) => void;
    __sequenceReady?: boolean;
    __frameCount?: number;
  }
}

function Subject({ id }: { id: ProductId }) {
  const config = PRODUCTS[id];
  const shot = SHOTS[id];
  const { scene, animations } = useGLTF(config.model, false);
  const gl = useThree((s) => s.gl);
  const advance = useThree((s) => s.advance);

  const group = useRef<THREE.Group>(null);
  const model = useMemo(() => scene.clone(true), [scene]);
  const clamshell = useRef<Clamshell>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const action = useRef<THREE.AnimationAction | null>(null);

  useLayoutEffect(() => {
    normalize(model, shot.size);
    tuneProduct(model, config.tuning, gl.capabilities.getMaxAnisotropy());
    clamshell.current = buildClamshell(model);

    if (animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(model);
      const clip = mixer.current.clipAction(animations[0]);
      clip.play();
      clip.paused = true;
      action.current = clip;
    }

    window.__frameCount = shot.frames;
    window.__seek = (frame: number) => {
      cursor.frame = frame;
      advance(performance.now());
    };
    window.__sequenceReady = true;

    return () => {
      window.__sequenceReady = false;
      delete window.__seek;
    };
  }, [model, config, shot, animations, gl, advance]);

  useFrame(() => {
    if (!group.current) return;

    const t = shot.frames > 1 ? cursor.frame / shot.frames : 0;
    const pose = shot.pose(t);

    group.current.rotation.set(
      (pose.rx * Math.PI) / 180,
      ((config.front + pose.ry) * Math.PI) / 180,
      0
    );
    group.current.position.y = shot.lift;

    clamshell.current?.apply(pose.lid);

    if (action.current && mixer.current) {
      action.current.time = pose.clip;
      mixer.current.update(0);
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

/**
 * A soft pool of shadow, baked into the frame's alpha along with the product.
 *
 * The falloff is sampled across many stops rather than the three or four a
 * gradient normally needs. With only a few, the steps between them survive both
 * the 8-bit alpha channel and WebP's alpha quantisation, and the shadow ships
 * as a set of visible concentric rings under every product.
 */
function GroundShadow({ y }: { y: number }) {
  const texture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    const STOPS = 48;
    for (let i = 0; i <= STOPS; i += 1) {
      const t = i / STOPS;
      // A gaussian-ish shoulder: dense near the contact point, long tail out.
      const alpha = 0.46 * Math.exp(-4.2 * t * t) * (1 - t);
      gradient.addColorStop(t, `rgba(0,0,0,${alpha.toFixed(4)})`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[6, 3.8]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export default function RenderPage() {
  return (
    <Suspense fallback={null}>
      <RenderScene />
    </Suspense>
  );
}

function RenderScene() {
  const params = useSearchParams();

  useEffect(() => {
    // The app's own stylesheet paints an opaque ground on <body>. Playwright's
    // `omitBackground` only clears the browser's *default* background, so that
    // paint was ending up baked behind every frame and the sequences shipped
    // with no alpha at all. Clear it for this route only.
    const previousHtml = document.documentElement.style.background;
    const previousBody = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = previousHtml;
      document.body.style.background = previousBody;
    };
  }, []);

  const requested = params.get("product") as ProductId | null;
  const id: ProductId = requested && PRODUCTS[requested] ? requested : "iphone";
  const size = Number(params.get("size") ?? 1400);
  const shot = SHOTS[id];

  return (
    <div
      style={{
        width: size,
        height: size,
        // Checkerboard-free: the driver screenshots with `omitBackground`, so
        // anything opaque here would end up baked into the frames.
        background: "transparent",
      }}
    >
      <Canvas
        // Rendered one frame at a time, on demand, by the driver.
        frameloop="never"
        dpr={1}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0, shot.distance], fov: shot.fov, near: 0.1, far: 100 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.setClearAlpha(0);
        }}
      >
        <Suspense fallback={null}>
          <RenderStudio />
          <Subject id={id} />
          <GroundShadow y={-1.62} />
        </Suspense>
      </Canvas>
    </div>
  );
}
