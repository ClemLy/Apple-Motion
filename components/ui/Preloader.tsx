"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { useI18n } from "@/lib/i18n/context";
import { getSequence } from "@/lib/sequence";
import { releaseIntro } from "@/lib/intro";
import { roomStyle, type Room } from "@/lib/theme";
import { HERO_PRODUCT, HERO_ROOM } from "@/lib/catalogue";
import { Mark } from "./Nav";

const CIRCUMFERENCE = 2 * Math.PI * 13;

/**
 * Holds the page until enough of the first sequence has arrived to scrub.
 *
 * "Enough" is deliberately not "all of it": the loader releases at the first
 * coarse pass, because the player draws the nearest frame it already has and
 * fills the rest in while the visitor is looking at the hero. Waiting for the
 * whole sequence would triple the wait for detail nobody can see until they
 * start scrolling.
 */
const ENOUGH = 0.14;
/** Floor on how long the loader stays, so a warm cache doesn't flash it. */
const MINIMUM_MS = 700;
/** Points along the lifting edge. Enough for the curve to read as smooth. */
const EDGE_POINTS = 24;

/**
 * The loader is the night before the hero's day.
 *
 * A room in the hero's own colours would make the lift invisible: the same
 * title on the same ground, uncovering itself. Dark, the bowed edge is seen
 * sweeping up the screen, and the headline turns from light to dark exactly
 * where it crosses, without moving.
 */
const LOADER_ROOM: Room = { bg: "#0d0d0f", ghost: "#1a1a1e", accent: HERO_ROOM.accent, dark: true };

/**
 * The loader's outline as a polygon whose lower edge is a curve.
 *
 * `edge` is where the sides of the lower edge sit, as a percentage down the
 * screen; `bow` is how much higher the middle rides than the sides. Built as
 * a polygon rather than a path so the browser can clip with it directly and
 * GSAP never has to interpolate a string.
 */
function lifted(edge: number, bow: number) {
  const points = ["0% 0%", "100% 0%"];
  for (let i = EDGE_POINTS; i >= 0; i -= 1) {
    const u = i / EDGE_POINTS;
    const y = edge - bow * Math.sin(Math.PI * u);
    points.push(`${(u * 100).toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${points.join(", ")})`;
}

/**
 * The opening title, filling with ink as the page loads.
 *
 * It is the hero's own headline, set at exactly the hero's size and position,
 * first as a faint ghost and then filled from the bottom up in proportion to
 * what has arrived. When the loader lifts, the title underneath is the same
 * title in the same place, only in the day's colours, so the page does not so
 * much appear as change its light.
 */
export function Preloader() {
  const { t } = useI18n();
  const [done, setDone] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const titles = useRef<HTMLDivElement>(null);

  /**
   * The title waits for its typeface.
   *
   * Drawn in the fallback face first, it re-flows when the display face lands,
   * and a headline that jumps sideways in the first half second is the one
   * thing a loading screen must not do. Hidden, not merely transparent, so the
   * swap is never measured as the page shifting.
   */
  useEffect(() => {
    const node = titles.current;
    if (!node) return;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      gsap.to(node, { autoAlpha: 1, duration: 0.6, ease: "power2.out" });
    };
    document.fonts?.ready.then(show);
    const fallback = window.setTimeout(show, 1500);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    const sequence = getSequence(HERO_PRODUCT);
    const startedAt = Date.now();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

      // Eased toward the real figure, and never faster than the minimum stay
      // allows: on a warm cache the true number goes 0 to 100 in one frame.
      const floor = Math.min(1, (Date.now() - startedAt) / MINIMUM_MS);
      const goal = Math.min(target, floor);
      // A floor on the step, so the last few per cent do not crawl.
      shown = Math.min(goal, shown + Math.max((goal - shown) * 0.08, 0.006));

      if (arc.current) {
        arc.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - shown));
      }
      if (readout.current) {
        readout.current.textContent = String(Math.round(shown * 100)).padStart(3, "0");
      }
      if (fill.current) {
        fill.current.style.clipPath = `inset(${((1 - shown) * 100).toFixed(2)}% 0% 0% 0%)`;
      }

      if (finished || shown < 0.998) return;
      finished = true;
      cancelAnimationFrame(raf);

      const element = root.current;
      const exit = () => {
        setDone(true);
        releaseIntro();
        if (element) element.style.display = "none";
      };
      if (!element) return exit();

      if (still) {
        gsap.to(element, { autoAlpha: 0, duration: 0.4, onComplete: exit });
        return;
      }

      const edge = { edge: 100, bow: 0 };
      gsap
        .timeline({ onComplete: exit })
        .to(element.querySelectorAll("[data-loader-fade]"), {
          autoAlpha: 0,
          y: 14,
          duration: 0.32,
          ease: "power2.in",
          stagger: 0.03,
        })
        // The lift. The middle leaves first and the sides follow, so the
        // edge bows upward and flattens again as it clears the top.
        .to(
          edge,
          {
            keyframes: [
              { edge: 62, bow: 16, duration: 0.32, ease: "power2.in" },
              { edge: -18, bow: 0, duration: 0.46, ease: "power3.out" },
            ],
            onUpdate: () => {
              element.style.clipPath = lifted(edge.edge, edge.bow);
            },
          },
          "-=0.08"
        )
        // The hero's chrome starts arriving while the edge is still passing.
        .call(releaseIntro, [], "-=0.55");
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
    };
  }, []);

  const lines = t.hero.lines;

  const title = (ghost: boolean) => (
    <div
      ref={ghost ? undefined : fill}
      className="px-6 text-center"
      // Clipped against the title block itself, not the screen, so the ink
      // starts climbing the letters from the first per cent.
      style={ghost ? undefined : { clipPath: "inset(100% 0% 0% 0%)" }}
    >
      {lines.map((line, i) => (
        <span
          key={line}
          className={`stack block text-[clamp(3rem,11.5vw,10.5rem)] ${
            i === 1 ? "outline-type" : ghost ? "text-ink/[0.09]" : "text-ink"
          } ${ghost && i === 1 ? "opacity-25" : ""}`}
        >
          {line}
        </span>
      ))}
    </div>
  );

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[100] bg-room"
      style={{ ...roomStyle(LOADER_ROOM), clipPath: lifted(100, 0) }}
      data-dark-room
      role="status"
      aria-live="polite"
      aria-hidden={done}
    >
      <span className="sr-only">{t.loader.status}</span>

      {/* The title: a faint ghost, and the same title in ink, revealed from the
          bottom as the page loads. */}
      <div ref={titles} aria-hidden="true" className="invisible absolute inset-0 opacity-0">
        <div className="absolute inset-0 flex items-center justify-center">{title(true)}</div>
        <div className="absolute inset-0 flex items-center justify-center">{title(false)}</div>
      </div>

      {/* The same brand mark, in the same place, as the header it covers. */}
      <div className="absolute inset-x-0 top-0">
        <div className="mx-auto flex max-w-[1560px] items-center gap-2.5 px-6 py-5 text-ink md:px-10">
          <Mark className="h-[22px] w-[22px]" />
          <span className="hidden text-[13px] font-semibold tracking-[-0.015em] sm:block">
            Apple Motion
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-[1560px] items-end justify-between gap-6 px-6 pb-8 md:px-10 md:pb-12">
          <div data-loader-fade className="flex items-baseline gap-2">
            <span
              ref={readout}
              aria-hidden="true"
              className="stat-figure text-[clamp(3.2rem,8vw,6.5rem)] text-ink"
            >
              000
            </span>
            <span className="text-[clamp(1rem,2vw,1.5rem)] font-semibold text-ink-2">%</span>
          </div>

          <div data-loader-fade className="flex items-center gap-4 text-right">
            <div className="hidden sm:block">
              <p className="tech-label text-ink">{t.loader.status}</p>
              <p className="mt-1.5 text-[11px] tracking-[0.04em] text-ink-2">{t.loader.hint}</p>
            </div>
            <svg viewBox="0 0 32 32" className="h-11 w-11 -rotate-90 text-ink" aria-hidden="true">
              <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.14" />
              <circle
                ref={arc}
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
