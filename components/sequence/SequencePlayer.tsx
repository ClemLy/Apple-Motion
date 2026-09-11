"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { getSequence } from "@/lib/sequence";
import { footprintOf } from "@/lib/footprint";
import type { ProductId } from "@/lib/products";

/**
 * A soft elliptical shadow, drawn once and stamped under the product at any
 * size. Many stops for the same reason as the rendered pool: with few, the
 * steps show as rings.
 */
let shadowSprite: HTMLCanvasElement | null = null;
function getShadowSprite() {
  if (shadowSprite) return shadowSprite;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  const STOPS = 32;
  for (let i = 0; i <= STOPS; i += 1) {
    const t = i / STOPS;
    gradient.addColorStop(t, `rgba(0,0,0,${(Math.exp(-5 * t * t) * (1 - t)).toFixed(4)})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  shadowSprite = canvas;
  return canvas;
}

/**
 * Draws one frame of a product sequence to a 2D canvas, scrubbed by scroll.
 *
 * The scroll position arrives through a ref and is read inside the animation
 * loop, never through React state: at 120 Hz a state update per frame would
 * re-render the tree ninety times a second and turn the scrub into a slideshow.
 *
 * The loop redraws only when the chosen frame actually changes, so holding
 * still costs nothing.
 */
export function SequencePlayer({
  product,
  progress,
  className = "",
  onReady,
  shadow = true,
  placeholder = true,
}: {
  product: ProductId;
  /** 0-1 through the sequence. Read every frame. */
  progress: RefObject<number>;
  className?: string;
  onReady?: () => void;
  /** Ground the product with a shadow that follows its silhouette. */
  shadow?: boolean;
  /** Hold the slot with a quiet loading state until the first frame lands. */
  placeholder?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    const sequence = getSequence(product);
    let raf = 0;
    let lastDrawn = -1;
    let cancelled = false;
    // How far the first real frame has faded in over the loading state.
    let reveal = 0;
    let lastTime = 0;

    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      // `clientWidth`/`clientHeight` on purpose, not `getBoundingClientRect`.
      // The hero animates this canvas's ancestor through a CSS `scale`
      // transform as the product arrives. `getBoundingClientRect` is
      // transform-aware and `ResizeObserver` is not, so the two together sized
      // the canvas once at whatever scale was current on first paint and never
      // again. The untransformed layout size keeps the backing store at its
      // true final resolution, and a CSS scale on an ancestor only ever
      // downsamples it, which stays sharp.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.round(element.clientWidth * dpr);
      const height = Math.round(element.clientHeight * dpr);
      if (width === 0 || height === 0) return;
      if (element.width === width && element.height === height) return;
      element.width = width;
      element.height = height;
      lastDrawn = -1;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    /**
     * The loading state: a shadow breathing on the ground where the product
     * will stand, and a short arc turning above it. Deliberately faint. It
     * only has to say "something is on its way", not fill the room.
     */
    const drawPlaceholder = (time: number) => {
      const w = element.width;
      const h = element.height;
      ctx.clearRect(0, 0, w, h);
      const breath = 0.5 + 0.5 * Math.sin(time / 520);

      const sprite = getShadowSprite();
      if (sprite) {
        const sw = w * (0.46 + breath * 0.08);
        const sh = Math.max(8, sw * 0.12);
        ctx.globalAlpha = 0.16 + breath * 0.08;
        ctx.drawImage(sprite, (w - sw) / 2, h * 0.86 - sh / 2, sw, sh);
      }

      const radius = Math.min(w, h) * 0.045;
      const cx = w / 2;
      const cy = h * 0.48;
      const lineWidth = Math.max(1, radius * 0.08);
      ctx.globalAlpha = 1;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(13,13,15,0.08)";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      const start = (time / 380) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(13,13,15,0.4)";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, start + Math.PI * 0.55);
      ctx.stroke();
    };

    /**
     * The ground shadow, shaped by this frame's silhouette.
     *
     * As wide as the object, centred under it, and tighter and darker the
     * closer its lowest point comes to the ground, so a laptop turning
     * side-on pulls its shadow in and a phone rocking toward the floor gains
     * a firm contact shadow it did not have while it hovered.
     */
    const drawShadow = (bitmap: ImageBitmap, x: number, y: number, w: number, h: number, opacity: number) => {
      const foot = footprintOf(bitmap);
      const sprite = getShadowSprite();
      if (!foot || !sprite) return;

      const centre = x + ((foot.left + foot.right) / 2) * w;
      const span = (foot.right - foot.left) * w;
      const groundY = y + foot.ground * h;
      const lift = Math.max(0, foot.ground - foot.bottom);
      const near = 1 - Math.min(1, lift * 7);

      // The broad, soft body of the shadow.
      const bodyWidth = span * (1.02 + lift * 1.6);
      const bodyHeight = Math.max(6, bodyWidth * 0.14);
      ctx.globalAlpha = (0.22 + near * 0.16) * opacity;
      ctx.drawImage(sprite, centre - bodyWidth / 2, groundY - bodyHeight / 2, bodyWidth, bodyHeight);

      // The contact core, only where the object nearly touches.
      if (near > 0.05) {
        const coreWidth = span * 0.72;
        const coreHeight = Math.max(4, coreWidth * 0.06);
        ctx.globalAlpha = 0.4 * near * opacity;
        ctx.drawImage(sprite, centre - coreWidth / 2, groundY - coreHeight / 2, coreWidth, coreHeight);
      }
      ctx.globalAlpha = 1;
    };

    /**
     * Softens the rendered shadow where the frame crops it.
     *
     * The frames are cropped to the union of every angle's silhouette, and the
     * faint outer tail of the pool runs past that crop, so it ended in a hard
     * line at the canvas edge. The strips beside the object are faded out over
     * their full height, but only as far in as the object's own edge in this
     * frame, and the bottom only below its base, so nothing of the object is
     * ever touched.
     */
    const featherGround = (bitmap: ImageBitmap, x: number, y: number, w: number, h: number) => {
      const foot = footprintOf(bitmap);
      if (!foot) return;
      const width = element.width;
      const height = element.height;
      const reach = width * 0.18;
      const margin = w * 0.02;

      ctx.globalCompositeOperation = "destination-out";

      const leftEdge = Math.min(reach, x + foot.left * w - margin);
      if (leftEdge > 1) {
        const fade = ctx.createLinearGradient(0, 0, leftEdge, 0);
        fade.addColorStop(0, "rgba(0,0,0,1)");
        fade.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, leftEdge, height);
      }

      const rightStart = Math.max(width - reach, x + foot.right * w + margin);
      if (width - rightStart > 1) {
        const fade = ctx.createLinearGradient(rightStart, 0, width, 0);
        fade.addColorStop(0, "rgba(0,0,0,0)");
        fade.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = fade;
        ctx.fillRect(rightStart, 0, width - rightStart, height);
      }

      const base = y + foot.bottom * h + margin;
      const bottomStart = Math.max(base, height * 0.9);
      if (height - bottomStart > 1) {
        const fade = ctx.createLinearGradient(0, bottomStart, 0, height);
        fade.addColorStop(0, "rgba(0,0,0,0)");
        fade.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = fade;
        ctx.fillRect(0, bottomStart, width, height - bottomStart);
      }

      ctx.globalCompositeOperation = "source-over";
    };

    const draw = (time: number) => {
      raf = requestAnimationFrame(draw);
      if (cancelled) return;
      const delta = lastTime ? time - lastTime : 16;
      lastTime = time;

      const total = sequence.manifest?.frames ?? 0;
      const t = Math.max(0, Math.min(1, progress.current ?? 0));
      const index = total > 0 ? Math.min(total - 1, Math.round(t * (total - 1))) : 0;
      const bitmap = total > 0 ? sequence.nearest(index) : null;

      if (!bitmap) {
        reveal = 0;
        lastDrawn = -1;
        if (element.dataset.state !== "placeholder") element.dataset.state = "placeholder";
        if (placeholder) drawPlaceholder(time);
        return;
      }

      const fading = reveal < 1;
      if (fading) reveal = Math.min(1, reveal + delta / 420);
      if (index === lastDrawn && !fading) return;

      lastDrawn = index;
      if (element.dataset.state !== "frame") element.dataset.state = "frame";

      if (fading && placeholder) {
        drawPlaceholder(time);
        ctx.globalAlpha = 1;
        // Clear the placeholder out in proportion as the product arrives.
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = `rgba(0,0,0,${reveal})`;
        ctx.fillRect(0, 0, element.width, element.height);
        ctx.globalCompositeOperation = "source-over";
      } else {
        ctx.clearRect(0, 0, element.width, element.height);
      }

      // Contain-fit, so the product keeps its proportions whatever the slot.
      const scale = Math.min(element.width / bitmap.width, element.height / bitmap.height);
      const w = bitmap.width * scale;
      const h = bitmap.height * scale;
      const x = (element.width - w) / 2;
      const y = (element.height - h) / 2;

      // The product and its shadow fade in together over the loading state.
      const opacity = fading && placeholder ? reveal : 1;
      ctx.save();
      if (shadow) drawShadow(bitmap, x, y, w, h, opacity);
      ctx.globalAlpha = opacity;
      ctx.drawImage(bitmap, x, y, w, h);
      ctx.restore();

      if (shadow) featherGround(bitmap, x, y, w, h);
    };

    const unsubscribe = sequence.onProgress(() => {
      if (sequence.manifest) setAspect(sequence.manifest.aspect);
      // Force a redraw when a better frame for the current position arrives.
      lastDrawn = -1;
      if (sequence.loaded > 0) onReady?.();
    });

    // Deliberately no `load()` here. Every product section mounts with the
    // page, and a player that fetched its own frames on mount had all five
    // sequences downloading in the first second, defeating the proximity
    // loading the sections do. The player only draws what has arrived.

    raf = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      unsubscribe();
    };
  }, [product, progress, onReady, shadow, placeholder]);

  return (
    <canvas
      ref={canvas}
      className={className}
      style={{ aspectRatio: aspect }}
      data-cursor="product"
      aria-hidden="true"
    />
  );
}
