/**
 * Visual QA harness.
 *
 * Boots headless Chromium against the dev server, waits for the WebGL scene to
 * actually converge (not just for the network to go quiet — the environment map
 * bakes a frame after the model resolves), and writes PNGs to /qa-shots.
 *
 * Usage:
 *   node scripts/shoot.mjs "name=/lab?product=iphone&tone=agx" ...
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "qa-shots";
const SIZE = { width: 1600, height: 1000 };

mkdirSync(OUT, { recursive: true });

const targets = process.argv.slice(2).map((arg) => {
  const at = arg.indexOf("=");
  return { name: arg.slice(0, at), path: arg.slice(at + 1) };
});

const browser = await chromium.launch({
  args: [
    "--use-angle=metal",
    "--ignore-gpu-blocklist",
    "--enable-gpu-rasterization",
    "--enable-unsafe-swiftshader",
  ],
});

const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 2 });

page.on("pageerror", (e) => console.error("  page error:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.error("  console:", m.text());
});

for (const { name, path } of targets) {
  const target = new URL(BASE + path);
  const width = Number(target.searchParams.get("_w") ?? SIZE.width);
  const height = Number(target.searchParams.get("_h") ?? SIZE.height);
  await page.setViewportSize({ width, height });

  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60_000 });

  // Wait for the canvas to exist, then settle. The player draws the nearest
  // frame it has and refines as more arrive, so a fixed pause is what actually
  // decides whether the shot catches a coarse frame or a final one.
  await page.waitForFunction(() => document.querySelector("canvas") !== null, null, {
    timeout: 60_000,
    polling: 250,
  });

  // The loading curtain runs on its own timeline after the scene converges, so
  // settling the canvas is not the same as the page being ready to photograph.
  await page.waitForTimeout(2600);

  const params = target.searchParams;

  if (params.get("_lang") === "fr") {
    await page.getByRole("button", { name: "fr", exact: true }).click();
    await page.waitForTimeout(900);
  }

  const scrollTo = Number(params.get("_scroll") ?? 0);
  if (scrollTo > 0) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), scrollTo);
    await page.waitForTimeout(1400);
  }

  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${name}`);
}

await browser.close();
