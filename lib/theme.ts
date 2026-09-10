import gsap from "gsap";

/**
 * Cross-fades the page's ground and ghost colours.
 *
 * Each product owns a room. Rather than giving every section an opaque
 * background — which produces a hard seam mid-scroll — the colours live as CSS
 * variables on the root and are tweened when a section takes over, so the whole
 * page changes key at once and everything reading `var(--bg)` follows.
 */
const current = { bg: "", ghost: "" };

export function applyRoom(bg: string, ghost: string, immediate = false) {
  if (current.bg === bg && current.ghost === ghost) return;
  current.bg = bg;
  current.ghost = ghost;

  const root = document.documentElement;

  if (immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.style.setProperty("--bg", bg);
    root.style.setProperty("--ghost", ghost);
    return;
  }

  // Tweening the variables themselves keeps one source of truth; GSAP
  // interpolates the colours and every consumer updates in the same frame.
  gsap.to(root, {
    duration: 0.9,
    ease: "power2.out",
    overwrite: "auto",
    "--bg": bg,
    "--ghost": ghost,
  });
}
