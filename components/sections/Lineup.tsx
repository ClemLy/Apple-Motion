"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useI18n } from "@/lib/i18n/context";
import { useRoomClaim } from "@/lib/use-room-scene";
import { roomStyle } from "@/lib/theme";
import { CATALOGUE, LINEUP_ROOM } from "@/lib/catalogue";
import { Curtain } from "@/components/ui/Curtain";
import type { ProductId } from "@/lib/products";

/**
 * The two frames each card plays on hover, chosen for what the product
 * actually does rather than shared across all five.
 *
 * A phone and a laptop have a front and a back, so the pair is the turn from
 * one to the other. The AirPods Max has neither a front nor a lid: nothing on
 * it opens, so its pair is the same gentle turn every product section itself
 * uses.
 *
 * The AirPods Pro case does have a lid, but its render turns the case open at
 * the same time as it turns it to face the camera — by design, so the section
 * above reads as one continuous gesture rather than two. There is no frame
 * where the case is both shut and square to the camera. Facing the camera is
 * what a card at rest has to do, so rest plays the open frame nearest square
 * on, and hovering turns it away to the shut case the card opened on.
 */
const LINEUP_FRAMES: Record<ProductId, { rest: string; hover: string }> = {
  iphone: { rest: "000", hover: "090" },
  "macbook-m5": { rest: "075", hover: "123" },
  "airpods-max": { rest: "054", hover: "126" },
  "macbook-neo": { rest: "011", hover: "099" },
  "airpods-pro": { rest: "106", hover: "002" },
};

/**
 * All five products, side by side, after the last one.
 *
 * Each card is a small version of the product's own room: its colour, its
 * word, its defining figure. Point at one and it lifts, and the product in it
 * turns to a second angle, so the line-up can be browsed like objects on a
 * table. Each card jumps back to that product's section.
 *
 * The cards rise into place at different speeds as the section scrolls in,
 * so the row assembles itself rather than arriving as one flat block.
 */
export function Lineup() {
  const { t } = useI18n();
  const section = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  useRoomClaim(section, LINEUP_ROOM);

  useLayoutEffect(() => {
    const element = section.current;
    const cards = grid.current;
    if (!element || !cards) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from("[data-lineup-line]", {
        yPercent: 110,
        duration: 1.1,
        stagger: 0.09,
        ease: "expo.out",
        scrollTrigger: { trigger: element, start: "top 70%", once: true },
      });

      // On a phone the cards sit in a swipeable row, and a row that scrolls
      // sideways clips anything pushed below it, so they simply sit in place.
      if (!window.matchMedia("(min-width: 640px)").matches) return;

      gsap.utils.toArray<HTMLElement>("[data-lineup-card]").forEach((card, index) => {
        gsap.fromTo(
          card,
          { y: 120 + index * 45, rotate: index % 2 ? 2.5 : -2.5 },
          {
            y: 0,
            rotate: 0,
            ease: "power2.out",
            scrollTrigger: { trigger: cards, start: "top bottom", end: "top 40%", scrub: 0.7 },
          }
        );
      });
    }, element);

    return () => ctx.revert();
  }, [t]);

  return (
    <section
      ref={section}
      id="lineup"
      className="relative"
      style={roomStyle(LINEUP_ROOM)}
      aria-labelledby="lineup-title"
    >
      <Curtain color={LINEUP_ROOM.bg} apex={0.5} />

      <div className="grain relative overflow-hidden bg-room">
        <div className="relative mx-auto max-w-[1560px] px-6 pt-28 pb-24 md:px-10 md:pt-36 md:pb-32">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold tabular-nums text-ink">{t.lineup.index}</span>
                <span className="h-px w-5 bg-line" />
                <span className="tech-label text-ink-2">{t.lineup.eyebrow}</span>
              </div>

              <h2 id="lineup-title" className="stack mt-6 text-[clamp(2.6rem,7vw,6.2rem)] text-ink">
                {t.lineup.title.map((line, i) => (
                  <span
                    key={line}
                    data-reveal-mask
                    className="block overflow-hidden pt-[0.06em] pb-[0.16em] -mt-[0.06em] -mb-[0.16em]"
                  >
                    <span data-lineup-line className={`block ${i === 1 ? "outline-type" : ""}`}>
                      {line}
                    </span>
                  </span>
                ))}
              </h2>
            </div>

            <p className="max-w-[44ch] text-[14px] leading-[1.7] text-ink-2 md:text-[15px] lg:text-right">
              {t.lineup.lede}
            </p>
          </div>

          <div
            ref={grid}
            // A snapping row you swipe through on a phone, a grid from there up:
            // five full-width cards stacked down a phone is four screens of
            // scrolling for what is meant to be a glance.
            className="-mx-6 mt-12 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-14 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 md:mt-20 lg:grid-cols-3 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden"
          >
            {CATALOGUE.map((entry) => {
              const copy = t.products[entry.id];
              const name = entry.stack.join(" ");
              const frames = LINEUP_FRAMES[entry.id];
              return (
                <a
                  key={entry.id}
                  href={`#${entry.anchor}`}
                  data-lineup-card
                  data-cursor="view"
                  data-cursor-label={t.lineup.explore}
                  className="group relative isolate flex w-[78vw] max-w-80 shrink-0 snap-start flex-col overflow-hidden rounded-[1.75rem] p-5 sm:w-auto sm:max-w-none text-[#0d0d0f] transition-[translate,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:shadow-[0_40px_80px_-40px_rgb(13_13_15/0.45)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d0d0f] md:p-6"
                  style={{ background: entry.bg }}
                >
                  {/* A pool of the product's accent that swells on hover. */}
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div
                      className="absolute top-[18%] left-1/2 aspect-square w-[90%] -translate-x-1/2 scale-75 rounded-full opacity-40 blur-2xl transition-[scale,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:opacity-70"
                      style={{ background: entry.accent }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="tech-label">{copy.index}</span>
                    <span className="tech-label" style={{ color: entry.deep }}>
                      {copy.word}
                    </span>
                  </div>

                  <div aria-hidden="true" className="relative mt-4 aspect-square w-full">
                    <Image
                      src={`/sequences/${entry.id}/${frames.rest}.webp`}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                      className="object-contain transition-[opacity,scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:opacity-0"
                    />
                    <Image
                      src={`/sequences/${entry.id}/${frames.hover}.webp`}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                      className="scale-95 object-contain opacity-0 transition-[opacity,scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:opacity-100"
                    />
                  </div>

                  <p className="mt-5 font-display text-[1.45rem] leading-[0.95] font-bold tracking-[-0.035em]">
                    {name}
                  </p>
                  <p className="mt-2 text-[12px] leading-snug text-[#4e5057]">{copy.tagline}</p>

                  <div className="mt-auto pt-7">
                    <p className="stat-figure text-[clamp(2rem,2.8vw,2.8rem)]">{copy.stat.value}</p>
                    <p className="mt-1.5 text-[12px] font-semibold tracking-[-0.01em] text-[#4e5057]">
                      {copy.stat.unit}
                    </p>
                    <p className="tech-label mt-1 text-[#4e5057]">{copy.stat.label}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[rgb(13_13_15/0.14)] pt-3">
                    <span className="text-[12px] font-medium">{t.lineup.explore}</span>
                    <svg
                      viewBox="0 0 14 14"
                      className="h-3 w-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 7h12M8.5 2.5 13 7l-4.5 4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
