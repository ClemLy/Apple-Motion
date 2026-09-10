"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Word-by-word rise, revealed behind a mask.
 *
 * The mask is the fiddly part. A plain `overflow: hidden` line box clips the
 * accents on French capitals (É, À, Ç) and the descenders on g, y and ç — which
 * is invisible in English and immediately wrong in French. Each line therefore
 * carries optical padding that is cancelled by an equal negative margin, so the
 * mask sits outside the glyphs instead of through them.
 */
export function RevealText({
  text,
  as: Tag = "span",
  className = "",
  delay = 0,
  stagger = 0.055,
  start = "top 85%",
}: {
  text: string;
  as?: React.ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  start?: string;
}) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const words = element.querySelectorAll("[data-word]");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { yPercent: 108, rotate: 2.2 },
        {
          yPercent: 0,
          rotate: 0,
          duration: 1.05,
          delay,
          stagger,
          ease: "expo.out",
          scrollTrigger: { trigger: element, start, once: true },
        }
      );
    }, element);

    return () => ctx.revert();
  }, [text, delay, stagger, start]);

  // A polymorphic `as` gives TypeScript no way to know which element's props
  // apply, so the tag is narrowed to the shape this component actually uses.
  const Component = Tag as React.FC<{
    ref?: React.Ref<HTMLElement>;
    className?: string;
    children?: React.ReactNode;
  }>;

  return (
    <Component ref={root} className={className}>
      {text.split(" ").map((word, i) => (
        <span
          key={`${word}-${i}`}
          data-reveal-mask
          className="inline-block overflow-hidden pt-[0.14em] pb-[0.22em] -mt-[0.14em] -mb-[0.22em] align-bottom"
        >
          <span data-word className="inline-block will-change-transform">
            {word}
          </span>
          {i < text.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </Component>
  );
}
