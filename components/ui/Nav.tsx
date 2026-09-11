"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitch } from "./LanguageSwitch";
import { CATALOGUE } from "@/lib/catalogue";
import { openPalette } from "@/lib/palette";
import { isMuted, onMuteChange, toggleSound } from "@/lib/sound";

/**
 * The mark is deliberately not Apple's logo.
 *
 * This is an independent project, so it carries its own identity: a lens
 * dial, drawn once and reused as the loading indicator. The ring turns
 * slowly and continuously — an idling camera rather than a static badge —
 * while the centre stop stays put, so the turning reads against something.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g className="mark-ring" style={{ transformOrigin: "16px 16px" }}>
        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M16 3.2 A12.8 12.8 0 0 1 16 28.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.35"
        />
      </g>
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
  const muted = useSyncExternalStore(onMuteChange, isMuted, () => true);
  const header = useRef<HTMLElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const frame = useRef(0);
  // Preview images are only requested once the visitor reaches for the nav,
  // not with the page.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const anchors = CATALOGUE.map((entry) => entry.anchor);
    let lastY = window.scrollY;
    let velocity = 0;

    const measure = () => {
      frame.current = 0;

      const scrolled = window.scrollY;
      velocity += (scrolled - lastY - velocity) * 0.25;
      lastY = scrolled;

      const height = document.body.scrollHeight - window.innerHeight;
      // Written straight to the node: this runs on every scroll frame, and a
      // state update per frame would re-render the header a hundred times a
      // second to move a one-pixel rule.
      if (bar.current) {
        bar.current.style.transform = `scaleX(${height > 0 ? scrolled / height : 0})`;
      }

      // A fast flick blurs the glass a little further and saturates the tint
      // under it, so the header answers the gesture instead of only the
      // position. Settles back the moment the scroll does.
      if (header.current) {
        const speed = Math.min(1, Math.abs(velocity) / 44);
        header.current.style.setProperty("--scroll-kick", speed.toFixed(3));
      }

      setCondensed(scrolled > 40);

      const middle = window.innerHeight / 2;
      let found = -1;
      anchors.forEach((anchor, index) => {
        const box = document.getElementById(anchor)?.getBoundingClientRect();
        if (box && box.top <= middle && box.bottom >= middle) found = index;
      });
      setActive((current) => (current === found ? current : found));

      // Any dark room the header is currently passing over.
      const line = 36;
      const dark = Array.from(
        document.querySelectorAll<HTMLElement>("main [data-dark-room]")
      ).some((room) => {
        const box = room.getBoundingClientRect();
        return box.top <= line && box.bottom >= line;
      });
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

  /**
   * The active pill, poured rather than snapped into place.
   *
   * It reads the active item's own box and moves to sit exactly behind it,
   * so the same code serves every width without a table of breakpoints. The
   * elastic ease is what makes it read as liquid finding a new level rather
   * than a selection box jumping between two states.
   */
  useLayoutEffect(() => {
    const target = itemRefs.current[active];
    const shell = pill.current;
    const parent = nav.current;
    if (!target || !shell || !parent) {
      if (shell) gsap.to(shell, { autoAlpha: 0, duration: 0.3 });
      return;
    }

    const parentBox = parent.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.to(shell, {
      x: box.left - parentBox.left,
      width: box.width,
      autoAlpha: 1,
      duration: still ? 0 : 0.7,
      ease: "elastic.out(1, 0.65)",
    });
  }, [active]);

  return (
    <header
      ref={header}
      data-theme-aware
      data-condensed={condensed}
      className={`nav-shell fixed inset-x-0 top-0 z-50 transition-[padding,background-color,backdrop-filter,color] duration-500 ease-out ${
        condensed ? "py-3" : "py-5"
      } ${
        overDark
          ? "text-white [--line:rgb(255_255_255/0.18)] [--ink-2:rgb(255_255_255/0.62)] [--ink:#ffffff] [--ink-contrast:#0b0b0d]"
          : ""
      } ${condensed ? (overDark ? "nav-tint-dark" : "nav-tint-light") : ""}`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-6 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-xs focus:text-white"
      >
        {t.nav.skip}
      </a>

      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-6 px-6 md:px-10">
        <a href="#top" className="flex shrink-0 items-center gap-2.5 text-ink" aria-label="Apple Motion">
          <Mark className="h-[22px] w-[22px]" />
          <span className="hidden text-[13px] font-semibold tracking-[-0.015em] sm:block">
            Apple Motion
          </span>
        </a>

        {/* The numbered pager doubles as the site's only nav: click a number
            to jump straight to that product, and the active one expands to
            name itself — an index you can act on, not just read. */}
        <nav
          ref={nav}
          className="relative hidden min-w-0 items-center gap-1 md:flex"
          aria-label={t.nav.products}
          onPointerEnter={() => setArmed(true)}
          onFocus={() => setArmed(true)}
        >
          <span
            ref={pill}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 h-full rounded-full opacity-0"
            style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }}
          />
          {CATALOGUE.map((entry, i) => {
            const isActive = i === active;
            const name = entry.stack.join(" ");
            return (
              <a
                key={entry.id}
                href={`#${entry.anchor}`}
                ref={(node) => {
                  itemRefs.current[i] = node;
                }}
                aria-current={isActive ? "true" : undefined}
                // Starts with the visible number, so the spoken name matches
                // what a voice-control user reads on screen.
                aria-label={`${String(i + 1).padStart(2, "0")} ${name}`}
                className={`group relative flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors duration-300 ${
                  isActive ? "text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                <span className="tech-label tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                {/* The name rolls in one letter at a time as its section takes
                    over, and rolls out the same way. */}
                <span
                  aria-hidden="true"
                  className={`overflow-hidden whitespace-nowrap text-[12.5px] font-medium tracking-[-0.01em] transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive ? "max-w-40" : "max-w-0"
                  }`}
                >
                  <RollText text={name} shown={isActive} />
                </span>

                <Preview entry={entry} index={i} armed={armed} tagline={t.products[entry.id].tagline} />
              </a>
            );
          })}
        </nav>

        {/* On a phone the pager above is hidden; this is what stands in for
            it — the same information, a dot per product rather than a row of
            numbers a thumb has no room to hit. */}
        <MobileTrack active={active} />

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!muted}
            aria-label={muted ? t.sound.unmute : t.sound.mute}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:text-ink sm:flex"
          >
            <SoundIcon muted={muted} className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => openPalette("jump")}
            aria-label={t.nav.jump}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:text-ink md:flex"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.8 10.8 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>

          <LanguageSwitch />
        </div>
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

function SoundIcon({ muted, className }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M2 6.2h2.6L8.4 3v10L4.6 9.8H2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="M11 5.8 14.4 10.2M14.4 5.8 11 10.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      ) : (
        <path
          d="M11 5.4a4 4 0 0 1 0 5.2M12.7 3.6a6.6 6.6 0 0 1 0 8.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/**
 * A dot per product, standing in for the desktop pager below `md`.
 *
 * The active dot grows and the product's name crossfades beside it, so the
 * header still says where you are without the horizontal room a thumb-sized
 * row of numbers would need.
 */
function MobileTrack({ active }: { active: number }) {
  const { t } = useI18n();
  const entry = active >= 0 ? CATALOGUE[active] : null;

  return (
    <div
      className="flex min-w-0 flex-1 items-center justify-center gap-3 md:hidden"
      role="group"
      aria-label={t.nav.products}
    >
      <div className="flex items-center gap-1.5">
        {CATALOGUE.map((product, i) => (
          <a
            key={product.id}
            href={`#${product.anchor}`}
            aria-label={`${String(i + 1).padStart(2, "0")} ${product.stack.join(" ")}`}
            aria-current={i === active ? "true" : undefined}
            className="p-1"
          >
            <span
              className="block rounded-full bg-ink transition-[width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: i === active ? 14 : 5, height: 5, opacity: i === active ? 1 : 0.28 }}
            />
          </a>
        ))}
      </div>
      <span
        aria-hidden="true"
        className="hidden max-w-28 truncate text-[11px] font-medium tracking-[-0.01em] text-ink-2 transition-opacity duration-300 min-[380px]:block"
        style={{ opacity: entry ? 1 : 0 }}
      >
        {entry?.stack.join(" ")}
      </span>
    </div>
  );
}

/**
 * Text that rolls in letter by letter.
 *
 * Each letter rises from below its own line, a few milliseconds after the one
 * before it, and leaves upward the same way, so a changing label reads as a
 * mechanical counter turning over rather than a crossfade.
 */
function RollText({ text, shown }: { text: string; shown: boolean }) {
  const letters = Array.from(text);
  return (
    <span className="inline-flex">
      {letters.map((letter, i) => (
        <span
          key={`${letter}-${i}`}
          className="inline-block transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: shown ? "translateY(0)" : "translateY(110%)",
            opacity: shown ? 1 : 0,
            transitionDelay: `${(shown ? i : letters.length - i) * 16}ms`,
          }}
        >
          {letter === " " ? " " : letter}
        </span>
      ))}
    </span>
  );
}

/**
 * A small window onto the product, opened by hovering its number.
 *
 * It shows the product in its own room, on the angle its section pauses on,
 * so the nav doubles as a contact sheet of the whole tour.
 */
function Preview({
  entry,
  index,
  armed,
  tagline,
}: {
  entry: (typeof CATALOGUE)[number];
  index: number;
  armed: boolean;
  tagline: string;
}) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none invisible absolute top-full left-1/2 z-10 mt-4 block w-52 origin-top -translate-x-1/2 translate-y-2 scale-95 rounded-2xl p-3 opacity-0 shadow-[0_24px_60px_-20px_rgb(13_13_15/0.35)] transition-[opacity,transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100"
      style={{ background: entry.bg }}
    >
      <span
        className="block aspect-[4/3] w-full bg-contain bg-center bg-no-repeat transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
        style={armed ? { backgroundImage: `url(/sequences/${entry.id}/${PREVIEW_FRAME}.webp)` } : undefined}
      />
      <span className="mt-2 flex items-baseline justify-between gap-3 text-[#0d0d0f]">
        <span className="text-[13px] font-semibold tracking-[-0.02em]">{entry.stack.join(" ")}</span>
        <span className="tech-label text-[#4e5057]">{String(index + 1).padStart(2, "0")}</span>
      </span>
      <span className="mt-1 block text-[11px] leading-snug text-[#4e5057]">{tagline}</span>
    </span>
  );
}

/** The frame each section holds while its first block of copy lands. */
const PREVIEW_FRAME = "054";
