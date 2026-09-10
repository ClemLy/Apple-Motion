"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useI18n } from "@/lib/i18n/context";
import { useSectionScroll } from "@/lib/use-section-scroll";
import { SequencePlayer } from "@/components/sequence/SequencePlayer";
import type { Entry } from "@/lib/catalogue";

/**
 * Scroll length of a section, in viewport heights.
 *
 * Long enough to carry three separate blocks of copy past the reader while the
 * product completes one revolution. A shorter section makes the product turn
 * for no reason, which was the problem this length exists to fix.
 */
const LENGTH = 440;

/**
 * Where each block of copy lives on the section's timeline.
 *
 * The windows do not overlap. An earlier version cross-faded them, on the
 * theory that the column should never be empty — but two dense blocks at half
 * opacity read as one broken block, not as a transition. A short gap between
 * `gone` and the next `in` is what makes each one land.
 */
const BEATS = {
  overview: { in: 0.0, hold: 0.05, out: 0.26, gone: 0.32 },
  anatomy: { in: 0.37, hold: 0.43, out: 0.6, gone: 0.66 },
  specification: { in: 0.71, hold: 0.77, out: 1.06, gone: 1.12 },
} as const;

export function ProductSection({
  entry,
  range = [0, 1],
}: {
  entry: Entry;
  /** Slice of the sequence this section plays. The first one starts partway in,
   *  picking up exactly where the hero left the rotation. */
  range?: [number, number];
}) {
  const { t } = useI18n();
  const copy = t.products[entry.id];
  const labels = t.sectionLabels;

  const section = useRef<HTMLElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const overview = useRef<HTMLDivElement>(null);
  const anatomy = useRef<HTMLDivElement>(null);
  const specification = useRef<HTMLDivElement>(null);
  const progress = useRef(range[0]);

  useSectionScroll({ ref: section, product: entry.id, progress, range });

  useLayoutEffect(() => {
    const element = section.current;
    if (!element) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) {
        gsap.set([overview.current, anatomy.current, specification.current], { opacity: 1 });
        return;
      }

      const timeline = gsap.timeline({
        scrollTrigger: { trigger: element, start: "top top", end: "bottom bottom", scrub: 0.5 },
      });

      /**
       * Each block rises in, holds while the product turns, then leaves upward.
       * Positions are absolute on the timeline rather than chained, so the
       * blocks overlap by design — one is always on its way out as the next
       * arrives, and the column is never empty.
       */
      const beat = (
        node: HTMLElement | null,
        window: { in: number; hold: number; out: number; gone: number }
      ) => {
        if (!node) return;
        gsap.set(node, { opacity: 0, yPercent: 8 });
        timeline
          .to(node, { opacity: 1, yPercent: 0, ease: "power2.out", duration: window.hold - window.in }, window.in)
          .to(node, { opacity: 0, yPercent: -8, ease: "power2.in", duration: window.gone - window.out }, window.out);
      };

      beat(overview.current, BEATS.overview);
      beat(anatomy.current, BEATS.anatomy);
      beat(specification.current, BEATS.specification);

      // The oversized word drifts slower than the page. Small amount, large
      // element: enough to separate the planes, not enough to read as an effect.
      gsap.to(ghost.current, {
        yPercent: -11,
        ease: "none",
        scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: 0.8 },
      });
    }, element);

    return () => ctx.revert();
  }, [entry.id, entry.side, t]);

  const productLeft = entry.side === "left";

  return (
    <section
      ref={section}
      id={entry.anchor}
      className="relative"
      style={{ height: `${LENGTH}vh` }}
      aria-label={entry.stack.join(" ")}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* The oversized name, lighter than the wall, bleeding off the frame on
            the product's own side. Hidden from assistive tech — the same words
            are the section heading. */}
        <div
          ref={ghost}
          aria-hidden="true"
          className={`ghost-type pointer-events-none absolute top-[23svh] z-0 -translate-y-1/2 text-[clamp(3.2rem,19vw,11rem)] md:top-1/2 md:text-[clamp(4rem,13vw,12rem)] ${
            productLeft ? "left-4 text-left md:left-8" : "right-4 text-right md:right-8"
          }`}
        >
          {entry.stack.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </div>

        {/* One tree, two layouts. Stacked, it is an ordinary flow column, which
            is the only way to guarantee the blocks never overlap at an
            arbitrary viewport height. Wide, the product and the copy become a
            single flex pair, centred together in the frame — a product pinned
            to one edge and copy pinned to the other left a canyon of bare
            ground between them on anything wider than a laptop, worst on the
            narrowest products (a phone has almost no width to fill). Keeping
            them adjacent is what the reference layouts actually do: the two
            pieces read as one composition, not two unrelated islands. */}
        <div className="relative z-10 flex h-full flex-col px-6 pt-[74px] pb-6 md:flex-row md:items-start md:justify-center md:gap-14 md:px-10 md:pt-0 md:pb-0 lg:gap-24">
          {/* --- the product, and the annotations that point at it --- */}
          <div
            className={`relative h-[30svh] shrink-0 md:mt-36 md:h-[66svh] ${
              productLeft ? "md:order-1" : "md:order-2"
            }`}
          >
            <SequencePlayer
              product={entry.id}
              progress={progress}
              className="mx-auto h-full w-auto md:mx-0 md:max-w-[46vw]"
            />
          </div>

          {/* --- the copy column: three blocks stacked on one another --- */}
          {/* The copy occupies a fixed slot at both sizes, so the three blocks
              can replace one another in place. Left in normal flow on mobile
              they would stack down the page and all three would be on screen
              at once, which defeats the entire structure. A min-height stands
              in for the space the absolutely-positioned beats no longer claim
              themselves now that this column is a flex item and needs a real
              size to align against, not just a top offset. */}
          <div
            className={`relative mt-6 h-[46svh] shrink-0 md:mt-36 md:h-auto md:min-h-[54svh] md:w-full md:max-w-104 ${
              productLeft ? "md:order-2" : "md:order-1"
            }`}
          >
            {/* Beat 1 — overview */}
            <div ref={overview} className="absolute inset-x-0 top-0">
              <SectionMark index={copy.index} text={copy.tagline} />

              <h2 className="stack mt-4 text-[clamp(2.2rem,5.4vw,4.2rem)] text-ink md:mt-6">
                {entry.stack.map((line, i) => (
                  <span
                    key={line}
                    // One word per section is set as an outline. It gives the
                    // page a second typographic voice without a second family.
                    className={`block ${i === entry.stack.length - 1 ? "outline-type" : ""}`}
                  >
                    {line}
                  </span>
                ))}
              </h2>

              <p className="mt-4 text-[13.5px] leading-[1.7] text-ink-2 md:mt-6 md:text-[15.5px]">
                {copy.lede}
              </p>

              {/* A bordered spec strip, full width of the column — the same
                  three highlights the pointer annotations give the photo,
                  set here as a proper block instead of a thin list, so the
                  column reads as furnished rather than padded out. */}
              <div className="mt-6 divide-y divide-line border-y border-line md:mt-7">
                {copy.callouts.map((callout) => (
                  <div key={callout.label} className="flex items-center justify-between gap-6 py-4">
                    <span className="tech-label shrink-0 text-ink">{callout.label}</span>
                    <span className="text-right text-[12px] text-ink-2">{callout.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Beat 2 — anatomy: one statistic, set as the section's picture */}
            <div ref={anatomy} className="absolute inset-x-0 top-0">
              <SectionMark index={copy.index} text={copy.detail.title} />

              <p className="stat-figure mt-5 text-[clamp(4rem,9vw,7.4rem)] text-ink">
                {copy.stat.value}
                <span className="ml-2 align-baseline text-[0.26em] font-semibold tracking-[-0.01em] text-ink-2">
                  {copy.stat.unit}
                </span>
              </p>
              <p className="tech-label mt-3 text-ink-2">{copy.stat.label}</p>

              <p className="mt-6 text-[13px] leading-[1.7] text-ink-2 md:text-[14.5px]">
                {copy.detail.body}
              </p>
            </div>

            {/* Beat 3 — the full specification */}
            <div ref={specification} className="absolute inset-x-0 top-0">
              <SectionMark index={copy.index} text={labels.specification} />

              <dl className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2 md:mt-6">
                {copy.specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="flex items-baseline justify-between gap-4 border-b border-line py-[7px] md:py-2.5"
                  >
                    <dt className="tech-label shrink-0 text-ink-2">{spec.label}</dt>
                    <dd className="text-right text-[12.5px] font-medium tracking-[-0.01em] text-ink">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* A vertical rail naming the section, set on the outer edge. */}
          <span
            aria-hidden="true"
            className={`tech-label absolute bottom-10 hidden text-ink-2 lg:block ${
              productLeft ? "left-3 [writing-mode:vertical-rl]" : "right-3 [writing-mode:vertical-rl] rotate-180"
            }`}
          >
            {labels.keepScrolling}
          </span>
        </div>
      </div>
    </section>
  );
}

/** The small mark that opens every block: number, one hairline, one phrase. */
function SectionMark({ index, text }: { index: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold tabular-nums text-ink">{index}</span>
      <span className="h-px w-5 bg-line" />
      <span className="tech-label text-ink-2">{text}</span>
    </div>
  );
}
