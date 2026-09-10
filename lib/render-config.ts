/**
 * Offline render choreography.
 *
 * Used only by /render and scripts/render-sequences.mjs — never shipped to the
 * browser at runtime. Each entry describes the camera, the framing and what the
 * product does across one full sequence, as a pure function of `t` (0 to 1).
 *
 * The runtime only ever needs to know how many frames exist.
 */
import type { ProductId } from "./products";

export type RenderPose = {
  /** Y rotation in degrees, added to the model's measured `front`. */
  ry: number;
  /** X tilt in degrees. */
  rx: number;
  /** 0 = shut, 1 = as authored. Clamshells only. */
  lid: number;
  /** Seconds into the model's animation clip. */
  clip: number;
};

export type RenderShot = {
  frames: number;
  /** Camera distance on Z. */
  distance: number;
  fov: number;
  /** Largest dimension of the normalized model, in scene units. */
  size: number;
  /** Vertical offset applied to the model, to centre it optically. */
  lift: number;
  /** Longest edge of the delivered frames, when this product needs its own.
   *  The AirPods Max canopy is knitted mesh: at 1000px the encoder is paying
   *  to preserve individual threads that are invisible at display size, and it
   *  costs twice what any other product does. */
  output?: number;
  pose: (t: number) => RenderPose;
};

const rest: RenderPose = { ry: 0, rx: 0, lid: 1, clip: 0 };

/** Smoothstep between two points of the timeline. */
const ramp = (t: number, from: number, to: number) => {
  const x = Math.min(1, Math.max(0, (t - from) / (to - from)));
  return x * x * (3 - 2 * x);
};

/**
 * 180 frames, which is two degrees of rotation per frame.
 *
 * Ninety frames means four degrees a frame, and on an object filling two thirds
 * of the viewport that step is visible as judder when you scrub slowly — the
 * scroll is smooth but the product is not. Doubling the count halves the step
 * and is the only thing that actually fixes it; there is nothing to interpolate
 * between two photographs of a rotating object.
 */
const FRAMES = 180;

export const SHOTS: Record<ProductId, RenderShot> = {
  // A clean full revolution, starting and ending face-on so the loop is seamless.
  iphone: {
    frames: FRAMES,
    distance: 9,
    fov: 26,
    size: 3.05,
    lift: 0,
    pose: (t) => ({ ...rest, ry: t * 360, rx: -3 + Math.sin(t * Math.PI * 2) * 3 }),
  },

  // Opens, then turns to show how little there is of it.
  //
  // The lid never travels below 0.34. Fully shut, seen from the high angle this
  // shot starts on, the machine reads as a flat slab with a black bar behind it
  // rather than as a closed laptop — the hinge is doing its job and the picture
  // is still wrong. Starting part-open keeps the silhouette legible on frame
  // one, which is the frame most visitors actually see.
  "macbook-m5": {
    frames: FRAMES,
    distance: 9,
    fov: 26,
    size: 3.3,
    lift: -0.15,
    pose: (t) => ({
      ...rest,
      lid: 0.34 + ramp(t, 0.02, 0.42) * 0.66,
      ry: -30 + ramp(t, 0.28, 1) * 350,
      rx: 9 - ramp(t, 0.02, 0.42) * 5,
    }),
  },

  // The canopy and the cups read best in profile, so the revolution starts there.
  "airpods-max": {
    frames: FRAMES,
    distance: 9,
    fov: 26,
    size: 3.0,
    lift: 0,
    output: 840,
    pose: (t) => ({ ...rest, ry: t * 360, rx: -2 + Math.sin(t * Math.PI * 2) * 4 }),
  },

  // Stays open throughout: the point of this one is the profile, not the hinge.
  "macbook-neo": {
    frames: FRAMES,
    distance: 9,
    fov: 26,
    size: 3.3,
    lift: -0.1,
    pose: (t) => ({ ...rest, ry: -20 + t * 360, rx: 10 - ramp(t, 0, 1) * 4 }),
  },

  // The case opens and the earbuds rise, then the whole thing turns.
  "airpods-pro": {
    frames: FRAMES,
    distance: 9,
    fov: 26,
    size: 2.35,
    lift: -0.1,
    pose: (t) => ({
      ...rest,
      // Only the opening half of the clip: it loops back to shut after 2.7s.
      clip: ramp(t, 0.02, 0.42) * 1.65,
      ry: -24 + ramp(t, 0.34, 1) * 350,
      rx: 10 - ramp(t, 0.02, 0.42) * 8,
    }),
  },
};

export const SEQUENCE_FRAMES: Record<ProductId, number> = Object.fromEntries(
  Object.entries(SHOTS).map(([id, shot]) => [id, shot.frames])
) as Record<ProductId, number>;
