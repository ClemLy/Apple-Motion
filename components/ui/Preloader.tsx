"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { useI18n } from "@/lib/i18n/context";
import { getSequence } from "@/lib/sequence";
import { HERO_PRODUCT } from "@/lib/catalogue";
import { Mark } from "./Nav";

const CIRCUMFERENCE = 2 * Math.PI * 13;

/**
 * Holds the page until enough of the first sequence has arrived to scrub.
 *
 * "Enough" is deliberately not "all of it": the loader releases at the first
 * coarse pass — roughly a dozen of ninety frames — because the player draws the
 * nearest frame it already has and fills the rest in while the visitor is
 * looking at the hero. Waiting for the whole sequence would triple the wait for
 * detail nobody can see until they start scrolling.
 */
const ENOUGH = 0.14;
/** Floor on how long the loader stays, so a warm cache doesn't flash it. */
const MINIMUM_MS = 900;

export function Preloader() {
  const { t } = useI18n();
  const [done, setDone] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sequence = getSequence(HERO_PRODUCT);
    const startedAt = Date.now();

    let target = 0;
    let shown = 0;
    let raf = 0;
    let finished = false;

    const unsubscribe = sequence.onProgress(() => {
      target = Math.min(1, sequence.loaded / ENOUGH);
    });

    sequence.load().catch(() => {
      // A sequence that cannot load must not trap the visitor behind a curtain.
      target = 1;
    });

    const tick = () => {
      raf = requestAnimationFrame(tick);

      // Eased toward the real figure rather than snapped to it: on a warm cache
      // the true number goes 0 to 100 in one frame, which reads as broken.
      shown += (target - shown) * 0.07;
      if (target - shown < 0.004) shown = target;

      if (arc.current) {
        arc.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - shown));
      }
      if (readout.current) {
        readout.current.textContent = String(Math.round(shown * 100));
      }

      if (finished || shown < 0.995) return;
      finished = true;

      window.setTimeout(() => {
        cancelAnimationFrame(raf);
        setDone(true);

        const element = root.current;
        if (!element) return;

        gsap
          .timeline()
          .to(element.querySelectorAll("[data-loader-fade]"), {
            autoAlpha: 0,
            y: -10,
            duration: 0.4,
            ease: "power2.in",
          })
          // A wipe, not a fade: fading would show the hero through a grey wash.
          .to(
            element,
            {
              clipPath: "inset(0% 0% 100% 0%)",
              duration: 1.05,
              ease: "expo.inOut",
              onComplete: () => element.style.setProperty("display", "none"),
            },
            "-=0.08"
          );
      }, Math.max(0, MINIMUM_MS - (Date.now() - startedAt)));
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
    };
  }, []);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-room"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
      role="status"
      aria-live="polite"
      aria-hidden={done}
    >
      <div data-loader-fade className="relative">
        <svg viewBox="0 0 32 32" className="h-16 w-16 -rotate-90 text-ink">
          <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.12" />
          <circle
            ref={arc}
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
          />
        </svg>
        <Mark className="absolute inset-0 m-auto h-5 w-5 text-ink" />
      </div>

      <div data-loader-fade className="mt-7 flex items-baseline gap-2 tabular-nums">
        <span ref={readout} className="text-[13px] font-medium text-ink">
          0
        </span>
        <span className="label text-ink-2">{t.loader.status}</span>
      </div>

      <p data-loader-fade className="mt-2 text-[11px] tracking-[0.06em] text-ink-2 opacity-70">
        {t.loader.hint}
      </p>
    </div>
  );
}
