"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SequencePlayer } from "@/components/sequence/SequencePlayer";
import type { ProductId } from "@/lib/products";

/**
 * What fills a product section's ground.
 *
 * A flat colour and one oversized word is a poster, not a page: nothing in it
 * moves, so a section that lasts four viewport heights has three of them where
 * the eye has nowhere to go.
 *
 * Earlier versions filled that space with fine technical decoration — dashed
 * orbit rings, a graduated scale down the edge. It was the wrong register: it
 * read as instrumentation rather than as product. The two devices here come
 * straight from print product posters instead, where the ground is filled by
 * one enormous, confident graphic and by the product itself, seen closer.
 *
 * All of it is decorative and hidden from assistive technology.
 */

/**
 * The soft, slowly orbiting pool of the product's own colour — and, behind
 * it, a second, quieter one on the far side of the room.
 *
 * One glow reads as a light source; two, drifting at different speeds and
 * never in phase, read as a room with air moving through it — the same
 * reasoning behind the hero's rays and motes, just sized for a room that
 * lasts four viewport heights instead of one. The second blob is set well
 * below the first in opacity and given a longer, offset period so the two
 * never appear to synchronise, which is what would make the pair read as one
 * mechanical loop instead of two independent things.
 */
export function AuraGlow({ accent, side }: { accent: string; side: "left" | "right" }) {
  const far = side === "left" ? "right" : "left";
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 z-0 h-[120svh] w-[120svh] -translate-y-1/2 ${
          side === "left" ? "left-[-20svh]" : "right-[-20svh]"
        }`}
      >
        <div
          className="aura-drift h-full w-full"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accent}2e 0%, ${accent}14 38%, transparent 68%)`,
            animation: "auraDrift 22s ease-in-out infinite",
          }}
        />
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-[15%] z-0 hidden h-[80svh] w-[80svh] md:block ${
          far === "left" ? "left-[-14svh]" : "right-[-14svh]"
        }`}
      >
        <div
          className="aura-drift h-full w-full"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accent}18 0%, transparent 62%)`,
            animation: "auraDrift 31s ease-in-out infinite -9s",
          }}
        />
      </div>
    </>
  );
}

/**
 * One word, set enormous and on its side, standing between the product and the
 * copy.
 *
 * Set in a deep tone of the product's own colour rather than in black, the way
 * a midnight headphone gets navy type: it has to read as part of the object's
 * world, not as a label laid over it. The product is allowed to overlap its
 * inner edge — that overlap is what puts the object in front of the graphic
 * instead of beside it.
 *
 * The word is fitted to the frame rather than left to run off it. "Son" and
 * "légèreté" cannot share one type size: set for the short word, the long one
 * loses its first and last letters to the edges of the screen, and a word with
 * letters missing reads as a layout fault rather than as a poster. So every
 * word starts from the same clamp, and one too long for the frame is scaled
 * down until it fits with room left over to move.
 *
 * Two movements, both on the scroll. It is drawn up out of nothing, in reading
 * order, while the product slides in, and wiped away the same way as the
 * section hands over. In between it drifts against the scroll like a strip of
 * film pulled past a gate, but only ever inside the frame.
 */
/** The size every feature word starts from before it is fitted. */
const WORD_SIZE = "clamp(11rem, 36svh, 26rem)";

export function FeatureWord({
  word,
  deep,
  side,
}: {
  word: string;
  deep: string;
  side: "left" | "right";
}) {
  const root = useRef<HTMLDivElement>(null);
  const reel = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = root.current;
    const moving = reel.current;
    const text = strip.current;
    const section = element?.closest("section");
    if (!element || !moving || !text || !section) return;

    gsap.registerPlugin(ScrollTrigger);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ctx: gsap.Context | undefined;
    let fittedFor = -1;
    let live = true;

    const build = (force = false) => {
      const frame = element.clientHeight;
      // Hidden below md: nothing to fit and nothing to animate.
      if (!live || frame === 0 || (!force && frame === fittedFor)) return;
      fittedFor = frame;

      ctx?.revert();
      // Measured at the full size, not at the previous fit, or every resize
      // would shrink the word a little further.
      text.style.fontSize = WORD_SIZE;

      const margin = frame * 0.04;
      const budget = frame - margin * 2;
      const minTravel = frame * 0.055;
      const fit = Math.min(1, (budget - minTravel * 2) / text.offsetHeight);
      if (fit < 1) {
        text.style.fontSize = `${parseFloat(getComputedStyle(text).fontSize) * fit}px`;
      }
      // However far it drifts, both ends stay inside the margins.
      const travel = Math.min(frame * 0.08, (budget - text.offsetHeight) / 2);

      if (still) return;

      ctx = gsap.context(() => {
        gsap.fromTo(
          moving,
          { y: travel },
          {
            y: -travel,
            ease: "none",
            scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.7 },
          }
        );

        // Timed against the section's own entrance: the reveal runs alongside
        // the product's slide, the wipe alongside the last block of copy
        // fading out.
        gsap
          .timeline({
            scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.5 },
          })
          .fromTo(
            moving,
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.13, ease: "power3.out" },
            0.01
          )
          .fromTo(
            moving,
            { clipPath: "inset(0% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 100% 0%)", duration: 0.05, ease: "power2.in", immediateRender: false },
            0.95
          )
          .to({}, { duration: 1 }, 0);
      }, element);
    };

    build(true);
    const observer = new ResizeObserver(() => build());
    observer.observe(element);
    // The display face can land after first layout, and it changes the length.
    document.fonts?.ready.then(() => build(true));

    return () => {
      live = false;
      observer.disconnect();
      ctx?.revert();
    };
  }, [word]);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={`pointer-events-none absolute top-[4.5rem] bottom-0 z-0 hidden items-center md:flex ${
        // Nudged toward the product, so the product's silhouette crosses the
        // near edge of the letters rather than stopping short of them.
        side === "left" ? "left-[37%]" : "right-[37%]"
      }`}
    >
      {/* Motion and clipping live on the wrapper, the fixed rotation on the
          type, so GSAP never has to decompose a 180 degree turn. */}
      <div ref={reel} className="will-change-transform">
        <span
          ref={strip}
          data-feature-word
          className="block font-display font-extrabold leading-[0.74] tracking-[-0.055em] whitespace-nowrap [writing-mode:vertical-rl]"
          style={{
            color: deep,
            fontSize: WORD_SIZE,
            // Reads bottom to top, the way a spine title does, and the way the
            // reference poster sets it.
            transform: "rotate(180deg)",
          }}
        >
          {word}
        </span>
      </div>
    </div>
  );
}

/**
 * The same product again, much closer, rising into the frame from below.
 *
 * A second view of one object is the oldest trick in product photography: the
 * wide shot tells you what it is, the insert tells you how it is made. It plays
 * the same frame as the main product at the same moment, so it reads as a
 * detail cut of one continuous turn rather than as a second product.
 *
 * It lives inside an explicit clipping band along the bottom of the copy side,
 * starting below where any block of copy can reach. The first version floated
 * freely in the outer margin, and in a centred layout that margin is not wide
 * enough: on a narrow product it read as a duplicate phone, on a wide one it
 * slid under the copy. Clipping to a band makes the overlap impossible rather
 * than merely unlikely, and showing only the top of an enlarged product is what
 * makes it read as a close-up.
 *
 * A shallow blur marks it as out of the focal plane — honest about it being an
 * enlargement of the same frames, and what gives the page depth rather than two
 * layers of the same picture.
 */
export function DetailShot({
  product,
  progress,
  side,
}: {
  product: ProductId;
  progress: RefObject<number>;
  side: "left" | "right";
}) {
  const root = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);

  /**
   * Keeps the band below the copy, measured rather than assumed.
   *
   * A fixed top offset only holds for the viewport it was tuned on. French runs
   * longer than English, a laptop is shorter than a desktop, and the overview
   * block — headline, paragraph and a three-row list — can reach the bottom of
   * a 720px frame on its own. So the band starts under the tallest of the three
   * blocks, and when that leaves too little ground to show anything worth
   * seeing, the close-up is simply not drawn: a sliver of blurred product under
   * the last line of text is worse than none.
   */
  useLayoutEffect(() => {
    const element = root.current;
    const stage = element?.parentElement;
    const column = stage?.querySelector<HTMLElement>("[data-copy-column]");
    if (!element || !stage || !column) return;

    const beats = Array.from(column.querySelectorAll<HTMLElement>("[data-copy-beat]"));

    const measure = () => {
      const stageBox = stage.getBoundingClientRect();
      // The column itself is never transformed; the blocks inside it are, by
      // the scroll timeline. `offsetHeight` ignores those transforms, so the
      // tallest block's resting height is what gets measured, not wherever its
      // entrance animation happens to have left it this frame.
      const columnTop = column.getBoundingClientRect().top - stageBox.top;
      const tallest = Math.max(0, ...beats.map((beat) => beat.offsetHeight));
      const clearance = 28;

      const floor = stageBox.height * 0.6;
      const top = Math.max(floor, columnTop + tallest + clearance);
      const room = stageBox.height - top;

      element.style.top = `${top}px`;
      element.style.visibility = room < stageBox.height * 0.17 ? "hidden" : "visible";
    };

    measure();

    // Beats change height with the language and with the width they wrap to;
    // the stage changes with the viewport.
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    beats.forEach((beat) => observer.observe(beat));

    return () => observer.disconnect();
  }, [product]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Rises through the band as the section plays, tipping as it comes, so
      // it is visibly being pushed up into frame rather than parked there.
      gsap.fromTo(
        lens.current,
        { yPercent: 6, rotateZ: side === "left" ? -7 : 7 },
        {
          yPercent: -16,
          rotateZ: side === "left" ? 3 : -3,
          ease: "none",
          scrollTrigger: {
            trigger: element.closest("section"),
            start: "top bottom",
            end: "bottom top",
            scrub: 0.9,
          },
        }
      );
    }, element);

    return () => ctx.revert();
  }, [side]);

  return (
    <div
      ref={root}
      aria-hidden="true"
      // Centred with flex rather than a translate, so the only transform on
      // the lens is the one the scroll writes — a CSS translate here would be
      // parsed by GSAP on first touch and applied twice.
      className={`pointer-events-none absolute bottom-0 z-0 hidden items-start justify-center overflow-hidden lg:flex ${
        side === "left" ? "right-0 left-[55%]" : "left-0 right-[55%]"
      }`}
      // Its top is set by measurement (see above), never by a fixed offset.
      style={{ top: "72%", ...feather(side) }}
    >
      <div ref={lens} className="shrink-0 will-change-transform" style={{ filter: "blur(2px)" }}>
        <SequencePlayer
          product={product}
          progress={progress}
          className="h-[118svh] w-auto"
          shadow={false}
          placeholder={false}
        />
      </div>
    </div>
  );
}

/**
 * Softens the two edges of the close-up band that face into the page.
 *
 * Clipped hard, the enlargement was cut by straight lines through the middle
 * of the frame: across the top, and down the side facing the product, where a
 * wide screen could fill the band edge to edge. Both read as a rendering fault.
 * Faded, it reads as an object rising out of the ground. The outer edges are
 * the edges of the screen and stay hard.
 */
function feather(side: "left" | "right") {
  const inner = side === "left" ? "to right" : "to left";
  const image = `linear-gradient(to bottom, transparent 0%, black 48%), linear-gradient(${inner}, transparent 0%, black 24%)`;
  return {
    WebkitMaskImage: image,
    WebkitMaskComposite: "source-in",
    maskImage: image,
    maskComposite: "intersect",
  } as const;
}
