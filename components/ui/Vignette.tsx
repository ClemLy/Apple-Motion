"use client";

import { useEffect, useRef } from "react";

/**
 * A soft darkening at the edges of the screen.
 *
 * Barely there at the top of the page and a little deeper by the time the
 * visitor reaches the sign-off, the way a room feels different once the light
 * from the door is a long way behind. Reading the frame is what a vignette is
 * for: without one, five bright rooms in a row have no edge to them at all.
 */
export function Vignette() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;

    const measure = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      // Held to a narrow band: enough to feel like framing, never enough to
      // read as a filter over the page.
      const opacity = 0.16 + progress * 0.22;
      element.style.opacity = opacity.toFixed(3);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[45]"
      style={{
        opacity: 0.16,
        background:
          "radial-gradient(ellipse at center, transparent 58%, rgb(0 0 0 / 0.5) 130%)",
      }}
    />
  );
}
