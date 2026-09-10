/**
 * Fails the build if the site outgrows its download budget.
 *
 * Two separate things are measured, because only one of them is downloaded by a
 * visitor:
 *
 *   public/sequences — the image sequences. This *is* the site's payload, and
 *     it is what decides whether the page is pleasant on a phone. Only one
 *     product's sequence is fetched at a time, so the per-product figure is the
 *     one that governs the experience; the total governs the CDN bill.
 *
 *   public/models — the compressed glTF, kept only so `render-sequences.mjs`
 *     can regenerate the frames from a clean clone. Never requested by the
 *     site itself, so it is reported rather than enforced.
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const SEQ_DIR = "public/sequences";
const MODEL_DIR = "public/models";

// Sized against what a visitor actually waits for. Only one product is fetched
// at a time and the coarse pass — about an eighth of a sequence — is enough to
// scrub, so the felt cost of a 5 MB section is closer to 600 KB.
const PER_PRODUCT_MB = 7;
const TOTAL_MB = 24;

const mb = (bytes) => bytes / 1048576;
const dirSize = (dir) =>
  readdirSync(dir).reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);

if (!existsSync(SEQ_DIR)) {
  console.error(`No sequences in ${SEQ_DIR}. Run: node scripts/render-sequences.mjs`);
  process.exit(1);
}

let failed = false;
let total = 0;

console.log("Sequences (downloaded, one product at a time)\n");
for (const product of readdirSync(SEQ_DIR)) {
  const dir = join(SEQ_DIR, product);
  if (!statSync(dir).isDirectory()) continue;

  const frames = readdirSync(dir).filter((f) => f.endsWith(".webp")).length;
  if (frames === 0) {
    console.error(`FAIL  ${product}: no frames`);
    failed = true;
    continue;
  }

  const size = mb(dirSize(dir));
  total += size;
  const over = size > PER_PRODUCT_MB;
  failed ||= over;
  console.log(
    `${over ? "FAIL" : "ok  "}  ${product.padEnd(14)} ${frames} frames  ` +
      `${size.toFixed(2)} MB  (${Math.round((size * 1024) / frames)} KB/frame)`
  );
}

console.log(`\n${total.toFixed(2)} MB total (budget ${TOTAL_MB} MB)`);
if (total > TOTAL_MB) {
  console.error(`Total sequence payload exceeds ${TOTAL_MB} MB.`);
  failed = true;
}

if (existsSync(MODEL_DIR)) {
  console.log(
    `\nSource models: ${mb(dirSize(MODEL_DIR)).toFixed(2)} MB ` +
      `(build-time only, never requested by the site)`
  );
}

process.exit(failed ? 1 : 0);
