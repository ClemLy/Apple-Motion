"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Hands scroll position to GSAP instead of the browser.
 *
 * Two things have to be true or the whole page desynchronises: ScrollTrigger
 * must recompute on Lenis's scroll event rather than the native one, and Lenis
 * must be driven by GSAP's ticker rather than its own rAF loop — otherwise the
 * 3D transforms update on a different frame than the pinned HTML and the
 * product visibly lags behind its own caption.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.registerPlugin(ScrollTrigger);

    if (reduced) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      // A gentle exponential ease-out. Anything slower reads as latency rather
      // than smoothness, which is the usual failure of "smooth scroll" sites.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
