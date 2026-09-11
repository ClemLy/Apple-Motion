"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Figure = { prefix: string; number: number; group: string; suffix: string };

/**
 * Reads "2000", "96,000" or "96 000" into a number and the way it was written.
 *
 * The grouping character is kept rather than re-derived from the locale: the
 * copy already decided how the figure reads in each language, and a counter
 * that lands on a differently punctuated number than the one it started from
 * would visibly change the text at the last frame.
 */
function parse(value: string): Figure | null {
  const match = value.match(/^(\D*?)(\d[\d,.\s  ]*\d|\d)(\D*)$/);
  if (!match) return null;
  const digits = match[2].replace(/\D/g, "");
  if (!digits) return null;
  const group = match[2].match(/\d(\D)\d{3}(?:\D|$)/)?.[1] ?? "";
  return { prefix: match[1], number: Number(digits), group, suffix: match[3] };
}

function format(figure: Figure, value: number) {
  const whole = String(Math.round(value));
  const grouped = figure.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, figure.group) : whole;
  return `${figure.prefix}${grouped}${figure.suffix}`;
}

/**
 * A figure that counts up as its block rises into view.
 *
 * Driven by the section's scroll, not by a timer: it counts as fast as the
 * visitor scrolls, and runs back down if they scroll back, so the number is
 * part of the same gesture as the product turning beside it.
 *
 * The final figure is laid out invisibly to reserve its width, and the live
 * one is right-aligned inside that space, so the unit beside it never moves
 * while the digits change. Screen readers get the final figure only.
 */
export function CountUp({ value, from, to }: { value: string; from: number; to: number }) {
  const live = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = live.current;
    const section = element?.closest("section");
    const figure = parse(value);
    if (!element || !section || !figure) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const proxy = { n: 0 };
    const render = () => {
      element.textContent = format(figure, proxy.n);
    };

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.5 },
        })
        .fromTo(
          proxy,
          { n: 0 },
          { n: figure.number, duration: to - from, ease: "power2.out", onUpdate: render },
          from
        )
        // Pins the timeline to 1, so `from` and `to` are section progress.
        .to({}, { duration: 1 }, 0);
    });
    render();

    return () => {
      ctx.revert();
      element.textContent = value;
    };
  }, [value, from, to]);

  return (
    <span className="relative inline-block">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="invisible">
        {value}
      </span>
      <span ref={live} aria-hidden="true" className="absolute inset-y-0 right-0 whitespace-nowrap">
        {value}
      </span>
    </span>
  );
}
