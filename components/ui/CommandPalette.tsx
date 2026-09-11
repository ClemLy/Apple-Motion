"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

import { useI18n } from "@/lib/i18n/context";
import { onPaletteRequest, type PaletteMode } from "@/lib/palette";
import { CATALOGUE } from "@/lib/catalogue";

/**
 * One overlay, two things it can show.
 *
 * `/` opens a jump list to any product; `?` opens the same panel showing what
 * every key on the page does. They share a shell — a dimmed backdrop and one
 * centred card — because they are the same kind of moment for a visitor: a
 * pause to ask the page a question, answered without leaving where they were.
 */
export function CommandPalette() {
  const { t } = useI18n();
  const [mode, setMode] = useState<PaletteMode | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [highlight, setHighlight] = useState(0);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

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
