"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useI18n } from "@/lib/i18n/context";
import { useVelocityStretch } from "@/lib/use-velocity-stretch";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Mark } from "@/components/ui/Nav";
import { Curtain } from "@/components/ui/Curtain";

const PORTFOLIO_URL = "https://clementin-portfolio.vercel.app/";

export function Footer() {
  const { t } = useI18n();
  const root = useRef<HTMLElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const headline = useRef<HTMLHeadingElement>(null);

  useVelocityStretch(headline);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // The name arrives line by line, then everything under it as one move.
      // Staggering the colophon separately would turn a sign-off into a list.
      gsap
        .timeline({ scrollTrigger: { trigger: element, start: "top 72%", once: true } })
        .from("[data-sign]", { yPercent: 114, duration: 1.1, stagger: 0.08, ease: "expo.out" })
        .from("[data-sign-body]", { y: 24, autoAlpha: 0, duration: 0.9, ease: "power3.out" }, 0.3);
    }, element);

    return () => ctx.revert();
  }, [t]);

  /**
   * The sign-off leans away from the pointer.
   *
   * Each letter is its own element, nudged along the line from the cursor to
   * its own centre and eased back the instant that line passes. It is the
   * one moment on the page where the type itself, not a layer behind it,
   * answers the hand — fitting for the last thing a visitor reads.
   *
   * Watched for rather than always wired up: a pointermove listener that
   * reads every letter's position is not something the rest of the page
   * should pay for while the footer is nowhere near the viewport.
   */
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const RADIUS = 130;
    const REACH = 22;
    let movers: { node: HTMLSpanElement; x: (v: number) => void; y: (v: number) => void }[] = [];

    const onMove = (event: PointerEvent) => {
      for (const mover of movers) {
        const box = mover.node.getBoundingClientRect();
        const dx = box.left + box.width / 2 - event.clientX;
        const dy = box.top + box.height / 2 - event.clientY;
        const dist = Math.hypot(dx, dy);
        if (dist > RADIUS || dist < 1) {
          mover.x(0);
          mover.y(0);
          continue;
        }
        const strength = (1 - dist / RADIUS) * REACH;
        mover.x((dx / dist) * strength);
        mover.y((dy / dist) * strength);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          movers = letters.current.flatMap((node) =>
            node
              ? [
                  {
                    node,
                    x: gsap.quickTo(node, "x", { duration: 0.5, ease: "power3.out" }),
                    y: gsap.quickTo(node, "y", { duration: 0.5, ease: "power3.out" }),
                  },
                ]
              : []
          );
          window.addEventListener("pointermove", onMove, { passive: true });
        } else {
          window.removeEventListener("pointermove", onMove);
          for (const mover of movers) {
            mover.x(0);
            mover.y(0);
          }
          movers = [];
        }
      },
      { rootMargin: "10%" }
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [t]);

  return (
    // Opaque and dark by design: after five bright rooms the page needs a floor
    // to land on, and the change of key is what tells you the scroll is over.
    <footer id="footer" ref={root} data-dark-room className="relative z-10 bg-[#0b0b0d] text-white">
      <Curtain color="#0b0b0d" apex={0.5} />

      {/* A band of running text across the seam. It states what the site is,
          which is the one piece of information a visitor cannot infer from
          looking at it. */}
      <div className="overflow-hidden border-b border-white/10 py-4">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="tech-label flex shrink-0 text-white/60" aria-hidden={copy === 1}>
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="px-6">
                  {t.footer.marquee}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1560px] px-6 pt-20 pb-10 md:px-10 md:pt-28">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
          <h2 ref={headline} className="stack text-[clamp(2.8rem,9vw,7.5rem)]">
            {t.footer.title.map((line, i) => (
              <span
                key={line}
                className="block overflow-hidden pt-[0.06em] pb-[0.18em] -mt-[0.06em] -mb-[0.18em]"
                data-reveal-mask
              >
                <span
                  data-sign
                  // The last word is set as an outline, the same device the
                  // product sections use, so the sign-off belongs to the page.
                  className={`block will-change-transform ${
                    i === t.footer.title.length - 1 ? "text-white/0 [-webkit-text-stroke:1.4px_rgb(255_255_255/0.85)]" : ""
                  }`}
                >
                  {Array.from(line).map((char, j) => (
                    <span
                      key={j}
                      ref={(node) => {
                        letters.current[i * 100 + j] = node;
                      }}
                      className="inline-block will-change-transform"
                    >
                      {char === " " ? " " : char}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </h2>

          <div data-sign-body className="flex shrink-0 flex-col gap-6 lg:items-end">
            <p className="max-w-[36ch] text-[13.5px] leading-[1.65] text-white/55 lg:text-right">
              {t.footer.subtitle}
            </p>

            <MagneticButton
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={0}
              className="group inline-flex items-center gap-3 self-start rounded-full bg-white px-7 py-4 text-[13px] font-medium text-[#0b0b0d] transition-colors duration-300 hover:bg-white/90 lg:self-end"
            >
              {t.footer.cta}
              <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden="true">
                <path
                  d="M2 12 12 2M4.5 2H12v7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </MagneticButton>
          </div>
        </div>

        <div data-sign-body className="mt-20 grid gap-x-10 gap-y-10 border-t border-white/10 pt-10 md:grid-cols-12">
          <div className="md:col-span-3">
            <div className="flex items-center gap-2.5">
              <Mark className="h-5 w-5 text-white/70" />
              <span className="text-[13px] font-semibold">Apple Motion</span>
            </div>
            <dl className="mt-6 space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2">
                <dt className="tech-label text-white/60">{t.footer.typeLabel}</dt>
                <dd className="text-[12px] text-white/70">{t.footer.typeValue}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2">
                <dt className="tech-label text-white/60">{t.footer.yearLabel}</dt>
                <dd className="text-[12px] tabular-nums text-white/70">
                  {new Date().getFullYear()}
                </dd>
              </div>
            </dl>
          </div>

          <div className="md:col-span-4">
            <p className="tech-label text-white/60">{t.footer.colophon}</p>
            <p className="mt-4 max-w-[40ch] text-[12.5px] leading-[1.7] text-white/55">
              {t.footer.tech}
            </p>
          </div>

          <div className="md:col-span-5">
            <p className="max-w-[54ch] text-[11.5px] leading-[1.75] text-white/60">
              {t.footer.disclaimer}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-end gap-6 border-t border-white/10 pt-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-white/60 uppercase transition-colors hover:text-white"
          >
            {t.footer.backToTop}
            <svg
              viewBox="0 0 14 14"
              className="h-3 w-3 transition-transform duration-300 group-hover:-translate-y-0.5"
              aria-hidden="true"
            >
              <path
                d="M7 13V1M2.5 5.5 7 1l4.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
