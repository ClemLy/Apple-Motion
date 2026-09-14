"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";

import { I18nProvider, useI18n } from "@/lib/i18n/context";
import { roomStyle } from "@/lib/theme";
import { OFF_TOUR_ROOM } from "@/lib/catalogue";
import { Mark } from "@/components/ui/Nav";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";

/**
 * The same off-tour room as the 404, one register darker.
 *
 * A 404 is the visitor's own wrong turn; this is the page's fault, so the
 * tone shifts from "not here" to "not now" — no ghost word implying
 * something to find, just the offer to pick the thread back up.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Kept for whoever is watching the console during development or a real
    // incident; nothing here is shown to the visitor.
    console.error(error);
  }, [error]);

  return (
    <I18nProvider>
      <ErrorRoom onRetry={reset} />
    </I18nProvider>
  );
}

function ErrorRoom({ onRetry }: { onRetry: () => void }) {
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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 grid place-items-center">
        <div
          className="aura-drift h-[110svh] w-[110svh]"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${OFF_TOUR_ROOM.accent}20 0%, transparent 68%)`,
            animation: "auraDrift 24s ease-in-out infinite",
          }}
        />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-[1560px] items-center justify-between px-6 py-5 md:px-10">
        <Link data-in href="/" tabIndex={0} className="flex shrink-0 items-center gap-2.5 text-ink" aria-label="Apple Motion">
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
          {t.errorPage.eyebrow}
        </span>

        <div className="relative mt-6 grid place-items-center">
          <span
            aria-hidden="true"
            className="ghost-type pointer-events-none absolute text-[clamp(6rem,30vw,24rem)] whitespace-nowrap select-none"
          >
            {t.errorPage.word}
          </span>
          <p data-in className="outline-type relative text-[clamp(3.2rem,13vw,9rem)] leading-none" aria-hidden="true">
            {t.errorPage.title.join(" ")}
          </p>
        </div>

        <p data-in className="mt-8 max-w-[46ch] text-[14px] leading-[1.7] text-ink-2 md:text-[15px]">
          {t.errorPage.body}
        </p>

        <div data-in className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={onRetry} className="pill">
            {t.errorPage.retry}
            <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden="true">
              <path
                d="M12 7A5 5 0 1 1 10.3 3.3M12 2v4h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <Link
            href="/"
            tabIndex={0}
            className="tech-label rounded-full border border-line px-5 py-3 text-ink-2 transition-colors duration-300 hover:text-ink"
          >
            {t.errorPage.cta}
          </Link>
        </div>
      </main>

      <div
        aria-hidden="true"
        className="relative z-10 mx-auto hidden w-full max-w-[1560px] px-6 pb-8 md:block md:px-10"
      >
        <span className="tech-label text-ink-2">HTTP 500 · RUNTIME_ERROR</span>
      </div>
    </div>
  );
}
