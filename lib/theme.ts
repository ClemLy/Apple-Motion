import gsap from "gsap";
import type { CSSProperties } from "react";

/**
 * The colours of one room.
 *
 * Every section owns a room. Its ground, the lighter tone of its ghost type,
 * and a saturated accent pulled from the product, which is what the cursor and
 * the hover states pick up so the whole page changes key with the product.
 */
export type Room = {
  bg: string;
  ghost: string;
  accent: string;
  /** A dark room swaps the ink tokens for light ones inside it. */
  dark?: boolean;
};

/**
 * The room's colours as local custom properties.
 *
 * Set on the section itself, not only on the page root. A section that carries
 * its own ground is right whichever direction it is scrolled into: with a single
 * page-wide colour, scrolling back up showed the previous product standing in
 * the next one's room until the colour caught up.
 */
export function roomStyle(room: Room): CSSProperties {
  const style: Record<string, string> = {
    "--bg": room.bg,
    "--ghost": room.ghost,
    "--accent": room.accent,
  };
  if (room.dark) {
    style["--ink"] = "#f4f4f5";
    style["--ink-2"] = "rgb(244 244 245 / 0.62)";
    style["--line"] = "rgb(244 244 245 / 0.14)";
  }
  return style as CSSProperties;
}

/**
 * Cross-fades the page-level room.
 *
 * The sections paint their own grounds now, so what this still drives is
 * everything that lives outside them: the body behind overscroll, the loading
 * curtain, and the accent the cursor reads. Tweening the variables keeps one
 * source of truth; every consumer updates in the same frame.
 */
const current = { bg: "", ghost: "", accent: "", dark: false };

export function applyRoom(room: Room, immediate = false) {
  const dark = !!room.dark;
  if (
    current.bg === room.bg &&
    current.ghost === room.ghost &&
    current.accent === room.accent &&
    current.dark === dark
  ) {
    return;
  }
  current.bg = room.bg;
  current.ghost = room.ghost;
  current.accent = room.accent;
  current.dark = dark;

  const root = document.documentElement;
  root.dataset.room = dark ? "dark" : "light";

  if (immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.style.setProperty("--bg", room.bg);
    root.style.setProperty("--ghost", room.ghost);
    root.style.setProperty("--accent", room.accent);
    return;
  }

  gsap.to(root, {
    duration: 0.9,
    ease: "power2.out",
    overwrite: "auto",
    "--bg": room.bg,
    "--ghost": room.ghost,
    "--accent": room.accent,
  });
}
