"use client";

/**
 * A handful of sounds, synthesised rather than shipped as files.
 *
 * Every one of them is noise pushed through a filter that sweeps in a few
 * hundred milliseconds — there is no melody to author and no asset to fetch,
 * which is the whole point: the effect is a texture, not a jingle, and a
 * generated texture is a few lines of code instead of a licensing question.
 *
 * Muted by default, and the mute state only ever flips from a click on the
 * header's own control — never from a scroll or a timer. `AudioContext` needs
 * a genuine user gesture to run at all, and a click is the one this project
 * asks for.
 */

const STORAGE_KEY = "apple-motion:sound";

let muted = true;
let hydrated = false;
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;

function read(): boolean {
  if (typeof window === "undefined") return muted;
  if (!hydrated) {
    hydrated = true;
    try {
      muted = window.localStorage.getItem(STORAGE_KEY) !== "on";
    } catch {
      // Private browsing or blocked storage: muted it stays.
    }
  }
  return muted;
}

export function isMuted() {
  return read();
}

export function onMuteChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Flips the mute state. Call only from a click handler. */
export function toggleSound() {
  muted = !read();
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "off" : "on");
  } catch {
    // The choice simply will not survive a reload.
  }
  if (!muted) unlock();
  for (const listener of listeners) listener();
}

/** Opens the audio context. Only ever reachable from the click above. */
function unlock() {
  if (ctx) return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = new Ctor();
}

/** A short burst of filtered noise, one buffer shared by every sound. */
let noiseBuffer: AudioBuffer | null = null;
function getNoise(context: AudioContext) {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
  const length = context.sampleRate * 0.6;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

/**
 * The hero blast: noise swept from a low rumble up through the mids as the
 * product arrives, gone in under half a second.
 */
export function playWhoosh() {
  if (read() || !ctx) return;
  const context = ctx;
  const now = context.currentTime;

  const source = context.createBufferSource();
  source.buffer = getNoise(context);

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(220, now);
  filter.frequency.exponentialRampToValueAtTime(2600, now + 0.32);
  filter.frequency.exponentialRampToValueAtTime(500, now + 0.5);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  source.connect(filter).connect(gain).connect(context.destination);
  source.start(now);
  source.stop(now + 0.6);
}

/** A softer tick, for a section handing over to the next. */
export function playTick() {
  if (read() || !ctx) return;
  const context = ctx;
  const now = context.currentTime;

  const osc = context.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain).connect(context.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}
