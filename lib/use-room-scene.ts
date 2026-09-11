"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyRoom, type Room } from "./theme";

/**
 * Sends a pinned scene back as the next room rises over it.
 *
 * The scene falls behind the scroll, shrinks a little and dims, so the section
 * arriving on top reads as passing in front of it rather than the two simply
 * scrolling past one another at the same speed. Only the scene moves: the
 * ground stays put, or the gap would show the page behind it.
 */
export function useRecede(scene: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = scene.current;
    const section = element?.closest("section");
    if (!element || !section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        { yPercent: 0, scale: 1, opacity: 1 },
        {
          yPercent: 32,
          scale: 0.9,
          opacity: 0.3,
          ease: "none",
          transformOrigin: "50% 100%",
          scrollTrigger: { trigger: section, start: "bottom bottom", end: "bottom top", scrub: true },
        }
      );
    }, element);

    return () => ctx.revert();
  }, [scene]);
}

/**
 * Claims the page-level room for a section that is not a product.
 *
 * Product sections do this through their scroll hook. The line-up and the
 * manifesto have no sequence to drive, but the cursor, the header and the
 * body behind overscroll still need to know whose room the visitor is in.
 */
export function useRoomClaim(ref: RefObject<HTMLElement | null>, room: Room) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: "top 50%",
      end: "bottom 50%",
      onUpdate: () => applyRoom(room),
      onToggle: (self) => {
        if (self.isActive) applyRoom(room);
      },
    });

    return () => trigger.kill();
  }, [ref, room]);
}
