"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The leading edge of a room as it rises over the one before it.
 *
 * A straight seam between two colours reads as two pages glued together. Here
 * the new room arrives bowed, like a sheet of liquid pushed up from below: it
 * enters flat, swells as it climbs, and flattens again as it reaches the top,
 * so the handover lands instead of simply ending. Entering flat matters: a
 * bow already at full height the moment it appears covers the end of the
 * previous section while it is still being read. Flick the scroll and it bows
 * further, then relaxes.
 *
 * It sits in the section, above the section's own top, so it overlaps the room
 * being left rather than the room arriving. The apex is off-centre, on the side
 * the next product enters from, so the colour leads the object into frame.
 */
export function Curtain({ color, apex = 0.5 }: { color: string; apex?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);

  useLayoutEffect(() => {
    const element = root.current;
    const shape = path.current;
    const section = element?.parentElement;
    if (!element || !shape || !section) return;

    const flat = "M0 100 L100 100 Z";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shape.setAttribute("d", flat);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const state = { base: 0, kick: 0 };
    const x = apex * 100;

    const draw = () => {
      const lift = Math.min(1.3, state.base + state.kick);
      if (lift < 0.002) {
        shape.setAttribute("d", flat);
        return;
      }
      // A cubic whose control points sit above the apex. Its peak reaches three
      // quarters of the control height, hence the 133.
      const cy = 100 - lift * 133;
      shape.setAttribute(
        "d",
        `M0 100 C ${(x - 26).toFixed(2)} ${cy.toFixed(2)} ${(x + 26).toFixed(2)} ${cy.toFixed(2)} 100 100 Z`
      );
    };

    const kickTo = gsap.quickTo(state, "kick", { duration: 0.6, ease: "power3.out", onUpdate: draw });

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "top top",
      onUpdate: (self) => {
        state.base = swell(self.progress);
        kickTo(Math.min(0.3, Math.abs(self.getVelocity()) / 8000) * swell(self.progress));
        draw();
      },
      onLeave: () => {
        state.base = 0;
        kickTo(0);
        draw();
      },
      onLeaveBack: () => {
        state.base = 0;
        kickTo(0);
        draw();
      },
    });

    state.base = swell(trigger.progress);
    draw();

    return () => {
      trigger.kill();
      gsap.killTweensOf(state);
    };
  }, [apex]);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-0"
    >
      <svg
        className="absolute bottom-0 left-0 block h-[20svh] w-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path ref={path} d="M0 100 L100 100 Z" fill={color} />
      </svg>
    </div>
  );
}

/** Flat at both ends of the climb, fullest just past the middle. */
function swell(progress: number) {
  return Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, progress))), 0.85);
}
