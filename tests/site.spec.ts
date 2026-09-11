import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Waits for the loading curtain to hand over to the page. */
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForFunction(() => document.querySelector("canvas") !== null, null, {
    timeout: 60_000,
  });
  // The loader covers the whole page, pointer included, until it lifts.
  await expect(page.getByRole("status")).toBeHidden({ timeout: 60_000 });
  // The first coarse pass of frames has to arrive before anything is drawn.
  await page.waitForTimeout(4_000);
}

/** Scrolls a section's stage into its held phase. */
async function visit(page: Page, id: string) {
  await page.locator(`#${id}`).evaluate((element) => {
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY + window.innerHeight * 1.5,
      behavior: "instant",
    });
  });
  await page.waitForTimeout(3_500);
}

/** Whether a product section's own canvas is showing frames or still waiting. */
function stageState(page: Page, id: string) {
  return page.evaluate(
    (anchor) =>
      document
        .querySelector(`#${anchor} [data-copy-column]`)
        ?.parentElement?.querySelector("canvas")?.dataset.state ?? null,
    id
  );
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

/**
 * Scrolls to a fraction of the way down the page and lets the scrub catch up.
 *
 * Nothing is sampled at scroll zero any more: the hero deliberately opens on
 * type alone and throws the product in from almost nothing, so the opening
 * frame has no product on it by design.
 */
async function scrollTo(page: Page, fraction: number) {
  await page.evaluate((f) => {
    window.scrollTo({ top: window.innerHeight * f, behavior: "instant" });
  }, fraction);
  await page.waitForTimeout(1_800);
}

test.describe("Apple Motion", () => {
  test("loads, dismisses the loader and draws a product frame", async ({ page }) => {
    await ready(page);
    await scrollTo(page, 1.4);

    const frame = await canvasSample(page);
    expect(frame, "no visible product canvas").not.toBeNull();
    // A frame that covers nothing, or is all one tone, means nothing was drawn.
    expect(frame!.coverage).toBeGreaterThan(0.05);
    expect(frame!.range).toBeGreaterThan(15);
  });

  test("scrolling turns the product", async ({ page }) => {
    await ready(page);

    // Both samples are taken after the hero has thrown the product into frame,
    // so the comparison is between two rotations rather than between an empty
    // stage and a full one.
    await scrollTo(page, 1.4);
    const before = await canvasSample(page);
    await scrollTo(page, 2.6);
    const after = await canvasSample(page);

    expect(before, "no product drawn at the first sample").not.toBeNull();
    expect(after, "no product drawn at the second sample").not.toBeNull();

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

    // Two failures the check above cannot see, because nothing clips them: a
    // spec value squeezed beside a long label spilling past its row, and the
    // giant word behind a product running off the top or bottom of the frame.
    const spilled = await page.evaluate(() => {
      const offenders: string[] = [];
      const inside = (inner: DOMRect, outer: DOMRect) =>
        inner.left >= outer.left - 1 &&
        inner.right <= outer.right + 1 &&
        inner.top >= outer.top - 1 &&
        inner.bottom <= outer.bottom + 1;

      for (const value of document.querySelectorAll("dd")) {
        const row = value.parentElement;
        if (row && !inside(value.getBoundingClientRect(), row.getBoundingClientRect())) {
          offenders.push(`dd: ${value.textContent}`);
        }
      }
      for (const word of document.querySelectorAll<HTMLElement>("[data-feature-word]")) {
        const stage = word.closest<HTMLElement>(".sticky");
        // Not rendered on narrow screens.
        if (!stage || word.offsetParent === null) continue;
        if (!inside(word.getBoundingClientRect(), stage.getBoundingClientRect())) {
          offenders.push(`word: ${word.textContent}`);
        }
      }
      return offenders;
    });
    expect(spilled).toEqual([]);
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

  test("downloads only the opening product before the visitor scrolls", async ({ page }) => {
    const requested = new Set<string>();
    page.on("request", (request) => {
      const match = request.url().match(/\/sequences\/([^/]+)\/\d+\.webp/);
      if (match) requested.add(match[1]);
    });

    await ready(page);

    // All five sequences together are around 24 MB. The page once fetched every
    // one of them in its first second because each player loaded on mount.
    expect([...requested]).toEqual(["airpods-max"]);
  });

  test("a section left behind redraws when the visitor comes back", async ({ page }) => {
    await ready(page);

    await visit(page, "iphone");
    await expect.poll(() => stageState(page, "iphone"), { timeout: 20_000 }).toBe("frame");

    // Far enough away that the iPhone's frames are handed back to the browser.
    await visit(page, "airpods-pro");
    await visit(page, "iphone");

    await expect.poll(() => stageState(page, "iphone"), { timeout: 20_000 }).toBe("frame");
  });

  test("the line-up leads back to each product", async ({ page }) => {
    await ready(page);

    const card = page.locator('#lineup a[href="#macbook"]');
    await card.scrollIntoViewIfNeeded();
    await card.focus();
    await page.keyboard.press("Enter");

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const box = document.getElementById("macbook")!.getBoundingClientRect();
            return box.top <= window.innerHeight && box.bottom >= 0;
          }),
        { timeout: 10_000 }
      )
      .toBe(true);
  });

  test("the cursor answers the product and the controls", async ({ page, isMobile }) => {
    test.skip(isMobile, "There is no pointer to replace on a touch screen.");
    await ready(page);
    await scrollTo(page, 1.4);

    const ring = page.locator(".cursor-ring");
    const product = await page.locator('#top canvas[data-cursor="product"]').boundingBox();
    expect(product, "the hero product is not on screen").not.toBeNull();

    await page.mouse.move(product!.x + product!.width / 2, product!.y + product!.height / 2);
    await expect(ring).toHaveAttribute("data-state", "product");

    const control = await page.getByRole("button", { name: "fr", exact: true }).boundingBox();
    await page.mouse.move(control!.x + control!.width / 2, control!.y + control!.height / 2);
    await expect(ring).toHaveAttribute("data-state", "link");
  });

  test("meets WCAG AA at the opening and at the sign-off", async ({ page }) => {
    await ready(page);

    const audit = async () =>
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations.map((violation) => `${violation.id} (${violation.nodes.length})`);

    expect(await audit()).toEqual([]);

    await page.locator("#footer").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2_500);
    expect(await audit()).toEqual([]);
  });

  test("exposes a skip link and a labelled language control", async ({ page }) => {
    await ready(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /skip to content/i })).toBeFocused();
    await expect(page.getByRole("group", { name: /change language/i })).toBeVisible();
  });
});
