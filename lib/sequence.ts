import type { ProductId } from "./products";

export type SequenceManifest = {
  product: string;
  frames: number;
  width: number;
  height: number;
  aspect: number;
};

/**
 * Loads and holds one product's image sequence.
 *
 * Two things drive the design:
 *
 * 1. **Progressive passes.** Frames arrive in strides — every eighth, then
 *    every fourth, then the rest — and the player draws the nearest frame it
 *    already has. Scrubbing is usable after about a dozen frames instead of
 *    after all ninety, which is the difference between a section that responds
 *    immediately and one that shows a blank box while it downloads.
 *
 * 2. **ImageBitmap, not Image.** A decoded 1080x1080 frame is 4.6 MB of memory;
 *    ninety of them is 420 MB, and five products at once would exhaust a phone.
 *    `ImageBitmap` can be released deterministically with `close()`, so a
 *    sequence that scrolls out of range hands its memory straight back instead
 *    of waiting on garbage collection.
 */
export class Sequence {
  readonly product: ProductId;
  manifest: SequenceManifest | null = null;
  frames: (ImageBitmap | null)[] = [];

  /** 0-1, how much of the sequence has arrived. */
  loaded = 0;
  private loadedCount = 0;
  private started = false;
  private aborted = false;
  private listeners = new Set<() => void>();

  constructor(product: ProductId) {
    this.product = product;
  }

  onProgress(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  /** The frame nearest to `index` that has actually arrived. */
  nearest(index: number): ImageBitmap | null {
    const frames = this.frames;
    if (frames.length === 0) return null;

    const clamped = Math.max(0, Math.min(frames.length - 1, Math.round(index)));
    if (frames[clamped]) return frames[clamped];

    for (let offset = 1; offset < frames.length; offset += 1) {
      const before = frames[clamped - offset];
      if (before) return before;
      const after = frames[clamped + offset];
      if (after) return after;
    }
    return null;
  }

  async load() {
    if (this.started) return;
    this.started = true;
    this.aborted = false;

    const base = `/sequences/${this.product}`;
    const response = await fetch(`${base}/manifest.json`);
    if (!response.ok) throw new Error(`No sequence for ${this.product}`);

    this.manifest = (await response.json()) as SequenceManifest;
    this.frames = new Array(this.manifest.frames).fill(null);
    this.notify();

    const total = this.manifest.frames;
    const order: number[] = [];
    const seen = new Set<number>();
    // Coarse to fine, so the first usable pass lands quickly.
    for (const stride of [8, 4, 2, 1]) {
      for (let i = 0; i < total; i += stride) {
        if (seen.has(i)) continue;
        seen.add(i);
        order.push(i);
      }
    }

    // Six at a time: enough to saturate a connection, few enough that the
    // decode work never blocks a scroll frame for long.
    const CONCURRENCY = 6;
    let cursor = 0;

    const worker = async () => {
      while (cursor < order.length && !this.aborted) {
        const index = order[cursor];
        cursor += 1;
        try {
          const file = `${base}/${String(index).padStart(3, "0")}.webp`;
          const blob = await (await fetch(file)).blob();
          if (this.aborted) return;
          this.frames[index] = await createImageBitmap(blob);
          this.loadedCount += 1;
          this.loaded = this.loadedCount / total;
          this.notify();
        } catch {
          // A dropped frame is survivable: `nearest` falls back to a neighbour.
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  /** Hands every decoded frame back to the browser. */
  release() {
    this.aborted = true;
    this.started = false;
    for (const frame of this.frames) frame?.close();
    this.frames = this.manifest ? new Array(this.manifest.frames).fill(null) : [];
    this.loadedCount = 0;
    this.loaded = 0;
    this.notify();
  }
}

const cache = new Map<ProductId, Sequence>();

export function getSequence(product: ProductId) {
  let sequence = cache.get(product);
  if (!sequence) {
    sequence = new Sequence(product);
    cache.set(product, sequence);
  }
  return sequence;
}

/**
 * Keeps memory bounded to the sequences actually in play.
 *
 * Called as sections come into range: anything outside the window hands its
 * decoded frames back. Without this, scrolling the whole page once would leave
 * five fully decoded sequences resident at the same time.
 */
export function retainOnly(keep: ProductId[]) {
  for (const [id, sequence] of cache) {
    if (!keep.includes(id)) sequence.release();
  }
}
