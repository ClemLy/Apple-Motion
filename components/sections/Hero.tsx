"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useI18n } from "@/lib/i18n/context";
import { useSectionScroll } from "@/lib/use-section-scroll";
import { SequencePlayer } from "@/components/sequence/SequencePlayer";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { HERO_PRODUCT } from "@/lib/catalogue";

/** The slice of the iPhone rotation the hero plays before handing over. */
export const HERO_RANGE: [number, number] = [0, 0.16];

/**
 * Five viewport heights.
 *
 * The previous hero ran its whole idea inside two, which meant the title split
 * and the product arrived almost in the same gesture — the move was over before
 * it registered. Length is the material this kind of sequence is made of.
 */
const LENGTH = 500;

export function Hero() {
  const { t } = useI18n();
  const section = useRef<HTMLElement>(null);
  const lines = useRef<HTMLSpanElement[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const railLeft = useRef<HTMLDivElement>(null);
  const railRight = useRef<HTMLDivElement>(null);
  const seam = useRef<HTMLSpanElement>(null);
  const progress = useRef(0);

  useSectionScroll({ ref: section, product: HERO_PRODUCT, progress, range: HERO_RANGE });

  useLayoutEffect(() => {
    const element = section.current;
    if (!element) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(stage.current, { scale: 1, autoAlpha: 1 });
        return;
      }

      gsap.set(stage.current, { scale: 0.34, autoAlpha: 0 });
      gsap.set([railLeft.current, railRight.current], { autoAlpha: 0 });
      gsap.set(seam.current, { scaleX: 0 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
        },
      });

      const count = lines.current.length;

      /**
       * The title does not simply move aside — it passes the reader.
       *
       * Each line travels outward from the centre *and* grows as it goes, so
       * the block reads as coming toward the camera and parting around it
       * rather than sliding on a flat plane. Lines further from the centre move
       * further and faster, which is what gives the split its depth.
       */
      lines.current.forEach((line, i) => {
        const offset = i - (count - 1) / 2;

        if (Math.abs(offset) < 0.001) {
          timeline
            .to(line, { scale: 2.6, autoAlpha: 0, ease: "power2.in", duration: 0.3 }, 0.1)
            .to(line, { letterSpacing: "0.06em", ease: "none", duration: 0.3 }, 0.1);
          return;
        }

        timeline
          .to(
            line,
            {
              yPercent: offset * 300,
              scale: 1 + Math.abs(offset) * 0.55,
              ease: "power1.in",
              duration: 0.34,
            },
            0.08
          )
          .to(line, { autoAlpha: 0, ease: "none", duration: 0.14 }, 0.24);
      });

      timeline
        // The opening chrome goes first, so nothing competes with the split.
        .to(chrome.current, { autoAlpha: 0, y: -20, ease: "none", duration: 0.14 }, 0)
        .to(foot.current, { autoAlpha: 0, y: 32, ease: "none", duration: 0.16 }, 0.02)

        // The product comes up through the gap the title just opened.
        .to(stage.current, { autoAlpha: 1, ease: "none", duration: 0.14 }, 0.14)
        .to(stage.current, { scale: 1, ease: "power2.out", duration: 0.38 }, 0.12)

        // Two rails of technical text drift past at different rates while the
        // product turns. They are the only thing on screen still moving, which
        // is what makes the rotation read as deliberate rather than idle.
        .to([railLeft.current, railRight.current], { autoAlpha: 1, ease: "none", duration: 0.1 }, 0.4)
        .to(railLeft.current, { yPercent: -26, ease: "none", duration: 0.5 }, 0.4)
        .to(railRight.current, { yPercent: 22, ease: "none", duration: 0.5 }, 0.4)
        .to([railLeft.current, railRight.current], { autoAlpha: 0, ease: "none", duration: 0.08 }, 0.88)

        // A hairline draws across the frame at the very end: the seam between
        // the opening and the first product.
        .to(seam.current, { scaleX: 1, ease: "power2.inOut", duration: 0.16 }, 0.8);
    }, element);

    return () => ctx.revert();
  }, [t.hero.lines.length]);

  const rail = t.hero.pillars;

  return (
    <section ref={section} id="top" className="relative" style={{ height: `${LENGTH}vh` }}>
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        {/* The headline sits above the product, so the product is revealed by
            the title moving away rather than fading up in front of it. */}
        <h1
          className="pointer-events-none absolute z-20 px-6 text-center"
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
        >
          <SequencePlayer
            product={HERO_PRODUCT}
            progress={progress}
            className="h-[64svh] max-w-[86vw]"
          />
        </div>

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
              <span className="h-px w-8 bg-line" />
              <span className="tech-label text-ink-2">{t.hero.eyebrow}</span>
            </div>

            <div
              ref={foot}
              className="pointer-events-auto flex flex-col gap-8 md:flex-row md:items-end md:justify-between"
            >
              <p className="max-w-[42ch] text-[14px] leading-[1.65] text-ink-2 md:text-[15px]">
                {t.hero.lede}
              </p>

              <div className="flex items-center gap-8">
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

                <div className="hidden items-center gap-3 sm:flex">
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
    </section>
  );
}
