import type { MetadataRoute } from "next";

/**
 * Same resolution as `layout.tsx`'s `metadataBase`: Vercel's own env var in
 * production, localhost everywhere else. Kept separate rather than imported
 * from there — this file has to stay a plain, dependency-free module so it
 * can run at the edge without pulling in the client component tree.
 */
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

/**
 * One page. Everything on it — the products, the line-up, the manifesto —
 * lives at anchors on that single page rather than at their own routes, so
 * there is nothing else here to list.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
