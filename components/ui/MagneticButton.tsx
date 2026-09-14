"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

/**
 * The pointer-follow logic itself, shared between the button and the anchor
 * below it — everything it touches (`getBoundingClientRect`, GSAP's `x`/`y`
 * quickTo, pointer events) works identically on either element, so only the
 * tag returned at the bottom needs to differ.
 */
function useMagnetic(radius: number, strength: number) {
  const shell = useRef<HTMLElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = shell.current;
    const inner = label.current;
    if (!element || !inner) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const moveShell = {
      x: gsap.quickTo(element, "x", { duration: 0.45, ease: "power3.out" }),
      y: gsap.quickTo(element, "y", { duration: 0.45, ease: "power3.out" }),
    };
    const moveLabel = {
      x: gsap.quickTo(inner, "x", { duration: 0.65, ease: "power3.out" }),
      y: gsap.quickTo(inner, "y", { duration: 0.65, ease: "power3.out" }),
    };

    const onMove = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const distance = Math.hypot(dx, dy);

      if (distance > radius + Math.max(box.width, box.height) / 2) {
        moveShell.x(0);
        moveShell.y(0);
        moveLabel.x(0);
        moveLabel.y(0);
        return;
      }

      moveShell.x(dx * strength);
      moveShell.y(dy * strength);
      moveLabel.x(dx * strength * 0.34);
      moveLabel.y(dy * strength * 0.34);
    };

    const onLeave = () => {
      gsap.to(element, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" });
      gsap.to(inner, { x: 0, y: 0, duration: 1.05, ease: "elastic.out(1, 0.35)" });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
    };
  }, [radius, strength]);

  return { shell, label };
}

type Shared = { children: React.ReactNode; className?: string; radius?: number; strength?: number };

/**
 * A control that leans toward the cursor as it approaches.
 *
 * Two details separate this from the usual version: the label lags behind the
 * shell by a third, which reads as the surface having a little give, and the
 * release uses `elastic` while the approach uses a plain follow — pulling
 * should feel immediate, letting go should feel sprung.
 *
 * Renders a `<button>` by default and an `<a>` the moment an `href` is
 * passed — an outbound link deserves a real anchor (crawlable, opens in a
 * new tab on its own without a click handler faking it), and the magnetic
 * feel shouldn't be the reason it doesn't get one.
 */
export function MagneticButton(
  props: Shared & Omit<React.ComponentProps<"button">, keyof Shared> & { href?: undefined }
): React.JSX.Element;
export function MagneticButton(
  props: Shared & Omit<React.ComponentProps<"a">, keyof Shared> & { href: string }
): React.JSX.Element;
export function MagneticButton({
  children,
  className = "",
  radius = 90,
  strength = 0.38,
  href,
  ...props
}: Shared & { href?: string } & Record<string, unknown>) {
  const { shell, label } = useMagnetic(radius, strength);

  const inner = (
    <span ref={label} className="inline-flex items-center gap-2.5 will-change-transform">
      {children}
    </span>
  );

  if (href) {
    return (
      <a
        ref={shell as RefObject<HTMLAnchorElement>}
        href={href}
        className={className}
        {...(props as React.ComponentProps<"a">)}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      ref={shell as RefObject<HTMLButtonElement>}
      className={className}
      {...(props as React.ComponentProps<"button">)}
    >
      {inner}
    </button>
  );
}
