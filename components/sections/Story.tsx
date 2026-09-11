"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useI18n } from "@/lib/i18n/context";
import { useRoomClaim } from "@/lib/use-room-scene";
import { roomStyle } from "@/lib/theme";
import { STORY_ROOM } from "@/lib/catalogue";
import { Curtain } from "@/components/ui/Curtain";

/**
 * Why the page exists, told the way the page tells everything else.
 *
 * The manifesto is held in place and lit one word at a time as the visitor
 * scrolls, so it is read at the pace it is scrolled, never faster than it can
 * be taken in and never left sitting as a grey block waiting to be noticed.
 * The three principles under it arrive once it has been read.
 *
 * The room is the page's one dark one before the sign-off: after six bright
 * rooms the change of light is what says the tour is over.
 */
export function Story() {
  const { t } = useI18n();
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const manifesto = useRef<HTMLParagraphElement>(null);
  const principles = useRef<HTMLDivElement>(null);

  useRoomClaim(section, STORY_ROOM);

  useLayoutEffect(() => {
    const element = section.current;
    const track = pin.current;
    const text = manifesto.current;
    if (!element || !track || !text) return;

    const words = text.querySelectorAll<HTMLElement>("[data-word]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(words, { opacity: 1 });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: { trigger: track, start: "top top", end: "bottom bottom", scrub: 0.4 },
        })
        .fromTo(
          words,
          { opacity: 0.14, y: 6 },
          { opacity: 1, y: 0, ease: "none", duration: 1, stagger: 0.28 },
          0
        )
        .fromTo(
          "[data-story-signature]",
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, ease: "power2.out", duration: 4 },
          ">-2"
        );

      gsap.from("[data-principle]", {
        y: 48,
        opacity: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: "expo.out",
        scrollTrigger: { trigger: principles.current, start: "top 80%", once: true },
      });
    }, element);

    return () => ctx.revert();
  }, [t]);

  const words = t.story.manifesto.split(" ");

  return (
    <section
      ref={section}
      id="story"
      data-dark-room
      className="relative bg-room text-ink"
      style={roomStyle(STORY_ROOM)}
      aria-labelledby="story-title"
    >
      <Curtain color={STORY_ROOM.bg} apex={0.5} />

      <div ref={pin} className="relative h-[260vh]">
        <div className="grain sticky top-0 flex h-[100svh] items-center overflow-hidden">
          {/* A slow pool of the opening colour, the only light in the room. */}
          <div
            aria-hidden="true"
            className="aura-drift pointer-events-none absolute top-1/2 right-[-20svh] h-[110svh] w-[110svh] -translate-y-1/2"
            style={{
              background: `radial-gradient(circle, ${STORY_ROOM.accent}1f 0%, transparent 62%)`,
              animation: "auraDrift 26s ease-in-out infinite",
            }}
          />

          <div className="relative mx-auto w-full max-w-[1560px] px-6 md:px-10">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold tabular-nums text-ink">{t.story.index}</span>
              <span className="h-px w-5 bg-line" />
              <h2 id="story-title" className="tech-label text-ink-2">
                {t.story.eyebrow}
              </h2>
            </div>

            <p
              ref={manifesto}
              // Set at reading size, not display size: this is a sentence
              // someone is meant to read, not a headline they glance at.
              className="mt-8 max-w-[34em] font-display text-[clamp(1.05rem,1.8vw,1.6rem)] leading-[1.55] font-medium tracking-[-0.01em] md:mt-10"
            >
              {words.map((word, i) => (
                <span key={`${word}-${i}`} data-word className="inline-block">
                  {word}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
            </p>

            <div data-story-signature className="mt-10 flex flex-wrap items-baseline gap-x-5 gap-y-2 md:mt-14">
              <span className="tech-label text-ink-2">{t.story.signatureLabel}</span>
              <span className="font-display text-[clamp(1.3rem,2.2vw,1.9rem)] font-bold tracking-[-0.03em]">
                {t.story.signature}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1560px] px-6 pt-20 pb-28 md:px-10 md:pt-28 md:pb-36">
        <p className="tech-label text-ink-2">{t.story.principlesLabel}</p>
        <div ref={principles} className="mt-8 grid gap-10 border-t border-line pt-10 md:grid-cols-3 md:gap-12">
          {t.story.principles.map((principle, i) => (
            <div key={principle.title} data-principle>
              <span className="tech-label text-ink-2">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-4 font-display text-[clamp(2rem,3.4vw,3rem)] leading-[0.9] font-bold tracking-[-0.04em]">
                {principle.title}
              </p>
              <p className="mt-4 max-w-[36ch] text-[14px] leading-[1.7] text-ink-2">{principle.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
