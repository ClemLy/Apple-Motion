"use client";

import gsap from "gsap";

/**
 * One frame loop for the page's ambient chrome to share.
 *
 * The header, the progress rail and the vignette each used to run their own
 * `requestAnimationFrame` loop, three separate callbacks the browser had to
 * schedule and pay the overhead of on every frame regardless of what any of
 * them actually had to do that frame. GSAP is already driving one simple loop
 * continuously — it is what advances every tween, and what `SmoothScroll`
 * hangs Lenis off — so chrome that only needs "a callback every frame" rides
 * that one instead of starting a second.
 */
export function onTick(listener: (time: number) => void) {
  gsap.ticker.add(listener);
  return () => {
    gsap.ticker.remove(listener);
  };
}
