"use client";

import dynamic from "next/dynamic";
import { I18nProvider, useI18n } from "@/lib/i18n/context";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Nav } from "@/components/ui/Nav";
import { Preloader } from "@/components/ui/Preloader";
import { ProgressRail } from "@/components/ui/ProgressRail";
import { Cursor } from "@/components/ui/Cursor";
import { Vignette } from "@/components/ui/Vignette";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { Hero } from "@/components/sections/Hero";
import { ProductSection } from "@/components/sections/ProductSection";
import { CATALOGUE } from "@/lib/catalogue";

/**
 * Everything below the five product sections, split into its own bundle.
 *
 * None of it is interactive until a visitor has scrolled most of the way
 * down the page, so none of it needs to be in the JavaScript the browser
 * parses to make the hero and the first product interactive. `ssr: false`
 * keeps Next.js from paying to render motion-only markup on the server that
 * would just be replaced the moment GSAP takes over on the client.
 *
 * Deliberately not gated behind an `IntersectionObserver` as well: that
 * version deferred mounting until a visitor had nearly scrolled to each
 * section, and a `#lineup`, `#story` or `#footer` link — this page's own
 * "back to top" aside, a screen reader's landmark list, a browser restoring
 * a scroll position — has no way to bring an element that does not exist yet
 * into view. Code-splitting the bundle is the win worth having; making three
 * fragments of the page unreachable until scrolled to by hand is not.
 */
const Lineup = dynamic(() => import("@/components/sections/Lineup").then((m) => m.Lineup), {
  ssr: false,
});
const Story = dynamic(() => import("@/components/sections/Story").then((m) => m.Story), {
  ssr: false,
});
const Footer = dynamic(() => import("@/components/sections/Footer").then((m) => m.Footer), {
  ssr: false,
});

function Page() {
  useI18n();

  return (
    <>
      <Preloader />
      <Nav />
      <ProgressRail />
      <Cursor />
      <Vignette />
      <CommandPalette />

      {/* `tabIndex={-1}` is what makes the header's skip link actually skip
          anything: without it, a fragment jump to `#main` scrolls the page
          but leaves focus on `<body>`, so the very next Tab press re-enters
          the page at the start of the DOM — through the header again — which
          is the one thing a skip link exists to avoid. `outline-none` because
          the target is a full-page landmark, not a control; the visible
          focus ring lands on whatever real control the visitor reaches next. */}
      <main id="main" tabIndex={-1} className="relative outline-none">
        <Hero />

        {/* Every section now plays its product's full revolution. The hero
            opens on a product from the middle of the running order, so there is
            no rotation left mid-turn for the first section to pick up. */}
        {CATALOGUE.map((entry) => (
          <ProductSection key={entry.id} entry={entry} />
        ))}

        <Lineup />
        <Story />
        <Footer />
      </main>
    </>
  );
}

export function Site() {
  return (
    <I18nProvider>
      <SmoothScroll>
        <Page />
      </SmoothScroll>
    </I18nProvider>
  );
}
