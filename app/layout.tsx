import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { HERO_PRODUCT } from "@/lib/catalogue";
import "./globals.css";

/**
 * Two cuts of the same superfamily.
 *
 * Inter Tight carries the display type: its narrower apertures and shorter
 * sidebearings are what let a stacked product name hold together as one block
 * at 200px, where regular Inter opens up and drifts apart. Inter itself sets
 * the body, where that openness is an advantage.
 */
const display = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--font-display-family",
  display: "swap",
});

const body = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body-family",
  display: "swap",
});

/**
 * Where the Open Graph and Twitter image tags resolve their `<meta>` URLs
 * against. Vercel sets its own production domain into this env var at build
 * time — there is no other reliable way to know it from inside the build —
 * so this only ever falls back to localhost during local development, never
 * in anything actually deployed.
 */
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Apple Motion · Every angle, in motion",
  description:
    "Five Apple products, turning under your scroll. An independent showcase of the details most people never notice, and always feel. Not affiliated with Apple Inc.",
  // The image itself comes from opengraph-image.png / twitter-image.png —
  // Next.js finds those by file name alone and fills in width, height and
  // type on its own. `card` has no file convention to be inferred from, so
  // it is the one field actually worth stating here.
  twitter: {
    card: "summary_large_image",
  },
  // The whole site is one page — nothing here needs deduplicating against a
  // paginated or parameterised variant of itself — but a search engine still
  // treats the absence of this tag as ambiguity to resolve on its own rather
  // than as "there is only one URL." Stating it removes the guess.
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#c9dcee",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        {/* The loader's whole job is to hold the page until this exact frame
            has arrived. Discoverable straight from the HTML, so the browser
            can start fetching it before any JS has run, rather than waiting
            for the sequence loader to request it itself.

            `as="fetch"` because that is genuinely how it gets requested: the
            sequence loader reads every frame through `fetch()` to control
            decoding itself, not through an `<img>` tag. `as="image"` would
            populate a cache keyed to a request destination this page never
            makes, so the browser would fetch the frame twice: once for the
            unused preload, once for real. `crossOrigin` is required for any
            fetch-destination preload to match, even same-origin. */}
        <link
          rel="preload"
          as="fetch"
          crossOrigin="anonymous"
          href={`/sequences/${HERO_PRODUCT}/000.webp`}
          fetchPriority="high"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
