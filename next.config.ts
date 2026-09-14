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
