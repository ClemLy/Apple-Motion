"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { getSequence } from "@/lib/sequence";
import type { ProductId } from "@/lib/products";

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
}: {
  product: ProductId;
  /** 0-1 through the sequence. Read every frame. */
  progress: RefObject<number>;
  className?: string;
  onReady?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    const sequence = getSequence(product);
    let raf = 0;
    let lastDrawn = -1;
    let cancelled = false;

    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      // `clientWidth`/`clientHeight` on purpose, not `getBoundingClientRect`.
      // The hero animates this canvas's ancestor through a CSS `scale`
      // transform (0.34 -> 1) as the product arrives. `getBoundingClientRect`
      // is transform-aware and `ResizeObserver` is not — it only fires on
      // layout-box changes, never on a transform. The two together meant the
      // canvas sized itself once, at whatever scale happened to be current on
      // first paint (often the smallest one), and never resized again as the
      // transform grew it — so it displayed a low-resolution backing store
      // stretched up to full size. `clientWidth`/`clientHeight` are the
      // untransformed layout size, so the canvas always renders at its true
      // final resolution and a CSS scale on an ancestor only ever downsamples
      // it, which stays sharp.
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

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (cancelled) return;

      const total = sequence.manifest?.frames ?? 0;
      if (total === 0) return;

      const t = Math.max(0, Math.min(1, progress.current ?? 0));
      const index = Math.min(total - 1, Math.round(t * (total - 1)));
      if (index === lastDrawn) return;

      const bitmap = sequence.nearest(index);
      if (!bitmap) return;

      lastDrawn = index;
      ctx.clearRect(0, 0, element.width, element.height);

      // Contain-fit, so the product keeps its proportions whatever the slot.
      const scale = Math.min(element.width / bitmap.width, element.height / bitmap.height);
      const w = bitmap.width * scale;
      const h = bitmap.height * scale;
      ctx.drawImage(bitmap, (element.width - w) / 2, (element.height - h) / 2, w, h);
    };

    const unsubscribe = sequence.onProgress(() => {
      if (sequence.manifest) setAspect(sequence.manifest.aspect);
      // Force a redraw when a better frame for the current position arrives.
      lastDrawn = -1;
      if (sequence.loaded > 0) onReady?.();
    });

    sequence.load().catch(() => {
      // Reported through the section's own loading state; nothing to do here.
    });

    raf = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      unsubscribe();
    };
  }, [product, progress, onReady]);

  return (
    <canvas
      ref={canvas}
      className={className}
      style={{ aspectRatio: aspect }}
      aria-hidden="true"
    />
  );
}
