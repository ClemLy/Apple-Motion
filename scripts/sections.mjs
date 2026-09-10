import { chromium } from "@playwright/test";
const w = Number(process.argv[2] ?? 1600);
const h = Number(process.argv[3] ?? 1000);
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
console.log(
  await page.evaluate(() => {
    const rows = [["top", 0]];
    for (const id of ["iphone", "macbook", "airpods-max", "neo", "airpods-pro", "footer"]) {
      const el = document.getElementById(id);
      if (el) rows.push([id, Math.round(el.getBoundingClientRect().top + window.scrollY)]);
    }
    rows.push(["document", document.body.scrollHeight]);
    return rows.map(([k, v]) => `${String(k).padEnd(12)} ${v}`).join("\n");
  })
);
await browser.close();
