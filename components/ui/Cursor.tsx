"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useI18n } from "@/lib/i18n/context";

type State = "idle" | "link" | "product" | "view";

/**
 * A cursor that belongs to the room.
 *
 * Two pieces. A dot that sits exactly on the pointer, so aiming never lags,
 * and a ring that follows it with a little weight. Over something you can
 * press, the ring opens and fills with the accent of the product in the room;
 * over the product itself it swells into a disc that tells you what the
 * product responds to.
 *
 * Only on a real mouse or trackpad. On touch there is no pointer to dress, and
 * the element is never shown.
 */
export function Cursor() {
  const { t } = useI18n();
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const trail = useRef<(HTMLDivElement | null)[]>([]);
  const productLabel = useRef(t.cursor.product);

  useEffect(() => {
    productLabel.current = t.cursor.product;
  }, [t.cursor.product]);

  useEffect(() => {
    const dotNode = dot.current;
    const ringNode = ring.current;
    const labelNode = label.current;
    if (!dotNode || !ringNode || !labelNode) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    const dotX = gsap.quickTo(dotNode, "x", { duration: still ? 0 : 0.06, ease: "none" });
    const dotY = gsap.quickTo(dotNode, "y", { duration: still ? 0 : 0.06, ease: "none" });
    const ringX = gsap.quickTo(ringNode, "x", { duration: still ? 0 : 0.5, ease: "power3.out" });
    const ringY = gsap.quickTo(ringNode, "y", { duration: still ? 0 : 0.5, ease: "power3.out" });

    // A short chain of dots, each a little slower than the last, that only
    // shows itself once the pointer is actually moving fast. Held at zero
    // width the rest of the time — a trail that is always visible reads as a
    // smear on the cursor, not as a response to speed.
    const trailMovers = still
      ? []
      : trail.current.flatMap((node, i) =>
          node
            ? [
                {
                  node,
                  x: gsap.quickTo(node, "x", { duration: 0.16 + i * 0.05, ease: "power2.out" }),
                  y: gsap.quickTo(node, "y", { duration: 0.16 + i * 0.05, ease: "power2.out" }),
                },
              ]
            : []
        );
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let fade = 0;

    let state: State = "idle";
    let shown = false;

    const setState = (next: State, text = "") => {
      if (next !== state) {
        state = next;
        ringNode.dataset.state = next;
        dotNode.dataset.state = next;
      }
      if (labelNode.textContent !== text) labelNode.textContent = text;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      if (!shown) {
        shown = true;
        gsap.set([dotNode, ringNode, ...trailMovers.map((m) => m.node)], {
          x: event.clientX,
          y: event.clientY,
        });
        dotNode.dataset.visible = ringNode.dataset.visible = "true";
        for (const mover of trailMovers) mover.node.dataset.visible = "true";
      }
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);

      const now = event.timeStamp;
      const dt = lastT ? Math.max(1, now - lastT) : 16;
      const speed = lastT ? Math.hypot(event.clientX - lastX, event.clientY - lastY) / dt : 0;
      lastX = event.clientX;
      lastY = event.clientY;
      lastT = now;

      // Eased toward the reading rather than snapped to it, so a single fast
      // flick doesn't make the trail appear at full strength for one frame
      // and vanish the next.
      fade += (Math.min(1, speed / 1.6) - fade) * 0.3;
      trailMovers.forEach((mover, i) => {
        mover.x(event.clientX);
        mover.y(event.clientY);
        // Tapers down the chain, so it reads as one wake thinning out rather
        // than three equally solid dots.
        mover.node.style.opacity = (fade * (1 - i * 0.3)).toFixed(3);
      });

      const target = event.target instanceof Element ? event.target : null;
      const tone = target?.closest("[data-dark-room]") ? "dark" : "light";
      if (ringNode.dataset.tone !== tone) ringNode.dataset.tone = dotNode.dataset.tone = tone;

      const hit = target?.closest<HTMLElement>("[data-cursor], a, button, [role='button'], label");
      if (!hit) return setState("idle");

      const kind = hit.dataset.cursor;
      if (kind === "product") return setState("product", productLabel.current);
      if (kind === "view") return setState("view", hit.dataset.cursorLabel ?? "");
      setState("link");
    };

    const onLeave = () => {
      shown = false;
      lastT = 0;
      fade = 0;
      dotNode.dataset.visible = ringNode.dataset.visible = "false";
      for (const mover of trailMovers) mover.node.dataset.visible = "false";
    };
    const onDown = () => (ringNode.dataset.pressed = "true");
    const onUp = () => (ringNode.dataset.pressed = "false");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div aria-hidden="true" className="cursor-layer">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(node) => {
            trail.current[i] = node;
          }}
          className="cursor-trail-dot"
          data-visible="false"
          style={{ opacity: 0 }}
        />
      ))}
      <div ref={ring} className="cursor-ring" data-state="idle" data-visible="false">
        <div className="cursor-ring-body" />
        {/* Outside the scaled body, so the text is set at its real size
            rather than drawn small and magnified. */}
        <span ref={label} className="cursor-label" />
      </div>
      <div ref={dot} className="cursor-dot" data-state="idle" data-visible="false">
        <div className="cursor-dot-body" />
      </div>
    </div>
  );
}
