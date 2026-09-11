"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useI18n } from "@/lib/i18n/context";
import { useSectionScroll } from "@/lib/use-section-scroll";
import { useRecede } from "@/lib/use-room-scene";
import { roomStyle } from "@/lib/theme";
import { onIntro } from "@/lib/intro";
import { playWhoosh } from "@/lib/sound";
import { scrambleTo } from "@/lib/scramble";
import { SequencePlayer } from "@/components/sequence/SequencePlayer";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { CATALOGUE, ENTRY_BY_ID, HERO_PRODUCT, HERO_ROOM } from "@/lib/catalogue";

/**
 * The frosted pane the opening shot is behind, before it breaks.
 *
 * Eight triangles fanning out from one point just off centre, the way a pane
 * actually cracks — not evenly, from a single impact. Each carries its own
 * direction to fly apart in, computed once from where it sits in the fan
 * rather than hand-placed, so the break reads as physics rather than a
 * decoration laid over the blast.
 */
const SHATTER_CENTER = { x: 50, y: 46 };
const SHATTER_RING: [number, number][] = [
  [0, 0],
  [50, 0],
  [100, 0],
  [100, 50],
  [100, 100],
  [50, 100],
  [0, 100],
  [0, 50],
];
const SHATTER_SHARDS = SHATTER_RING.map(([x1, y1], i) => {
  const [x2, y2] = SHATTER_RING[(i + 1) % SHATTER_RING.length];
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = midX - SHATTER_CENTER.x;
  const dy = midY - SHATTER_CENTER.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    clipPath: `polygon(${SHATTER_CENTER.x}% ${SHATTER_CENTER.y}%, ${x1}% ${y1}%, ${x2}% ${y2}%)`,
    // Flies straight out along its own wedge, each a little further than the
    // last so the ring doesn't separate as one rigid disc.
    x: (dx / length) * (46 + (i % 3) * 10),
    y: (dy / length) * (46 + (i % 3) * 10),
    rotate: (i % 2 === 0 ? 1 : -1) * (10 + i * 3),
  };
});

/**
 * The slice of the rotation the hero plays.
 *
 * Wider than it looks: the curve below spends most of it during the blast, so
 * the product arrives mid-spin and then keeps turning slowly rather than
 * freezing the moment it lands.
 */
export const HERO_RANGE: [number, number] = [0, 0.32];

/** How far into the hero the blast is over and the settle begins. */
const BLAST = 0.28;

/**
 * Scroll, front-loaded.
 *
 * A square-root curve spends sixty per cent of the rotation in the first third
 * of the scroll. That is the difference between a product that is thrown into
 * frame already turning and one that begins to rotate politely once it has
 * arrived.
 */
function heroCurve(p: number) {
  return Math.pow(p, 0.45);
}

/** Sequences allowed to stay decoded while the hero holds the stage: its own,
 *  and the section immediately below it, which is a different product. */
const HERO_RETAIN = [HERO_PRODUCT, CATALOGUE[0].id];

/**
 * Viewport heights the hero's scroll timeline spans.
 *
 * Was 500 — carrying the title split and product arrival over that much scroll
 * read as sluggish, the opposite failure from the two-viewport version this
 * replaced (where the same beats were over before they registered). 340 keeps
 * the sequence legible without asking for that much scrolling to get through it.
 */
const LENGTH = 340;

export function Hero() {
  const { t, locale } = useI18n();
  const section = useRef<HTMLElement>(null);
  const lines = useRef<HTMLSpanElement[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const railLeft = useRef<HTMLDivElement>(null);
  const railRight = useRef<HTMLDivElement>(null);
  const seam = useRef<HTMLSpanElement>(null);
  const shock = useRef<HTMLDivElement>(null);
  const aura = useRef<HTMLDivElement>(null);
  const auraLayer = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const productLayer = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const spotlight = useRef<HTMLDivElement>(null);
  const shards = useRef<(HTMLDivElement | null)[]>([]);
  const scrollHint = useRef<HTMLDivElement>(null);
  const progress = useRef(0);

  useRecede(scene);

  useSectionScroll({
    ref: section,
    product: HERO_PRODUCT,
    progress,
    range: HERO_RANGE,
    curve: heroCurve,
    retain: HERO_RETAIN,
  });

  useLayoutEffect(() => {
    const element = section.current;
    if (!element) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(stage.current, { scale: 1, autoAlpha: 1 });
        return;
      }

      // Starting state: far away, spun off-axis, and badly out of focus. The
      // distance it has to cross to reach rest is the whole effect.
      gsap.set(stage.current, {
        scale: 0.07,
        autoAlpha: 0,
        rotateZ: -24,
        // Enough to read as speed, not so much that the peak of the zoom is a
        // smudge. The blur has to be gone by the time the scale tops out, or
        // the most dramatic frame of the sequence is also the least legible.
        filter: "blur(34px)",
      });
      gsap.set([railLeft.current, railRight.current], { autoAlpha: 0 });
      gsap.set(seam.current, { scaleX: 0 });
      gsap.set(aura.current, { autoAlpha: 0, scale: 0.5 });
      gsap.set(shock.current?.querySelectorAll("[data-ring]") ?? [], { scale: 0.12, autoAlpha: 0 });
      gsap.set(shards.current, { x: 0, y: 0, rotate: 0, autoAlpha: 1 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start: "top top",
          end: "bottom bottom",
          // Low scrub: the scene stays glued to the wheel/trackpad instead of
          // trailing it. A hero that visibly lags its own scroll input reads as
          // sluggish no matter how the individual tweens are eased.
          scrub: 0.25,
        },
      });

      const count = lines.current.length;

      /**
       * The title is not moved aside. It is blown apart.
       *
       * Each line travels outward from the centre *and* grows as it goes, so
       * the block reads as coming toward the camera and parting around the
       * product rather than sliding on a flat plane. Lines further from the
       * centre move further and faster, which is what gives the split depth.
       * All of it starts on the same frame the product does, so the two read as
       * one event rather than a handover.
       */
      lines.current.forEach((line, i) => {
        const offset = i - (count - 1) / 2;

        if (Math.abs(offset) < 0.001) {
          timeline
            .to(line, { scale: 4.6, autoAlpha: 0, ease: "power3.in", duration: 0.22 }, 0.06)
            .to(line, { letterSpacing: "0.12em", ease: "none", duration: 0.22 }, 0.06)
            .to(line, { filter: "blur(12px)", ease: "power2.in", duration: 0.22 }, 0.06);
          return;
        }

        timeline
          .to(
            line,
            {
              yPercent: offset * 480,
              scale: 1 + Math.abs(offset) * 1.1,
              ease: "power2.in",
              duration: 0.26,
            },
            0.06
          )
          .to(line, { filter: "blur(14px)", ease: "power2.in", duration: 0.2 }, 0.06)
          .to(line, { autoAlpha: 0, ease: "none", duration: 0.1 }, 0.2);
      });

      timeline
        // The opening chrome goes first, so nothing competes with the blast.
        .to(chrome.current, { autoAlpha: 0, y: -20, ease: "none", duration: 0.1 }, 0)
        .to(foot.current, { autoAlpha: 0, y: 32, ease: "none", duration: 0.12 }, 0.01)

        /**
         * The blast.
         *
         * Scale runs from a speck to well past resting size on a `power4.out`,
         * which puts almost the entire distance into the first fifth of the
         * tween — the object covers the ground before the eye can follow it,
         * which is what makes it read as thrown rather than zoomed. The blur
         * clears more slowly than the scale arrives, so the product resolves
         * out of its own motion instead of snapping into focus.
         */
        .to(stage.current, { autoAlpha: 1, ease: "none", duration: 0.04 }, 0.06)
        .call(() => playWhoosh(), [], 0.058)

        /**
         * The pane breaks a beat before the blast, not with it: the shards
         * are gone by the time the product is legible, so the eye reads
         * "something broke, then it arrived" rather than the two competing
         * for the same instant.
         */
        .to(
          shards.current,
          {
            x: (i) => SHATTER_SHARDS[i].x,
            y: (i) => SHATTER_SHARDS[i].y,
            rotate: (i) => SHATTER_SHARDS[i].rotate,
            autoAlpha: 0,
            ease: "power2.in",
            duration: 0.13,
            stagger: { each: 0.006, from: "random" },
          },
          0.02
        )
        .to(stage.current, { scale: 1.34, ease: "power4.out", duration: BLAST - 0.06 }, 0.06)
        .to(stage.current, { rotateZ: 0, ease: "power3.out", duration: 0.3 }, 0.06)
        .to(stage.current, { filter: "blur(0px)", ease: "power2.out", duration: 0.19 }, 0.08)
        // The recoil. Overshoot without a settle is a zoom that missed its
        // mark; this is the half of the gesture that gives it weight.
        .to(stage.current, { scale: 1, ease: "power2.inOut", duration: 0.22 }, BLAST)

        // Shockwave. Three rings leaving the point of impact a beat apart,
        // each outrunning and outliving the one before it.
        .to(
          shock.current?.querySelectorAll("[data-ring]") ?? [],
          { autoAlpha: 0.5, ease: "none", duration: 0.03, stagger: 0.035 },
          0.07
        )
        .to(
          shock.current?.querySelectorAll("[data-ring]") ?? [],
          { scale: 3.6, autoAlpha: 0, ease: "power2.out", duration: 0.34, stagger: 0.035 },
          0.08
        )

        // The room lights up with the hit and stays lit.
        .to(aura.current, { autoAlpha: 1, scale: 1.18, ease: "power3.out", duration: 0.26 }, 0.06)
        .to(aura.current, { scale: 1, ease: "power2.inOut", duration: 0.3 }, BLAST)

        // Two rails of technical text drift past at different rates while the
        // product turns. They are the only thing on screen still moving, which
        // is what makes the rotation read as deliberate rather than idle.
        .to([railLeft.current, railRight.current], { autoAlpha: 1, ease: "none", duration: 0.1 }, 0.5)
        .to(railLeft.current, { yPercent: -26, ease: "none", duration: 0.4 }, 0.5)
        .to(railRight.current, { yPercent: 22, ease: "none", duration: 0.4 }, 0.5)
        .to([railLeft.current, railRight.current], { autoAlpha: 0, ease: "none", duration: 0.08 }, 0.9)

        // A hairline draws across the frame at the very end: the seam between
        // the opening and the first product.
        .to(seam.current, { scaleX: 1, ease: "power2.inOut", duration: 0.16 }, 0.82)

        /**
         * Depth.
         *
         * Three planes, three speeds. The title is nearest the viewer and
         * leaves fastest, the product holds the middle distance, and the glow
         * behind it barely moves. The eye reads the difference in speed as
         * distance, which is what makes a flat page feel like a room.
         */
        .to(title.current, { yPercent: -22, ease: "none", duration: 0.3 }, 0)
        .to(stage.current, { yPercent: -6, ease: "none", duration: 0.94 }, 0.06)
        .to(aura.current, { yPercent: -3, ease: "none", duration: 1 }, 0)

        /**
         * The handoff snap.
         *
         * One quick flick right as the seam draws, so the section does not
         * simply run out of scroll and stop — it puts the product down. Kept
         * inside position 1, where the longest existing tweens already end:
         * going past it would stretch the timeline's total duration and
         * rescale every position above against a longer whole.
         */
        .to(stage.current, { rotateZ: -3, ease: "power2.in", duration: 0.045 }, 0.895)
        .to(stage.current, { rotateZ: 0, scale: 1.015, ease: "power2.out", duration: 0.05 }, 0.94)
        .to(stage.current, { scale: 1, ease: "power2.inOut", duration: 0.01 }, 0.99);
    }, element);

    return () => ctx.revert();
  }, [t.hero.lines.length]);

  /**
   * The same three planes, answering the pointer.
   *
   * The nearest plane follows the cursor furthest and the glow at the back
   * moves against it, so a small movement of the hand tilts the whole scene.
   * Written to wrappers the scroll timeline never touches, so the two motions
   * add up instead of fighting over one transform.
   *
   * The product carries two more responses of its own: a slight rotation in
   * space, as though the hand moving the mouse were holding it by one corner,
   * and a spotlight that tracks the same point, so the object and its light
   * source agree about where the hand is.
   */
  useLayoutEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const planes = [
      { node: title.current, depth: 26 },
      { node: productLayer.current, depth: 14 },
      { node: auraLayer.current, depth: -22 },
    ].flatMap(({ node, depth }) =>
      node
        ? [
            {
              depth,
              x: gsap.quickTo(node, "x", { duration: 1.1, ease: "power3.out" }),
              y: gsap.quickTo(node, "y", { duration: 1.1, ease: "power3.out" }),
            },
          ]
        : []
    );

    const tilt = productLayer.current
      ? {
          x: gsap.quickTo(productLayer.current, "rotateY", { duration: 0.9, ease: "power3.out" }),
          y: gsap.quickTo(productLayer.current, "rotateX", { duration: 0.9, ease: "power3.out" }),
        }
      : null;

    const spot = spotlight.current
      ? {
          x: gsap.quickTo(spotlight.current, "x", { duration: 0.5, ease: "power3.out" }),
          y: gsap.quickTo(spotlight.current, "y", { duration: 0.5, ease: "power3.out" }),
        }
      : null;
    let spotShown = false;

    // Held still until the loader has gone: the loader draws this same title
    // in this same place, and a title already nudged by the pointer would show
    // a seam as the loader lifts off it.
    let live = false;
    const stop = onIntro(() => {
      window.setTimeout(() => (live = true), 1200);
    });

    const onMove = (event: PointerEvent) => {
      if (!live) return;
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      for (const plane of planes) {
        plane.x(nx * plane.depth * 2);
        plane.y(ny * plane.depth * 2);
      }
      // Negative on both axes: the corner under the cursor tilts *away*,
      // the way a held object's far edge lifts when the near one is pushed.
      tilt?.x(nx * -14);
      tilt?.y(ny * 10);

      if (spotlight.current && !spotShown) {
        spotShown = true;
        gsap.set(spotlight.current, { x: event.clientX, y: event.clientY });
        gsap.to(spotlight.current, { autoAlpha: 1, duration: 0.6 });
      }
      spot?.x(event.clientX);
      spot?.y(event.clientY);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  /**
   * The room breathes even when no one is scrolling.
   *
   * Only the glow: the stage itself belongs to the scroll timeline above, and
   * fighting it for the same properties would show as a stutter. The glow's
   * own layer is untouched by that timeline, so a slow, independent pulse
   * here is free — and it is the one thing that keeps the opening from ever
   * reading as a paused video rather than a room someone is standing in.
   */
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = auraLayer.current;
    if (!node) return;

    const tween = gsap.to(node, {
      scale: 1.06,
      duration: 4.2,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    return () => {
      tween.kill();
    };
  }, []);

  /**
   * A nudge, once, if the opening sits unscrolled for a while.
   *
   * Not a loop — a visitor who has already started reading does not need a
   * reminder, and one that keeps firing reads as nagging rather than as a
   * hint. It only ever plays the first time the page goes quiet.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let fired = false;
    let timer = 0;

    const nudge = () => {
      if (fired || window.scrollY > 20) return;
      fired = true;
      const node = scrollHint.current;
      if (!node) return;
      gsap
        .timeline()
        .to(node, { x: -7, duration: 0.16, ease: "power2.out" })
        .to(node, { x: 3, duration: 0.22, ease: "power2.inOut" })
        .to(node, { x: 0, duration: 0.3, ease: "elastic.out(1, 0.5)" });
    };

    const stop = onIntro(() => {
      timer = window.setTimeout(nudge, 2600);
    });
    const onScroll = () => {
      if (window.scrollY > 20) window.clearTimeout(timer);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      stop();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /**
   * The headline is shown only once the page has hydrated.
   *
   * The server renders it in English, and a visitor whose browser asks for
   * French gets it swapped a moment later. Under the loader nobody sees the
   * swap, but a re-flowing centred headline still registers as the page
   * shifting. Hidden until the language has settled, it never moves.
   */
  useEffect(() => {
    const node = title.current;
    if (!node) return;
    const frame = requestAnimationFrame(() => node.classList.remove("invisible"));
    return () => cancelAnimationFrame(frame);
  }, []);

  /**
   * The headline retranslates through noise, not a crossfade.
   *
   * Only after the first paint: on mount there is no "before" for a switch
   * to be a switch from, and the title is still invisible behind the loader
   * regardless. `useLayoutEffect` so the scramble's first frame overwrites
   * React's own update before the browser ever paints the plain new text.
   */
  const settledOnce = useRef(false);
  useLayoutEffect(() => {
    if (!settledOnce.current) {
      settledOnce.current = true;
      return;
    }
    const stops = lines.current.map((node, i) =>
      node ? scrambleTo(node, t.hero.lines[i]) : undefined
    );
    return () => stops.forEach((stop) => stop?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  /**
   * The opening chrome arrives as the loader lifts, not on mount, where it
   * would play out unseen underneath it.
   */
  useLayoutEffect(() => {
    const element = section.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const parts = element.querySelectorAll<HTMLElement>("[data-intro]");
    // Only a visitor arriving at the top sees the opening. Anyone restored
    // mid-page by the browser gets the chrome already in place.
    if (window.scrollY > 40) return;

    gsap.set(parts, { y: 26, opacity: 0 });
    const reveal = () =>
      gsap.to(parts, {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.08,
        delay: 0.35,
        overwrite: "auto",
      });

    const stop = onIntro(reveal);
    // Never leave the page without its chrome, whatever happened to the loader.
    const failsafe = window.setTimeout(reveal, 14000);

    return () => {
      stop();
      window.clearTimeout(failsafe);
    };
  }, []);

  const rail = t.hero.pillars;
  const heroAccent = ENTRY_BY_ID[HERO_PRODUCT].accent;

  return (
    <section
      ref={section}
      id="top"
      className="relative"
      style={{ height: `${LENGTH}vh`, ...roomStyle(HERO_ROOM) }}
    >
      <div className="grain sticky top-0 h-[100svh] overflow-hidden bg-room">
        <div
          ref={scene}
          className="absolute inset-0 flex items-center justify-center will-change-transform"
        >
          {/* The room lights up on impact. Sits behind everything, in the hero
              product's own colour, so the opening belongs to the AirPods Max
              rather than to a generic page. */}
          <div
            ref={aura}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 grid place-items-center"
          >
            <div
              ref={auraLayer}
              className="h-[120svh] w-[120svh]"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${heroAccent}3d 0%, ${heroAccent}1a 40%, transparent 70%)`,
              }}
            />
          </div>

          {/* Shockwave. Behind the product, so the object itself stays crisp
              while the rings it displaced run out past the frame. */}
          <div
            ref={shock}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[5] grid place-items-center"
          >
            {[0, 1, 2].map((ring) => (
              <span
                key={ring}
                data-ring
                className="col-start-1 row-start-1 block h-[44svh] w-[44svh] rounded-full border"
                style={{ borderColor: `${heroAccent}66` }}
              />
            ))}
          </div>
          {/* The headline sits above the product, so the product is revealed by
              the title moving away rather than fading up in front of it. */}
          <h1
            ref={title}
            className="pointer-events-none invisible absolute z-20 px-6 text-center"
            aria-label={t.hero.lines.join(" ")}
          >
            {t.hero.lines.map((line, i) => (
              <span
                key={line}
                ref={(node) => {
                  if (node) lines.current[i] = node;
                }}
                aria-hidden="true"
                // The middle line is set as an outline. One word in a different
                // typographic voice is enough to stop a stacked block reading as
                // a single flat slab of weight.
                className={`stack block text-[clamp(3rem,11.5vw,10.5rem)] will-change-transform ${
                  i === 1 ? "outline-type" : "text-ink"
                }`}
              >
                {line}
              </span>
            ))}
          </h1>

          <div
            ref={stage}
            className="absolute inset-0 z-10 grid place-items-center will-change-transform"
            style={{ perspective: "1400px" }}
          >
            <div
              ref={productLayer}
              className="relative grid place-items-center will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
            >
              <SequencePlayer
                product={HERO_PRODUCT}
                progress={progress}
                className="h-[64svh] max-w-[86vw]"
              />
              {/* A bar of light on a slow loop, so the surface reads as
                  something reflective standing in a room rather than a flat
                  picture of one. */}
              <div
                aria-hidden="true"
                className="hero-sweep pointer-events-none absolute top-1/2 left-1/2 h-[46svh] w-[46svh] -translate-x-1/2 -translate-y-1/2 rounded-full"
              />
            </div>

            {/* The frosted pane the opening is seen through, until the blast
                breaks it apart in the first instant of scroll. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
              {SHATTER_SHARDS.map((shard, i) => (
                <div
                  key={i}
                  ref={(node) => {
                    shards.current[i] = node;
                  }}
                  className="absolute inset-0 border border-white/25 bg-white/[0.07] backdrop-blur-[2px] will-change-transform"
                  style={{ clipPath: shard.clipPath }}
                />
              ))}
            </div>
          </div>

          {/* A soft light that follows the pointer, so the room feels lit by
              the visitor rather than by a fixed rig. Screen-space, not part of
              any plane above — it has to sit still relative to the cursor, not
              drift with the parallax it is casting. */}
          <div
            ref={spotlight}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-[6] h-[46svh] w-[46svh] opacity-0 mix-blend-soft-light"
            style={{
              // Margin centres the box on its own (0,0) origin instead of a
              // Tailwind translate utility, which GSAP's own x/y transform
              // would otherwise overwrite outright — inline style always
              // wins over a class, and GSAP writes `transform` directly.
              margin: "-23svh 0 0 -23svh",
              background: "radial-gradient(circle, rgb(255 255 255 / 0.9) 0%, transparent 68%)",
            }}
          />

          {/* Counter-drifting rails of technical text. */}
          <div
            aria-hidden="true"
            ref={railLeft}
            className="pointer-events-none absolute top-1/2 left-6 z-20 hidden -translate-y-1/2 flex-col gap-6 md:left-10 lg:flex"
          >
            {rail.map((entry) => (
              <span key={entry} className="tech-label block max-w-[12ch] text-ink-2">
                {entry}
              </span>
            ))}
          </div>
          <div
            aria-hidden="true"
            ref={railRight}
            className="pointer-events-none absolute top-1/2 right-6 z-20 hidden -translate-y-1/2 flex-col items-end gap-6 text-right md:right-10 lg:flex"
          >
            {[...rail].reverse().map((entry) => (
              <span key={entry} className="tech-label block max-w-[12ch] text-ink-2">
                {entry}
              </span>
            ))}
          </div>

          <span
            ref={seam}
            aria-hidden="true"
            className="absolute bottom-[14svh] left-0 z-20 block h-px w-full origin-left bg-ink/25"
          />

          <div className="pointer-events-none absolute inset-0 z-30">
            <div className="mx-auto flex h-full max-w-[1560px] flex-col justify-between px-6 pt-28 pb-8 md:px-10 md:pb-12">
              <div ref={chrome} className="flex items-center gap-3">
                <span data-intro className="h-px w-8 bg-line" />
                <span data-intro className="tech-label text-ink-2">
                  {t.hero.eyebrow}
                </span>
              </div>

              <div
                ref={foot}
                className="pointer-events-auto flex flex-col gap-8 md:flex-row md:items-end md:justify-between"
              >
                <p data-intro className="max-w-[42ch] text-[14px] leading-[1.65] text-ink-2 md:text-[15px]">
                  {t.hero.lede}
                </p>

                <div data-intro className="flex items-center gap-8">
                  <MagneticButton
                    className="pill"
                    onClick={() =>
                      document.getElementById("iphone")?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    {t.hero.cta}
                    <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden="true">
                      <path
                        d="M7 1v12M2.5 8.5 7 13l4.5-4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </MagneticButton>

                  <div ref={scrollHint} className="hidden items-center gap-3 sm:flex">
                    <span className="tech-label text-ink-2">{t.hero.scroll}</span>
                    <span className="relative block h-12 w-px overflow-hidden bg-line">
                      <span className="absolute inset-0 animate-[scrollHint_2.6s_cubic-bezier(0.65,0,0.35,1)_infinite] bg-ink/50" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
