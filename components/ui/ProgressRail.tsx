"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CATALOGUE } from "@/lib/catalogue";
import { onTick } from "@/lib/ticker";

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

    let lastY = window.scrollY;
    let velocity = 0;
    let active = -2;
    let visible: boolean | null = null;

    const tick = () => {
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

    const stopTick = onTick(tick);
    return () => {
      stopTick();
      ScrollTrigger.removeEventListener("refresh", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  /**
   * The rail doubles as a scrollbar: grab it anywhere and the page follows
   * the pointer's position within it, live, the whole way — not only once
   * the pointer is released. Mouse-only (`pointer: fine`): the rail is a
   * compact target next to the edge of the screen, exactly the kind of small
   * precise hit-test a touch drag would fight with the page's own scroll
   * gesture over, and every product it can reach is already one scroll or a
   * keyboard shortcut away.
   */
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let dragging = false;

    const scrollToPointer = (clientY: number) => {
      const box = element.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (clientY - box.top) / box.height));
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, fraction * max);
    };

    const onDown = (event: PointerEvent) => {
      dragging = true;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = "true";
      scrollToPointer(event.clientY);
    };
    const onMove = (event: PointerEvent) => {
      if (dragging) scrollToPointer(event.clientY);
    };
    const onUp = (event: PointerEvent) => {
      dragging = false;
      element.dataset.dragging = "false";
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };

    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);

    return () => {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
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
