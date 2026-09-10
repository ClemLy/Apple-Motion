/**
 * Shoots the product image sequences.
 *
 * Drives /render in a real browser one frame at a time, screenshots the canvas
 * with a transparent background, then crops every frame of a product to one
 * shared bounding box and writes WebP.
 *
 * The shared crop matters: trimming each frame to its own content would make
 * the product breathe in and out as it rotates, because the silhouette's extent
 * changes frame to frame. One box for the whole sequence keeps it locked.
 *
 * Usage:
 *   node scripts/render-sequences.mjs               # every product
 *   node scripts/render-sequences.mjs iphone        # one product
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_ROOT = "public/sequences";
const TMP = ".sequence-build";

/** Canvas size to render at, before cropping. */
const RENDER_SIZE = 1500;
/** Longest edge of the delivered frames. Displayed at roughly half this. */
const OUTPUT_MAX = 1000;
/** Transparent margin kept around the product, as a fraction of the crop. */
const PADDING = 0.03;
const WEBP_QUALITY = 74;
/** Alpha here is essentially a silhouette mask plus a soft shadow ramp; it does
 *  carries the shadow's entire falloff, so quantising it hard is what turns a
 *  smooth pool into visible concentric rings. */
const ALPHA_QUALITY = 82;

const PRODUCTS = ["iphone", "macbook-m5", "airpods-max", "macbook-neo", "airpods-pro"];

/** Products that need a delivered size other than the default. */
const perProductOutput = { "airpods-max": 840 };
const only = process.argv.slice(2);
const targets = only.length > 0 ? PRODUCTS.filter((p) => only.includes(p)) : PRODUCTS;

/** Alpha bounding box of a PNG, measured on a downscaled copy for speed. */
async function alphaBounds(buffer, probe = 300) {
  const { data, info } = await sharp(buffer)
    .resize(probe, probe, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      // Ignore all-but-invisible pixels: the shadow fades to nothing and would
      // otherwise drag the box out to the full frame.
      if (data[(y * info.width + x) * info.channels + 3] < 8) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  const scale = 1 / probe;
  return { left: minX * scale, top: minY * scale, right: (maxX + 1) * scale, bottom: (maxY + 1) * scale };
}

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});

console.log(`Rendering at ${RENDER_SIZE}px, delivering at ${OUTPUT_MAX}px\n`);

for (const product of targets) {
  const tmp = join(TMP, product);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const page = await browser.newPage({
    viewport: { width: RENDER_SIZE, height: RENDER_SIZE },
  });
  page.on("pageerror", (e) => console.error("  page error:", e.message));

  await page.goto(`${BASE}/render?product=${product}&size=${RENDER_SIZE}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForFunction(() => window.__sequenceReady === true, null, { timeout: 120_000 });

  const frames = await page.evaluate(() => window.__frameCount ?? 0);
  const canvas = page.locator("canvas");

  process.stdout.write(`${product.padEnd(14)} shooting ${frames} frames`);

  // The environment map bakes one frame after the model resolves.
  await page.evaluate(() => window.__seek?.(0));
  await page.waitForTimeout(600);

  for (let i = 0; i < frames; i += 1) {
    await page.evaluate((frame) => window.__seek?.(frame), i);
    const shot = await canvas.screenshot({ omitBackground: true, type: "png" });
    writeFileSync(join(tmp, `${String(i).padStart(3, "0")}.png`), shot);
    if (i % 15 === 0) process.stdout.write(".");
  }
  await page.close();

  // One crop box for the whole sequence, from the union of every frame's extent.
  const files = readdirSync(tmp).sort();
  const box = { left: 1, top: 1, right: 0, bottom: 0 };
  for (const file of files) {
    const bounds = await alphaBounds(readFileSync(join(tmp, file)));
    if (!bounds) continue;
    box.left = Math.min(box.left, bounds.left);
    box.top = Math.min(box.top, bounds.top);
    box.right = Math.max(box.right, bounds.right);
    box.bottom = Math.max(box.bottom, bounds.bottom);
  }

  const pad = PADDING;
  const left = Math.max(0, box.left - pad);
  const top = Math.max(0, box.top - pad);
  const right = Math.min(1, box.right + pad);
  const bottom = Math.min(1, box.bottom + pad);

  const crop = {
    left: Math.round(left * RENDER_SIZE),
    top: Math.round(top * RENDER_SIZE),
    width: Math.max(1, Math.round((right - left) * RENDER_SIZE)),
    height: Math.max(1, Math.round((bottom - top) * RENDER_SIZE)),
  };

  const out = join(OUT_ROOT, product);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const longest = Math.max(crop.width, crop.height);
  const target = perProductOutput[product] ?? OUTPUT_MAX;
  const scale = Math.min(1, target / longest);

  let bytes = 0;
  for (const file of files) {
    const name = file.replace(/\.png$/, ".webp");
    const buffer = await sharp(readFileSync(join(tmp, file)))
      .extract(crop)
      .resize(Math.round(crop.width * scale), Math.round(crop.height * scale))
      .webp({ quality: WEBP_QUALITY, alphaQuality: ALPHA_QUALITY, effort: 6 })
      .toBuffer();
    writeFileSync(join(out, name), buffer);
    bytes += buffer.length;
  }

  const aspect = crop.width / crop.height;
  writeFileSync(
    join(out, "manifest.json"),
    JSON.stringify(
      {
        product,
        frames,
        width: Math.round(crop.width * scale),
        height: Math.round(crop.height * scale),
        aspect: Number(aspect.toFixed(4)),
      },
      null,
      2
    )
  );

  console.log(
    ` -> ${(bytes / 1048576).toFixed(2)} MB (${Math.round(bytes / frames / 1024)} KB/frame)`
  );
  rmSync(tmp, { recursive: true, force: true });
}

rmSync(TMP, { recursive: true, force: true });
await browser.close();

const total = readdirSync(OUT_ROOT).reduce((sum, dir) => {
  const d = join(OUT_ROOT, dir);
  if (!statSync(d).isDirectory()) return sum;
  return sum + readdirSync(d).reduce((s, f) => s + statSync(join(d, f)).size, 0);
}, 0);
console.log(`\nTotal sequences: ${(total / 1048576).toFixed(1)} MB`);
