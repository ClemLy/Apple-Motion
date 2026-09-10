import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The floating dev badge overlaps the bottom-left of every QA screenshot.
  devIndicators: false,
  transpilePackages: ["three"],
  experimental: {
    optimizePackageImports: ["@react-three/drei", "gsap"],
  },
  headers: async () => [
    {
      // 3D assets are content-hashed at build time and never mutate in place.
      source: "/models/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
  ],
};

export default nextConfig;
