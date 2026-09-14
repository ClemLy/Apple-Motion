"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { onTick } from "./ticker";
import { getScrollVelocity } from "./velocity";

/**
 * Lets a headline answer the speed of the scroll, not just its position.
 *
 * A few per cent of horizontal stretch, eased toward the reading rather than
 * snapped to it, so a fast flick widens the letters and a settle narrows them
 * back — the same physical logic as the header's `--scroll-kick`, applied to
 * type instead of glass. Kept to `scaleX` alone: a real variable-font weight
 * axis would be the more literal version of "the type gets physical," but
 * this family is loaded at fixed static weights, and `scaleX` reads as the
 * same idea — mass responding to motion — without gambling on a font
 * instance nothing here actually ships.
 *
 * Paused whenever the element is off screen, on the same IntersectionObserver
 * pattern the hero's own idle loops use: no reason to keep reading scroll
 * velocity for type nobody can see.
 */
export function useVelocityStretch(ref: RefObject<HTMLElement | null>, amount = 0.045) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const setScale = gsap.quickTo(element, "scaleX", { duration: 0.35, ease: "power2.out" });

    let visible = true;
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(element);

    const stop = onTick(() => {
      if (!visible) return;
      const speed = Math.min(1, Math.abs(getScrollVelocity()) / 26);
      setScale(1 + speed * amount);
    });

    return () => {
      stop();
      observer.disconnect();
      gsap.set(element, { scaleX: 1 });
    };
  }, [ref, amount]);
}
