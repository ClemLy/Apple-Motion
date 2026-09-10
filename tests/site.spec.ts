import { test, expect, type Page } from "@playwright/test";

/** Waits for the loading curtain to hand over to the page. */
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForFunction(() => document.querySelector("canvas") !== null, null, {
    timeout: 60_000,
  });
  // The first coarse pass of frames has to arrive before anything is drawn.
  await page.waitForTimeout(4_000);
}

/**
 * Samples the first visible product canvas.
 *
 * A 2D canvas keeps its backing store, so this reads exactly what the visitor
 * sees — no instrumentation, no special build flag. It exists because the
 * failure mode this project actually hit was a page whose DOM assertions all
 * passed while it rendered nothing at all.
 */
async function canvasSample(page: Page) {
  return page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll("canvas"));
    const visible = canvases.find((c) => {
      const box = c.getBoundingClientRect();
      return box.width > 40 && box.bottom > 0 && box.top < window.innerHeight;
    });
    if (!visible) return null;

    const probe = document.createElement("canvas");
    probe.width = 48;
    probe.height = 48;
    const ctx = probe.getContext("2d")!;
    ctx.drawImage(visible, 0, 0, 48, 48);
    const { data } = ctx.getImageData(0, 0, 48, 48);

    let min = 255;
    let max = 0;
    let opaque = 0;
    let signature = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 16) opaque += 1;
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      min = Math.min(min, luma);
      max = Math.max(max, luma);
      signature = (signature + luma * (i + 1)) % 100000;
    }
    return { range: max - min, coverage: opaque / (data.length / 4), signature };
  });
}

test.describe("Apple Motion", () => {
  test("loads, dismisses the loader and draws a product frame", async ({ page }) => {
    await ready(page);

    const frame = await canvasSample(page);
    expect(frame, "no visible product canvas").not.toBeNull();
    // A frame that covers nothing, or is all one tone, means nothing was drawn.
    expect(frame!.coverage).toBeGreaterThan(0.05);
    expect(frame!.range).toBeGreaterThan(15);
  });

  test("scrolling turns the product", async ({ page }) => {
    await ready(page);

    const before = await canvasSample(page);
    await page.evaluate(() => window.scrollTo({ top: 2400, behavior: "instant" }));
    await page.waitForTimeout(2_000);
    const after = await canvasSample(page);

    // The scrub is the whole point of the page: a different scroll position has
    // to put a different frame on the canvas.
    expect(after!.signature).not.toBeCloseTo(before!.signature, 0);
  });

  test("every section takes the stage and keeps drawing", async ({ page }) => {
    await ready(page);

    for (const id of ["iphone", "macbook", "airpods-max", "neo", "airpods-pro"]) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      const box = await section.boundingBox();
      if (box) await page.mouse.wheel(0, box.height / 2);
      // Sequences are fetched per section; give the coarse pass time to land.
      await page.waitForTimeout(3_500);

      await expect(section).toBeVisible();
      const frame = await canvasSample(page);
      expect(frame, `section ${id} has no visible canvas`).not.toBeNull();
      expect(frame!.coverage, `section ${id} drew an empty frame`).toBeGreaterThan(0.03);
    }
  });

  test("switches language without clipping or overflowing any text", async ({ page }) => {
    await ready(page);

    await page.getByRole("button", { name: "fr", exact: true }).click();
    await page.waitForTimeout(1_200);

    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    // Accented characters must survive the round trip through the bundle.
    await expect(page.getByText("mouvement", { exact: false }).first()).toBeAttached();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // French runs ~20% longer than English, so this is where a fixed height or
    // a too-narrow column would show up. Reveal masks and visually hidden text
    // are excluded: clipping is their purpose.
    const clipped = await page.evaluate(() => {
      const offenders: string[] = [];
      for (const el of document.querySelectorAll("h1, h2, p, dd, dt, span, a, button")) {
        // Reveal masks clip on purpose — that is what makes a line rise into
        // view — and visually hidden text is clipped to a 1px box by design.
        if (el.closest("[data-reveal-mask]")) continue;
        if (el.clientWidth <= 1 || el.clientHeight <= 1) continue;
        const style = getComputedStyle(el);
        if (style.overflow === "visible" || style.display === "none") continue;
        if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
          offenders.push(`${el.tagName}: ${el.textContent?.slice(0, 40)}`);
        }
      }
      return offenders;
    });
    expect(clipped).toEqual([]);
  });

  test("the room changes colour as products take over", async ({ page }) => {
    await ready(page);

    const roomAt = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
      );

    const first = await roomAt();
    await page.locator("#airpods-pro").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2_000);
    const last = await roomAt();

    expect(first).not.toBe("");
    expect(last).not.toBe(first);
  });

  test("exposes a skip link and a labelled language control", async ({ page }) => {
    await ready(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /skip to content/i })).toBeFocused();
    await expect(page.getByRole("group", { name: /change language/i })).toBeVisible();
  });
});
