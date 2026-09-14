import type { MetadataRoute } from "next";

const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The render pipeline's own harness — a blank canvas driven by query
      // parameters, built for a headless browser to screenshot offline. It
      // has nothing a visitor or a search index would want.
      disallow: "/render",
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
