"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitch } from "./LanguageSwitch";
import { CATALOGUE } from "@/lib/catalogue";

/**
 * The mark is deliberately not Apple's logo.
 *
 * This is an independent project, so it carries its own identity: an aperture
 * ring, drawn once and reused as the loading indicator.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M16 3.2 A12.8 12.8 0 0 1 16 28.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="16" cy="16" r="4.6" fill="currentColor" />
    </svg>
  );
}

export function Nav() {
  const { t } = useI18n();
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState(-1);
  // The footer is the one dark room on the page; the header has to change key
  // with it or it sits as a pale bar across the sign-off.
  const [overDark, setOverDark] = useState(false);
  const bar = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    const anchors = CATALOGUE.map((entry) => entry.anchor);

    const measure = () => {
      frame.current = 0;

      const scrolled = window.scrollY;
      const height = document.body.scrollHeight - window.innerHeight;
      // Written straight to the node: this runs on every scroll frame, and a
      // state update per frame would re-render the header a hundred times a
      // second to move a one-pixel rule.
      if (bar.current) {
        bar.current.style.transform = `scaleX(${height > 0 ? scrolled / height : 0})`;
      }

      setCondensed(scrolled > 40);

      const middle = window.innerHeight / 2;
      let found = -1;
      anchors.forEach((anchor, index) => {
        const box = document.getElementById(anchor)?.getBoundingClientRect();
        if (box && box.top <= middle && box.bottom >= middle) found = index;
      });
      setActive((current) => (current === found ? current : found));

      const footer = document.getElementById("footer")?.getBoundingClientRect();
      const dark = !!footer && footer.top <= 72;
      setOverDark((current) => (current === dark ? current : dark));
    };

    const onScroll = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const links = [
    { href: "#iphone", label: t.nav.products },
    { href: "#neo", label: t.nav.craft },
    { href: "#footer", label: t.nav.about },
  ];

  const current = active >= 0 ? CATALOGUE[active] : null;

  return (
    <header
      data-theme-aware
      className={`fixed inset-x-0 top-0 z-50 transition-[padding,background-color,backdrop-filter,color] duration-500 ease-out ${
        condensed ? "py-3 backdrop-blur-xl" : "py-5"
      } ${
        overDark
          ? "text-white [--line:rgb(255_255_255/0.18)] [--ink-2:rgb(255_255_255/0.55)] [--ink:#ffffff]"
          : ""
      } ${condensed ? (overDark ? "bg-[rgb(11_11_13/0.55)]" : "bg-[rgb(255_255_255/0.38)]") : ""}`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-6 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-xs focus:text-white"
      >
        {t.nav.skip}
      </a>

      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-6 px-6 md:px-10">
        <a href="#top" className="flex items-center gap-2.5 text-ink" aria-label="Apple Motion">
          <Mark className="h-[22px] w-[22px]" />
          <span className="hidden text-[13px] font-semibold tracking-[-0.015em] sm:block">
            Apple Motion
          </span>
        </a>

        {/* Where you are, not just where you can go. The index reads as a page
            number, which is the honest description of what a section is here. */}
        <div className="hidden min-w-0 items-center gap-3 md:flex" aria-hidden="true">
          <span className="tech-label text-ink-2">{t.nav.index}</span>
          <span className="h-px w-6 bg-line" />
          <span className="tech-label tabular-nums text-ink">
            {current ? current.stack.join(" ") : "—"}
          </span>
          <span className="tech-label text-ink-2">
            {current ? `${String(active + 1).padStart(2, "0")}/0${CATALOGUE.length}` : ""}
          </span>
        </div>

        <nav className="hidden items-center gap-7 lg:flex" aria-label={t.nav.products}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative text-[12.5px] font-medium text-ink-2 transition-colors duration-300 hover:text-ink"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-current transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:origin-left group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <LanguageSwitch />
      </div>

      {/* Reading progress, drawn as a hairline rather than a scrollbar. */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 block h-px origin-left bg-ink transition-opacity duration-500 ${
          condensed ? "opacity-30" : "opacity-0"
        }`}
        ref={bar}
      />
    </header>
  );
}
