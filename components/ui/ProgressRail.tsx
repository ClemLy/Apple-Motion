"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CATALOGUE } from "@/lib/catalogue";

/**
 * Where you are in the tour, and how fast you are moving through it.
 *
 * One track per product. The track fills as its section plays, so the rail
 * reads as a chapter list with the current chapter half read. The active
 * track is drawn out longer and names its number.
 *
 * It also answers the scroll's speed. Move quickly and the tracks spread apart
 * and the whole rail trails behind the movement, then settles back as the page
 * comes to rest, so even the page's most static piece of furniture has weight.
 *
 * Decorative, and hidden from assistive technology: the section headings
 * already carry this information.
 */
export function ProgressRail() {
  const root = useRef<HTMLDivElement>(null);
  const rows = useRef<HTMLDivElement[]>([]);
  const fills = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sections = CATALOGUE.map((entry) => document.getElementById(entry.anchor));

    /**
     * Section positions, measured when the layout changes rather than every
     * frame. Reading a bounding box inside the animation loop, after the
     * scroll timelines have written their transforms for that frame, forces
     * the browser to lay the page out again on every frame. The sections
     * themselves are never transformed, so their document offsets hold until
     * the next resize.
     */
    let spans: { top: number; height: number }[] = [];
    const measure = () => {
      const scrolled = window.scrollY;
      spans = sections.map((section) => {
        const box = section?.getBoundingClientRect();
        return box ? { top: box.top + scrolled, height: box.height } : { top: 0, height: 0 };
      });
    };
    measure();
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.addEventListener("refresh", measure);
    window.addEventListener("resize", measure);

    let raf = 0;
    let lastY = window.scrollY;
    let velocity = 0;
    let active = -2;
    let visible: boolean | null = null;

    const tick = () => {
      raf = requestAnimationFrame(tick);

      const viewport = window.innerHeight;
      const y = window.scrollY;
      // Smoothed, so a single large wheel step does not make the rail jump.
      velocity += (y - lastY - velocity) * 0.18;
      lastY = y;

      const middle = y + viewport / 2;
      let found = -1;
      const progress = spans.map((span, index) => {
        if (span.height === 0) return 0;
        if (span.top <= middle && span.top + span.height >= middle) found = index;
        return Math.min(1, Math.max(0, (y - span.top) / Math.max(1, span.height - viewport)));
      });

      const first = spans[0];
      const last = spans[spans.length - 1];
      const inRange = !!first && !!last && first.top < middle && last.top + last.height > middle;

      if (inRange !== visible) {
        visible = inRange;
        element.style.opacity = inRange ? "1" : "0";
      }

      if (found !== active) {
        active = found;
        rows.current.forEach((row, index) => {
          row.dataset.active = index === found ? "true" : "false";
        });
      }

      progress.forEach((value, index) => {
        const fill = fills.current[index];
        if (fill) fill.style.transform = `scaleX(${value.toFixed(4)})`;
      });

      if (still) return;
      const speed = Math.min(1, Math.abs(velocity) / 60);
      element.style.setProperty("--rail-gap", `${(12 + speed * 16).toFixed(2)}px`);
      element.style.transform = `translate3d(0, calc(-50% + ${(-velocity * 0.9).toFixed(2)}px), 0)`;
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ScrollTrigger.removeEventListener("refresh", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="progress-rail pointer-events-none fixed top-1/2 right-6 z-40 hidden flex-col items-end md:right-10 lg:flex"
      style={{ transform: "translate3d(0, -50%, 0)", opacity: 0 }}
    >
      {CATALOGUE.map((entry, index) => (
        <div
          key={entry.id}
          ref={(node) => {
            if (node) rows.current[index] = node;
          }}
          data-active="false"
          className="progress-rail-row flex items-center gap-2.5"
        >
          <span className="progress-rail-index tech-label text-ink">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="progress-rail-track relative block h-px overflow-hidden bg-ink/20">
            <span
              ref={(node) => {
                if (node) fills.current[index] = node;
              }}
              className="absolute inset-0 block origin-left bg-ink"
              style={{ transform: "scaleX(0)" }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
