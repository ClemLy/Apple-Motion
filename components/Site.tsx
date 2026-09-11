"use client";

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
import { Lineup } from "@/components/sections/Lineup";
import { Story } from "@/components/sections/Story";
import { Footer } from "@/components/sections/Footer";
import { CATALOGUE } from "@/lib/catalogue";

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

      <main id="main" className="relative">
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
