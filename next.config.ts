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
  ],
};

export default nextConfig;
