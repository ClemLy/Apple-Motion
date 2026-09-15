"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useI18n } from "@/lib/i18n/context";
import { useSectionScroll } from "@/lib/use-section-scroll";
import { useRecede } from "@/lib/use-room-scene";
import { useVelocityStretch } from "@/lib/use-velocity-stretch";
import { roomStyle } from "@/lib/theme";
import { playTick } from "@/lib/sound";
import { SequencePlayer } from "@/components/sequence/SequencePlayer";
import { Curtain } from "@/components/ui/Curtain";
import { CountUp } from "@/components/ui/CountUp";
import { roomOf, type Entry } from "@/lib/catalogue";
import { AuraGlow, DetailShot, FeatureWord } from "./Atmosphere";

/**
 * Scroll length of a section, in viewport heights.
 *
 * Long enough to carry three separate blocks of copy past the reader while the
 * product completes one revolution. A shorter section makes the product turn
 * for no reason, which was the problem this length exists to fix.
 */
const LENGTH = 440;

/**
 * The entrance, in section progress.
 *
 * The product does not simply appear where it belongs. It arrives from the
 * opposite edge, spinning hard, crosses the frame, and stops dead on the angle
 * the copy is written against. `SLIDE` is how long the crossing takes, `PAUSE`
 * is the held beat where the text lands, and `SPIN_IN` is how much of the
 * product's rotation is spent during the crossing — a third of a revolution in
 * a seventh of the scroll, which is what makes the arrival read as thrown
 * rather than scrolled.
 */
const SLIDE = 0.11;
const PAUSE = 0.22;
const SPIN_IN = 0.3;

/**
 * Scroll, reshaped before it reaches the sequence.
 *
 * Kept at module scope so its identity is stable: it is a dependency of the
 * scroll hook's effect, and a new function on every render would tear the
 * ScrollTrigger down and rebuild it on every keystroke of a language switch.
 */
function entryCurve(p: number) {
  if (p <= SLIDE) return (p / SLIDE) * SPIN_IN;
  if (p <= PAUSE) return SPIN_IN;
  return SPIN_IN + ((p - PAUSE) / (1 - PAUSE)) * (1 - SPIN_IN);
}

/**
 * Where each block of copy lives on the section's timeline.
 *
 * The windows do not overlap. An earlier version cross-faded them, on the
 * theory that the column should never be empty — but two dense blocks at half
 * opacity read as one broken block, not as a transition. A short gap between
 * `gone` and the next `in` is what makes each one land.
 *
 * The last window closes at exactly 1, which pins the timeline's duration to 1
 * and makes every number here read directly as section progress. Without that
 * the scrub stretches these positions across whatever the longest tween
 * happens to end at, and they stop lining up with the entrance above.
 */
const BEATS = {
  // Opens as the product lands rather than after it has settled. On a stacked
  // layout the copy sits under the product, so any gap between the two is a
  // blank lower half of the screen for as long as it lasts.
  overview: { in: 0.12, hold: 0.19, out: 0.34, gone: 0.4 },
  anatomy: { in: 0.46, hold: 0.53, out: 0.65, gone: 0.71 },
  specification: { in: 0.77, hold: 0.84, out: 0.94, gone: 1.0 },
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
  const productStage = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const railFill = useRef<HTMLSpanElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const progress = useRef(range[0]);

  useSectionScroll({
    ref: section,
    product: entry.id,
    progress,
    range,
    curve: entryCurve,
    onEnter: playTick,
  });
  useRecede(scene);
  useVelocityStretch(headline);

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
        // The three blocks are stacked on one another, so a transparent one
        // still sits on top of the visible one and swallows its hover. Each
        // takes the pointer only while it is actually on screen.
        gsap.set(node, { opacity: 0, yPercent: 8, pointerEvents: "none" });
        timeline
          .set(node, { pointerEvents: "auto" }, window.in)
          .to(node, { opacity: 1, yPercent: 0, ease: "power2.out", duration: window.hold - window.in }, window.in)
          .to(node, { opacity: 0, yPercent: -8, ease: "power2.in", duration: window.gone - window.out }, window.out)
          .set(node, { pointerEvents: "none" }, window.gone);
      };

      beat(overview.current, BEATS.overview);
      beat(anatomy.current, BEATS.anatomy);
      beat(specification.current, BEATS.specification);

      /**
       * The crossing.
       *
       * The product enters from the side opposite the one it settles on, so it
       * travels the full width of the composition on the way in. The sequence
       * is spinning through a third of a revolution over the same stretch (see
       * `entryCurve`), and the small counter-rotation and overshoot here are
       * what tie the two together: without them the frames turn but the object
       * reads as sliding on rails.
       */
      const from = entry.side === "left" ? 178 : -178;

      gsap.set(productStage.current, {
        xPercent: from,
        rotateZ: entry.side === "left" ? 7 : -7,
        scale: 0.86,
        autoAlpha: 0,
      });

      timeline
        .to(productStage.current, { autoAlpha: 1, ease: "none", duration: 0.02 }, 0)
        .to(productStage.current, { xPercent: 0, ease: "power2.out", duration: SLIDE }, 0)
        .to(productStage.current, { rotateZ: 0, ease: "power2.out", duration: SLIDE * 1.3 }, 0)
        // Lands a touch large and settles inside the held beat, so the stop has
        // weight instead of simply ceasing.
        .to(productStage.current, { scale: 1.04, ease: "power2.out", duration: SLIDE }, 0)
        .to(productStage.current, { scale: 1, ease: "power2.inOut", duration: PAUSE - SLIDE }, SLIDE);

      /**
       * The edge rail.
       *
       * A hairline fills with the section's progress while the whole rail
       * climbs against the scroll, so even in the held beats, when the product
       * and the copy are both still, the outer edge of the frame is moving.
       */
      gsap.set(railFill.current, { scaleY: 0 });
      timeline
        .to(railFill.current, { scaleY: 1, ease: "none", duration: 1 }, 0)
        .fromTo(rail.current, { yPercent: 40 }, { yPercent: -150, ease: "none", duration: 1 }, 0);

      // Pins the timeline's duration to 1 so every position above is section
      // progress, nothing more to convert.
      timeline.to({}, { duration: 1 }, 0);

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
      // Deliberately without `content-visibility: auto`: `FeatureWord` and
      // `DetailShot` below both fit themselves to their container's measured
      // height on mount, and a section skipped by content-visibility at that
      // exact instant measures as zero, leaving the word unfit and running
      // past the frame the next time it is actually looked at. The line-up
      // and the manifesto carry the class instead — plainer layouts, with
      // nothing that measures itself against a box that might not exist yet.
      className="relative"
      style={{ height: `${LENGTH}vh`, ...roomStyle(roomOf(entry)) }}
      aria-label={entry.stack.join(" ")}
    >
      {/* The room's leading edge, bowed toward the side the product enters
          from. */}
      <Curtain color={entry.bg} apex={entry.side === "left" ? 0.7 : 0.3} />

      <div className="grain sticky top-0 h-[100svh] overflow-hidden bg-room">
        {/* Everything but the ground, in one layer, so the whole scene can
            sink back as the next room rises over it. */}
        <div ref={scene} className="absolute inset-0 will-change-transform">
          {/* The ground: a drifting pool of the product's own colour, one giant
              word, and a close-up of the product rising from below. All of it
              is decorative. */}
          <AuraGlow accent={entry.accent} side={entry.side} />
          <FeatureWord word={copy.word} deep={entry.deep} side={entry.side} />
          <DetailShot product={entry.id} progress={progress} side={entry.side} />
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
          <div className="relative z-10 flex h-full flex-col px-6 pt-[74px] pb-4 md:flex-row md:items-start md:justify-center md:gap-14 md:px-10 md:pt-0 md:pb-0 lg:gap-24">
            {/* --- the product, and the annotations that point at it --- */}
            {/* Small on purpose below `md`: this same box has to leave room for
                the tallest of the three copy beats below it (the full ten-tile
                specification), and there is only one viewport's height to split
                between the two. A phone gets a smaller product and copy that
                actually fits; a tablet or up gets the full-size product because
                there the two sit side by side instead of stacked. */}
            <div
              ref={productStage}
              className={`relative h-[17svh] shrink-0 md:mt-36 md:h-[66svh] ${
                productLeft ? "md:order-1" : "md:order-2"
              }`}
            >
              <SequencePlayer
                product={entry.id}
                progress={progress}
                className="relative z-10 mx-auto h-full w-auto md:mx-0 md:max-w-[46vw]"
              />
            </div>

            {/* --- the copy column: three blocks stacked on one another --- */}
            {/* The copy occupies a fixed slot at both sizes, so the three blocks
                can replace one another in place. Left in normal flow on mobile
                they would stack down the page and all three would be on screen
                at once, which defeats the entire structure. A min-height stands
                in for the space the absolutely-positioned beats no longer claim
                themselves now that this column is a flex item and needs a real
                size to align against, not just a top offset.

                62svh below `md`, not the ~46svh this once was: the specification
                beat's ten tiles, and even the overview beat's headline plus lede
                plus three callouts, measured taller than that on a real phone in
                both languages — this box was clipping the bottom of both beats
                on any screen under about 400px tall. Sized against the tallest
                beat actually measured, the same discipline `DetailShot` already
                uses for its own placement, not against a guess. */}
            <div
              data-copy-column
              className={`relative mt-3 h-[62svh] shrink-0 md:mt-36 md:h-auto md:min-h-[54svh] md:w-full md:max-w-104 ${
                productLeft ? "md:order-2" : "md:order-1"
              }`}
            >
              {/* Beat 1 — overview */}
              <div ref={overview} data-copy-beat className="absolute inset-x-0 top-0">
                <SectionMark index={copy.index} text={copy.tagline} />

                <h2 ref={headline} className="stack mt-3 text-[clamp(2.2rem,5.4vw,4.2rem)] text-ink md:mt-6">
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

                <p className="mt-3 text-[13.5px] leading-[1.4] text-ink-2 md:mt-6 md:text-[15.5px] md:leading-[1.7]">
                  {copy.lede}
                </p>

                {/* Three tiles, the same three highlights the pointer
                    annotations give the photo, set here as small boxed facts
                    rather than a list — the column reads as a dashboard
                    rather than a page torn from a manual. */}
                <div className="mt-3 grid grid-cols-3 gap-2 md:mt-7">
                  {copy.callouts.map((callout) => (
                    <div
                      key={callout.label}
                      className="spec-tile relative flex flex-col gap-1 md:gap-1.5"
                      data-cursor="view"
                      data-cursor-label={t.cursor.view}
                    >
                      <span
                        aria-hidden="true"
                        className="spec-tile-mark absolute top-2 right-2 h-1.5 w-1.5 rounded-full"
                        style={{ background: entry.accent }}
                      />
                      <span className="tech-label text-ink-2">{callout.label}</span>
                      <span className="text-[12px] leading-snug font-medium text-ink">{callout.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Beat 2 — anatomy: one statistic, set as the section's picture */}
              <div ref={anatomy} data-copy-beat className="absolute inset-x-0 top-0">
                <SectionMark index={copy.index} text={copy.detail.title} />

                <p className="stat-figure mt-5 text-[clamp(4rem,9vw,7.4rem)] text-ink">
                  <CountUp
                    value={copy.stat.value}
                    from={BEATS.anatomy.in}
                    to={BEATS.anatomy.hold + 0.05}
                  />
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
              <div ref={specification} data-copy-beat className="absolute inset-x-0 top-0">
                <SectionMark index={copy.index} text={labels.specification} />

                {/* Ten tiles rather than ten rows: a full spec sheet is the
                    densest block of text on the page, and a grid of small
                    boxed facts breaks it into pieces the eye can take one at
                    a time instead of a column to be read top to bottom. */}
                <dl className="mt-3 grid grid-cols-2 gap-2 md:mt-6">
                  {copy.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="spec-tile relative flex flex-col gap-1"
                      data-cursor="view"
                      data-cursor-label={t.cursor.view}
                    >
                      <span
                        aria-hidden="true"
                        className="spec-tile-mark absolute top-2 right-2 h-1.5 w-1.5 rounded-full"
                        style={{ background: entry.accent }}
                      />
                      <dt className="tech-label text-ink-2">{spec.label}</dt>
                      <dd className="text-[12.5px] leading-snug font-medium tracking-[-0.01em] text-ink">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* A vertical rail naming the section, set on the outer edge, with a
                hairline that fills as the section plays. */}
            <div
              ref={rail}
              aria-hidden="true"
              className={`absolute bottom-10 hidden items-end gap-3 lg:flex ${
                productLeft ? "left-3" : "right-3 flex-row-reverse"
              }`}
            >
              <span className="relative block h-[16svh] w-px overflow-hidden bg-line">
                <span ref={railFill} className="absolute inset-0 block origin-top bg-ink" />
              </span>
              <span
                className={`tech-label text-ink-2 [writing-mode:vertical-rl] ${productLeft ? "" : "rotate-180"}`}
              >
                {labels.keepScrolling}
              </span>
            </div>
          </div>
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
