"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyRoom } from "./theme";
import { getSequence, retainOnly } from "./sequence";
import { getScrollVelocity } from "./velocity";
import type { ProductId } from "./products";
import { CATALOGUE, ENTRY_BY_ID, roomOf } from "./catalogue";

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
  curve,
  retain,
  onActive,
  onEnter,
}: {
  ref: RefObject<HTMLElement | null>;
  product: ProductId;
  /** Written every frame; read by the canvas player. */
  progress: RefObject<number>;
  /** Slice of the sequence this section plays, so a hero can hand a rotation
   *  over to the section below it without the product jumping. */
  range?: [number, number];
  /**
   * Reshapes scroll position before it reaches the sequence.
   *
   * Straight scroll maps to a constant rotation speed, which is the one thing
   * a real camera move never does. A curve lets a section spin hard while the
   * product flies in, stop dead on the frame the copy is written against, then
   * resume — all from the same linear scroll, with no second timeline to keep
   * in sync.
   */
  curve?: (p: number) => number;
  /**
   * Which sequences may stay decoded while this section holds the stage.
   *
   * Defaults to this product and the two either side of it in the catalogue.
   * The hero needs to say so explicitly: it shows a product from the middle of
   * the running order, so the neighbours rule would evict the section that
   * comes immediately after it.
   */
  retain?: ProductId[];
  onActive?: () => void;
  /** Fired once, on the scroll-driven edge where this section actually takes
   *  over from another — never on the section a visitor lands or reloads on.
   *  `onActive` runs on every scroll frame the section is active; this is
   *  the one moment inside that a section handoff genuinely happened. */
  onEnter?: () => void;
}) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    gsap.registerPlugin(ScrollTrigger);
    const [from, to] = range;

    const claim = () => {
      applyRoom(roomOf(ENTRY_BY_ID[product]));
      onActive?.();

      // Keep this product and its neighbours decoded; hand everything else
      // back. Five fully decoded sequences at once is around two gigabytes.
      const order = CATALOGUE.map((e) => e.id);
      const index = order.indexOf(product);
      retainOnly(retain ?? order.slice(Math.max(0, index - 1), index + 2));
    };

    // The product on stage is always loading. It may have been released while
    // the visitor was further down the page; `load` is a no-op for a sequence
    // that is already arriving. Only while genuinely active: a jump across the
    // page updates every section it passes, and those must not start fetching.
    const loadIfOnStage = (self: ScrollTrigger) => {
      if (self.isActive) getSequence(product).load().catch(() => {});
    };

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const shaped = curve ? curve(self.progress) : self.progress;
        progress.current = from + shaped * (to - from);
        // Claimed on every update rather than only on the enter edge:
        // ScrollTrigger evaluates triggers in its own order after an instant
        // jump, and an edge-triggered claim lets whichever toggles last win.
        claim();
        loadIfOnStage(self);
      },
      onToggle: (self) => {
        if (!self.isActive) return;
        claim();
        loadIfOnStage(self);
        onEnter?.();
      },
    });

    // Start fetching before the section is on screen, from either direction,
    // so arriving at it does not begin with an empty frame. Not `once`: a
    // sequence released while the visitor was elsewhere has to come back when
    // they return.
    // A beat's grace before fetching: a jump from the nav to the far end of
    // the page passes through every section on the way, and without it each
    // one would start downloading a sequence the visitor never stops at. That
    // grace shrinks the faster the page is already moving — a visitor flicking
    // hard toward this section is one of the least ambiguous signals on the
    // page that they are actually headed here, so there is less reason to
    // wait out the full window before believing it.
    let pending = 0;
    const approach = ScrollTrigger.create({
      trigger: element,
      start: "top bottom+=60%",
      end: "bottom top-=60%",
      onToggle: (self) => {
        window.clearTimeout(pending);
        if (!self.isActive) return;
        const speed = Math.min(1, Math.abs(getScrollVelocity()) / 12);
        const delay = 400 - speed * 320;
        pending = window.setTimeout(() => {
          if (approach.isActive) getSequence(product).load().catch(() => {});
        }, delay);
      },
    });

    if (trigger.isActive) {
      claim();
      loadIfOnStage(trigger);
    }

    return () => {
      window.clearTimeout(pending);
      trigger.kill();
      approach.kill();
    };
  }, [ref, product, progress, range, curve, retain, onActive, onEnter]);
}
