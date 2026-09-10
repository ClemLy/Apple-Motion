"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyRoom } from "./theme";
import { getSequence, retainOnly } from "./sequence";
import type { ProductId } from "./products";
import { CATALOGUE, ENTRY_BY_ID } from "./catalogue";

/**
 * Ties one section's scroll range to its product sequence.
 *
 * Three jobs: write the scrub position into a ref the canvas reads, change the
 * room's colour when the section takes over, and manage which sequences are
 * allowed to stay decoded in memory.
 *
 * The section is held in place with CSS `position: sticky` rather than GSAP's
 * pin — no pin-spacer, no refresh needed on resize — leaving ScrollTrigger the
 * one job it is genuinely better at, which is measuring.
 */
export function useSectionScroll({
  ref,
  product,
  progress,
  range = [0, 1],
  onActive,
}: {
  ref: RefObject<HTMLElement | null>;
  product: ProductId;
  /** Written every frame; read by the canvas player. */
  progress: RefObject<number>;
  /** Slice of the sequence this section plays, so a hero can hand a rotation
   *  over to the section below it without the product jumping. */
  range?: [number, number];
  onActive?: () => void;
}) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    gsap.registerPlugin(ScrollTrigger);
    const [from, to] = range;

    const claim = () => {
      const entry = ENTRY_BY_ID[product];
      applyRoom(entry.bg, entry.ghost);
      onActive?.();

      // Keep this product and its neighbours decoded; hand everything else
      // back. Five fully decoded sequences at once is around two gigabytes.
      const order = CATALOGUE.map((e) => e.id);
      const index = order.indexOf(product);
      retainOnly(order.slice(Math.max(0, index - 1), index + 2));
    };

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        progress.current = from + self.progress * (to - from);
        // Claimed on every update rather than only on the enter edge:
        // ScrollTrigger evaluates triggers in its own order after an instant
        // jump, and an edge-triggered claim lets whichever toggles last win.
        claim();
      },
      onToggle: (self) => {
        if (self.isActive) claim();
      },
    });

    // Start fetching before the section is on screen, so arriving at it does
    // not begin with an empty frame.
    ScrollTrigger.create({
      trigger: element,
      start: "top bottom+=60%",
      once: true,
      onEnter: () => {
        getSequence(product).load().catch(() => {});
      },
    });

    if (trigger.isActive) claim();

    return () => {
      trigger.kill();
    };
  }, [ref, product, progress, range, onActive]);
}
