"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

import { I18nProvider, useI18n } from "@/lib/i18n/context";
import { roomStyle } from "@/lib/theme";
import { OFF_TOUR_ROOM } from "@/lib/catalogue";
import { Mark } from "@/components/ui/Nav";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";

/**
 * The one room on the site that belongs to no product.
 *
 * Everywhere else, the giant outlined word and the oversized ghost type are
 * used to say what a room is for. Here they say what it is missing: the
 * numeral itself is the only thing on the page set at that scale, so the
 * page still reads as part of the tour — an empty room built from the same
 * materials as every other one — rather than a plain error screen bolted on
 * after the fact.
 */
export default function NotFound() {
  return (
    <I18nProvider>
      <NotFoundRoom />
    </I18nProvider>
  );
}

function NotFoundRoom() {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const parts = element.querySelectorAll<HTMLElement>("[data-in]");
    gsap.set(parts, { y: 22, opacity: 0 });
    gsap.to(parts, {
      y: 0,
      opacity: 1,
      duration: 1,
      ease: "expo.out",
      stagger: 0.07,
      delay: 0.1,
    });
  }, []);

  return (
    <div
      ref={root}
      data-dark-room
      className="grain relative flex min-h-svh flex-col overflow-hidden bg-room text-ink"
      style={roomStyle(OFF_TOUR_ROOM)}
    >
      {/* The room's only light — no product to colour it, so it drifts in a
          single neutral blue rather than the accent any real section would
          carry. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 grid place-items-center">
        <div
          className="aura-drift h-[110svh] w-[110svh]"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${OFF_TOUR_ROOM.accent}26 0%, transparent 68%)`,
            animation: "auraDrift 24s ease-in-out infinite",
          }}
        />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-[1560px] items-center justify-between px-6 py-5 md:px-10">
        <Link
          data-in
          href="/"
          tabIndex={0}
          className="flex shrink-0 items-center gap-2.5 text-ink"
          aria-label="Apple Motion"
        >
          <Mark className="h-[22px] w-[22px]" />
          <span className="hidden text-[13px] font-semibold tracking-[-0.015em] sm:block">
            Apple Motion
          </span>
        </Link>
        <div data-in>
          <LanguageSwitch />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[1560px] flex-1 flex-col items-center justify-center px-6 py-16 text-center md:px-10">
        <span data-in className="tech-label text-ink-2">
          {t.notFound.eyebrow}
        </span>

        <div className="relative mt-6 grid place-items-center">
          <span
            aria-hidden="true"
            className="ghost-type pointer-events-none absolute text-[clamp(6rem,30vw,24rem)] whitespace-nowrap select-none"
          >
            {t.notFound.word}
          </span>
          <p
            data-in
            className="outline-type relative text-[clamp(6.5rem,26vw,19rem)] leading-none"
            aria-hidden="true"
          >
            404
          </p>
        </div>

        <h1 data-in className="stack mt-8 text-[clamp(2rem,5.6vw,3.6rem)] text-ink">
          {t.notFound.title.join(" ")}
        </h1>

        <p data-in className="mt-6 max-w-[46ch] text-[14px] leading-[1.7] text-ink-2 md:text-[15px]">
          {t.notFound.body}
        </p>

        <div data-in className="mt-10">
          <Link href="/" tabIndex={0} className="pill">
            {t.notFound.cta}
            <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden="true">
              <path
                d="M2 7h10M7.5 2.5 12 7l-4.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </main>

      {/* A technical footnote, the same register as the hero's side rails —
          the one place on the page that still says something precise while
          everything else says "nothing here." */}
      <div
        aria-hidden="true"
        className="relative z-10 mx-auto hidden w-full max-w-[1560px] px-6 pb-8 md:block md:px-10"
      >
        <span className="tech-label text-ink-2">HTTP 404 · NOT_IN_CATALOGUE</span>
      </div>
    </div>
  );
}
