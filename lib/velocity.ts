"use client";

import { onTick } from "./ticker";

/**
 * How fast the page is currently moving, in pixels per millisecond.
 *
 * One tracker for the whole page, on the shared ticker, rather than every
 * consumer keeping its own copy of the same sum. Nothing subscribes to this
 * directly — the approach prefetch below just reads `getScrollVelocity()` at
 * the moment it needs it, so the tracker itself does no work beyond updating
 * two numbers a frame.
 */
let velocity = 0;
let lastY = typeof window === "undefined" ? 0 : window.scrollY;
let started = false;

function tick() {
  const y = window.scrollY;
  velocity += (y - lastY - velocity) * 0.3;
  lastY = y;
}

function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  lastY = window.scrollY;
  onTick(tick);
}

export function getScrollVelocity() {
  ensureStarted();
  return velocity;
}
