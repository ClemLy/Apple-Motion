/**
 * Where a frame's product actually stands.
 *
 * The frames carry a soft pool of shadow rendered with them, but it is the same
 * pool in every frame: it does not narrow when a laptop turns side-on or tighten
 * when a phone rocks down toward the ground. To draw a shadow that does, the
 * player needs to know, per frame, how wide the object is, where its lowest
 * point sits, and where the ground is.
 *
 * Measured once per decoded frame on a tiny copy, and cached against the bitmap
 * itself so the measurement disappears with the frame when it is released.
 */
export type Footprint = {
  /** Horizontal extent of the solid object, 0-1 across the frame. */
  left: number;
  right: number;
  /** The object's lowest solid row, 0-1 down the frame. */
  bottom: number;
  /** The row where the rendered ground shadow is densest, 0-1 down the frame. */
  ground: number;
};

const cache = new WeakMap<ImageBitmap, Footprint>();
let probe: CanvasRenderingContext2D | null = null;

const WIDTH = 72;
/** The rendered shadow never exceeds ~0.46 alpha; anything above this is object. */
const SOLID = 170;
const SHADOW = 130;

export function footprintOf(bitmap: ImageBitmap): Footprint | null {
  const known = cache.get(bitmap);
  if (known) return known;

  if (!probe) {
    const canvas = document.createElement("canvas");
    probe = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!probe) return null;

  const width = WIDTH;
  const height = Math.max(8, Math.round((WIDTH * bitmap.height) / bitmap.width));
  probe.canvas.width = width;
  probe.canvas.height = height;
  probe.clearRect(0, 0, width, height);
  probe.drawImage(bitmap, 0, 0, width, height);
  const { data } = probe.getImageData(0, 0, width, height);

  let left = width;
  let right = -1;
  let bottom = -1;
  const shade = new Float32Array(height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha >= SOLID) {
        if (x < left) left = x;
        if (x > right) right = x;
        bottom = y;
      } else if (alpha > 4 && alpha < SHADOW) {
        shade[y] += alpha;
      }
    }
  }

  if (right < 0) return null;

  // The ground is the densest band of shadow at or below the object's base.
  let ground = bottom;
  let densest = 0;
  for (let y = Math.max(0, bottom - 2); y < height; y += 1) {
    if (shade[y] > densest) {
      densest = shade[y];
      ground = y;
    }
  }

  const footprint: Footprint = {
    left: left / width,
    right: (right + 1) / width,
    bottom: (bottom + 1) / height,
    ground: (ground + 0.5) / height,
  };
  cache.set(bitmap, footprint);
  return footprint;
}
