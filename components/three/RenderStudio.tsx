"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * The lighting used to shoot the sequences.
 *
 * Deliberately high-key and low-contrast: broad sources, close in, at nearly
 * matched intensities. The earlier rig used a hard strip light to draw a
 * dramatic streak down the chassis, which read as theatrical rather than as
 * catalogue photography — the references this site is built from are lit flat
 * and bright, with the product's own colour doing the work.
 *
 * There are still no point lights. Product photography is lit by large
 * rectangles, and the shape of those rectangles is what you see reflected in
 * the metal.
 */
export function RenderStudio() {
  /**
   * The surround is a vertical gradient, not a flat colour.
   *
   * This is the difference between a product that looks photographed and one
   * that looks like flat vector art. Every reflective surface mirrors this
   * sphere; if it is one uniform tone, the back of an aluminium phone comes
   * back as a single unshaded block of colour no matter how good the softboxes
   * are. A bright sky falling to a darker floor gives every curved surface a
   * gradient to reflect, which is what reads as form.
   */
  const surround = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.42, "#eef0f4");
    gradient.addColorStop(0.62, "#c8ccd5");
    gradient.addColorStop(1, "#9aa0ad");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  return (
    <Environment resolution={1024} frames={1}>
      <mesh scale={100}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial map={surround} side={1} />
      </mesh>

      {/* KEY — a wide, close overhead softbox. */}
      <Lightformer
        form="rect"
        intensity={3.4}
        color="#ffffff"
        position={[-0.6, 5, 3.4]}
        rotation={[-Math.PI / 2.3, 0, 0]}
        scale={[12, 9, 1]}
      />

      {/* SIDE FILLS — broad and nearly matched, so neither edge goes dark and
          neither draws a hard highlight line. */}
      <Lightformer
        form="rect"
        intensity={2.4}
        color="#ffffff"
        position={[-5, 0.6, 2.4]}
        rotation={[0, Math.PI / 2.4, 0]}
        scale={[7, 8, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.25}
        color="#f7f9ff"
        position={[5, 0.4, 2.2]}
        rotation={[0, -Math.PI / 2.4, 0]}
        scale={[7, 8, 1]}
      />

      {/* RIM — just enough to lift the silhouette off the background. */}
      <Lightformer
        form="rect"
        intensity={2.4}
        color="#ffffff"
        position={[0, 2.4, -5]}
        rotation={[0, Math.PI, 0]}
        scale={[7, 5, 1]}
      />

      {/* BOUNCE — a white card on the floor, so the underside keeps its form. */}
      <Lightformer
        form="rect"
        intensity={1.3}
        color="#ffffff"
        position={[0, -3.4, 1.6]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[9, 9, 1]}
      />
    </Environment>
  );
}
