"use client";

/**
 * Cycles a piece of text through noise on the way to its next value.
 *
 * Built for the one moment on this page where a word actually changes
 * meaning rather than position: the language switch. A crossfade would say
 * "here is a different label"; scrambling through a few random characters
 * before landing says "this is being retranslated", which is closer to what
 * is actually happening.
 */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function scrambleTo(
  node: HTMLElement,
  next: string,
  { duration = 500, reveal = 0.6 }: { duration?: number; reveal?: number } = {}
) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    node.textContent = next;
    return () => {};
  }

  const chars = Array.from(next);
  let raf = 0;
  const start = performance.now();

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    // Settles left to right: by the fraction `reveal` of the way through,
    // every character up to that position in the string has already landed.
    const settled = Math.floor(t * chars.length * (1 + reveal));

    node.textContent = chars
      .map((char, i) => {
        if (char === " " || i < settled) return char;
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      })
      .join("");

    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      node.textContent = next;
    }
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
