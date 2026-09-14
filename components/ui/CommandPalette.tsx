"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

import { useI18n } from "@/lib/i18n/context";
import { onPaletteRequest, type PaletteMode } from "@/lib/palette";
import { CATALOGUE } from "@/lib/catalogue";

/**
 * Every section, in the order it appears — the five products plus the
 * opening, the line-up, the manifesto and the sign-off. Used only to work
 * out which section a key press means "next" or "previous" relative to.
 */
const SECTION_ORDER = ["top", ...CATALOGUE.map((entry) => entry.anchor), "lineup", "story", "footer"];

/**
 * Which of those sections the middle of the viewport is currently over.
 */
function currentSectionIndex() {
  const middle = window.scrollY + window.innerHeight / 2;
  let found = 0;
  SECTION_ORDER.forEach((id, i) => {
    const box = document.getElementById(id)?.getBoundingClientRect();
    if (box && box.top + window.scrollY <= middle) found = i;
  });
  return found;
}

/**
 * Moves to the exact top of the next or previous section rather than a fixed
 * distance — the one thing a bare `PageDown` can never do on a page where
 * every section is a different height.
 *
 * The two sections after the products are mounted only once a visitor has
 * nearly scrolled to them (see `LazyMount`), so a jump landing exactly on
 * that boundary can occasionally ask for an element that does not exist yet.
 * Falling back to one viewport's worth of scroll keeps the key from ever
 * doing nothing.
 */
function jumpToSection(delta: 1 | -1) {
  const from = currentSectionIndex();
  const to = Math.max(0, Math.min(SECTION_ORDER.length - 1, from + delta));
  const target = document.getElementById(SECTION_ORDER[to]);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollBy({ top: delta * window.innerHeight, behavior: "smooth" });
  }
}

/**
 * One overlay, two things it can show.
 *
 * `/` opens a jump list to any product; `?` opens the same panel showing what
 * every key on the page does. They share a shell — a dimmed backdrop and one
 * centred card — because they are the same kind of moment for a visitor: a
 * pause to ask the page a question, answered without leaving where they were.
 *
 * The same listener also owns section-to-section keyboard travel: the arrow
 * keys and Page Up/Down, remapped from the browser's fixed-distance scroll to
 * the exact top of the next or previous section, and Home/End to the very
 * first and last. A page built from sections this differently sized is
 * exactly where the browser's default falls shortest.
 */
export function CommandPalette() {
  const { t } = useI18n();
  const [mode, setMode] = useState<PaletteMode | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [highlight, setHighlight] = useState(0);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const previousFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setMode(null), []);

  const jumpTo = useCallback(
    (anchor: string) => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
      close();
    },
    [close]
  );

  // Opened from the header button, or from anywhere by keyboard.
  useEffect(() => onPaletteRequest((next) => setMode(next)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target?.closest("input, textarea, [contenteditable='true']");

      if (mode) {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        } else if (event.key === "Tab") {
          // A dialog that lets Tab carry focus out to the page behind it is
          // not actually modal to a keyboard or screen-reader user, whatever
          // the backdrop suggests to a sighted one — so this key is trapped
          // here rather than left to the browser's default order.
          const focusables = card.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (!focusables || focusables.length === 0) return;
          event.preventDefault();
          const list = Array.from(focusables);
          const current = list.indexOf(document.activeElement as HTMLElement);
          const next = (current + (event.shiftKey ? -1 : 1) + list.length) % list.length;
          list[next].focus();
        } else if (mode === "jump") {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlight((i) => Math.min(CATALOGUE.length - 1, i + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((i) => Math.max(0, i - 1));
          } else if (event.key === "Enter") {
            event.preventDefault();
            jumpTo(CATALOGUE[highlight].anchor);
          } else if (/^[1-5]$/.test(event.key)) {
            event.preventDefault();
            jumpTo(CATALOGUE[Number(event.key) - 1].anchor);
          }
        }
        return;
      }

      if (typing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/") {
        event.preventDefault();
        setHighlight(0);
        setMode("jump");
      } else if (event.key === "?") {
        event.preventDefault();
        setMode("shortcuts");
      } else if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        jumpToSection(1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        jumpToSection(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        document.getElementById(SECTION_ORDER[0])?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (event.key === "End") {
        event.preventDefault();
        const last = document.getElementById(SECTION_ORDER[SECTION_ORDER.length - 1]);
        if (last) {
          last.scrollIntoView({ behavior: "smooth", block: "end" });
        } else {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, highlight, close, jumpTo]);

  // Entrance, and the one place focus goes so Escape has somewhere to return
  // keyboard control from.
  useLayoutEffect(() => {
    if (!mode) return;
    const element = card.current;
    if (!element) return;

    document.documentElement.style.overflow = "hidden";
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!still) {
      gsap.fromTo(
        element,
        { autoAlpha: 0, y: 16, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out" }
      );
    }

    const target = mode === "jump" ? itemRefs.current[highlight] : closeRef.current;
    target?.focus({ preventScroll: true });

    return () => {
      document.documentElement.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode === "jump") itemRefs.current[highlight]?.focus({ preventScroll: true });
  }, [highlight, mode]);

  // Keyboard focus is handed to the dialog while it is open (see above) and
  // handed back to wherever it came from once it closes — the button that
  // opened it, or nothing in particular if a global shortcut did. Without
  // this, closing the palette leaves focus on a `<button>` that just
  // unmounted, which most browsers quietly drop to `<body>`.
  useEffect(() => {
    if (mode) {
      previousFocus.current = document.activeElement as HTMLElement | null;
    } else if (previousFocus.current) {
      previousFocus.current.focus({ preventScroll: true });
      previousFocus.current = null;
    }
  }, [mode]);

  if (!mode) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-[rgb(10_10_12/0.6)] px-6 pt-[14svh] backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "jump" ? t.palette.jumpEyebrow : t.palette.shortcutsEyebrow}
        className="grain relative w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-[rgb(13_13_15/0.1)] bg-[rgb(252_250_247/0.96)] p-2 shadow-[0_60px_120px_-40px_rgb(0_0_0/0.55)]"
      >
        <div className="flex items-center justify-between gap-4 px-4 pt-3 pb-2">
          <span className="tech-label text-[#4e5057]">
            {mode === "jump" ? t.palette.jumpEyebrow : t.palette.shortcutsEyebrow}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="tech-label rounded-full px-2.5 py-1 text-[#4e5057] transition-colors hover:bg-[rgb(13_13_15/0.06)] hover:text-[#0d0d0f]"
          >
            {t.palette.close}
          </button>
        </div>

        {mode === "jump" ? (
          <ul className="flex flex-col gap-1 px-2 pb-2">
            {CATALOGUE.map((entry, i) => {
              const copy = t.products[entry.id];
              return (
                <li key={entry.id}>
                  <a
                    ref={(node) => {
                      itemRefs.current[i] = node;
                    }}
                    href={`#${entry.anchor}`}
                    tabIndex={0}
                    onPointerEnter={() => setHighlight(i)}
                    onClick={(event) => {
                      event.preventDefault();
                      jumpTo(entry.anchor);
                    }}
                    className={`flex items-center gap-4 rounded-2xl px-3 py-2.5 text-[#0d0d0f] outline-none transition-colors duration-200 ${
                      highlight === i ? "bg-[rgb(13_13_15/0.06)]" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums"
                      style={{ background: entry.bg, color: entry.deep }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold tracking-[-0.015em]">
                        {entry.stack.join(" ")}
                      </span>
                      <span className="block truncate text-[12px] text-[#4e5057]">{copy.tagline}</span>
                    </span>
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.accent }} />
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="flex flex-col gap-0.5 px-2 pb-3">
            {t.palette.shortcutsList.map((row) => (
              <li key={row.keys} className="flex items-center justify-between gap-6 rounded-xl px-3 py-2.5">
                <span className="text-[13px] text-[#0d0d0f]">{row.label}</span>
                <kbd className="tech-label rounded-md border border-[rgb(13_13_15/0.14)] bg-[rgb(13_13_15/0.04)] px-2 py-1 text-[#4e5057]">
                  {row.keys}
                </kbd>
              </li>
            ))}
          </ul>
        )}

        <p className="border-t border-[rgb(13_13_15/0.08)] px-4 py-2.5 text-[11px] text-[#4e5057]">
          {mode === "jump" ? t.palette.jumpHint : t.palette.shortcutsHint}
        </p>
      </div>
    </div>
  );
}
