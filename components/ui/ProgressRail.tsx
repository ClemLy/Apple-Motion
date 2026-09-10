"use client";

import { useEffect, useRef, useState } from "react";
import { CATALOGUE } from "@/lib/catalogue";

/**
 * A quiet index of where you are in the page.
 *
 * Five ticks, one per product, with the active one drawn out longer. It reads
 * as a chapter marker rather than a scrollbar — the point is orientation, not
 * a second scroll control, so it is not interactive on its own and is hidden
 * from assistive tech, where the section headings already do this job.
 */
export function ProgressRail() {
  const [active, setActive] = useState(-1);
  const raf = useRef(0);

  useEffect(() => {
    const ids = CATALOGUE.map((entry) => entry.anchor);

    const measure = () => {
      raf.current = 0;
      const middle = window.innerHeight / 2;
      let found = -1;
      ids.forEach((id, index) => {
        const box = document.getElementById(id)?.getBoundingClientRect();
        if (!box) return;
        if (box.top <= middle && box.bottom >= middle) found = index;
      });
      setActive((current) => (current === found ? current : found));
    };

    const onScroll = () => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-1/2 right-6 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 md:right-10 lg:flex"
    >
      {CATALOGUE.map((entry, index) => (
        <span
          key={entry.id}
          className="block h-px bg-ink transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: index === active ? 28 : 12,
            opacity: index === active ? 0.85 : 0.22,
          }}
        />
      ))}
    </div>
  );
}
