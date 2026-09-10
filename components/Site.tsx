"use client";

import { I18nProvider, useI18n } from "@/lib/i18n/context";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Nav } from "@/components/ui/Nav";
import { Preloader } from "@/components/ui/Preloader";
import { ProgressRail } from "@/components/ui/ProgressRail";
import { Hero, HERO_RANGE } from "@/components/sections/Hero";
import { ProductSection } from "@/components/sections/ProductSection";
import { Footer } from "@/components/sections/Footer";
import { CATALOGUE } from "@/lib/catalogue";

function Page() {
  useI18n();

  return (
    <>
      <Preloader />
      <Nav />
      <ProgressRail />

      <main id="main" className="relative">
        <Hero />

        {CATALOGUE.map((entry, i) => (
          <ProductSection
            key={entry.id}
            entry={entry}
            // The first section picks the rotation up exactly where the hero
            // left it, so the product never jumps at the handover.
            range={i === 0 ? [HERO_RANGE[1], 1] : [0, 1]}
          />
        ))}

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
