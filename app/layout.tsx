import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Apple Motion · Every angle, in motion",
  description:
    "Five Apple products, turning under your scroll. An independent showcase of the details most people never notice, and always feel. Not affiliated with Apple Inc.",
};

export const viewport: Viewport = {
  themeColor: "#c9dcee",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
