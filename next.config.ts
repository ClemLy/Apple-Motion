import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The floating dev badge overlaps the bottom-left of every QA screenshot.
  devIndicators: false,
  transpilePackages: ["three"],
  images: {
    // Only the rendered product frames are ever resized by the image service.
    localPatterns: [{ pathname: "/sequences/**", search: "" }],
  },
  experimental: {
    optimizePackageImports: ["@react-three/drei", "gsap"],
  },
  headers: async () => [
    {
      // Baseline hardening for every response. No CSP here: this app relies
      // on inline `style` props throughout (React's own mechanism, not a
      // vulnerability) and Next injects its own inline hydration scripts, so
      // a correct `script-src`/`style-src` policy needs to be built and
      // tested deliberately against the actual production build rather than
      // guessed at here — a wrong one silently breaks the page instead of
      // failing loudly.
      source: "/:path*",
      headers: [
        // Stops a browser from guessing a response's type from its content
        // and executing it as something other than what the server declared.
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Nothing on this site is meant to be framed by another site, and a
        // page that can be iframed is a page that can be clickjacked.
        { key: "X-Frame-Options", value: "DENY" },
        // Sends the full URL to same-origin requests (harmless, and needed
        // for nothing here anyway) but only the origin, not the path, to any
        // other site a visitor clicks through to.
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // None of the browser capabilities this policy can gate — camera,
        // microphone, geolocation and the rest — are used anywhere on the
        // page, so all of them are turned off rather than left to default.
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        },
      ],
    },
    {
      // 3D assets are content-hashed at build time and never mutate in place.
      source: "/models/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      // The rendered frames are the overwhelming majority of every visit's
      // weight — tens of megabytes for a full scroll through the page — and
      // without an explicit policy Next serves them `max-age=0`, so a
      // returning visitor re-downloads every one of them from scratch. They
      // are regenerated in place by the same render script that produced
      // them, so a re-render is the one event that should ever invalidate
      // this: `immutable` is the right trade until this project starts
      // fingerprinting frame filenames.
      source: "/sequences/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
  ],
};

export default nextConfig;
