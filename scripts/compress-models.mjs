/**
 * Prepares the raw Sketchfab GLB exports for the web.
 *
 * Source models live in /modeles-3D (gitignored, ~58 MB) and are never served.
 * This writes web-ready copies to /public/models: deduplicated, pruned of unused
 * data, WebP textures, and meshopt-compressed geometry.
 *
 * Quality note: we deliberately stay at `--level medium` for meshopt and
 * quality 92 for WebP. Aggressive settings quantize normals hard enough to
 * facet the curved aluminium chassis, which is exactly the "it looks like a 3D
 * model" tell we are trying to avoid.
 *
 * Usage: node scripts/compress-models.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";

const SRC = "modeles-3D";
const OUT = "public/models";
const TMP = ".model-build";

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const run = (...args) =>
  execFileSync("npx", ["gltf-transform", ...args], { stdio: ["ignore", "pipe", "pipe"] });

const mb = (p) => (statSync(p).size / 1048576).toFixed(2);

const models = readdirSync(SRC).filter((f) => f.endsWith(".glb"));
let before = 0;
let after = 0;

for (const file of models) {
  const src = join(SRC, file);
  const dst = join(OUT, file);
  const a = join(TMP, "a.glb");
  const b = join(TMP, "b.glb");
  const c = join(TMP, "c.glb");

  process.stdout.write(`${file.padEnd(34)} ${mb(src).padStart(6)} MB`);

  run("dedup", src, a);
  run("prune", a, b, "--keep-attributes", "false");
  run("webp", b, c, "--quality", "92");
  run("meshopt", c, dst, "--level", "medium");

  before += statSync(src).size;
  after += statSync(dst).size;
  console.log(`  ->  ${mb(dst).padStart(6)} MB`);
}

rmSync(TMP, { recursive: true, force: true });
console.log(
  `\nTotal ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB ` +
    `(-${Math.round((1 - after / before) * 100)}%)`
);
