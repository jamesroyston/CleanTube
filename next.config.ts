import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  globPublicPatterns: [
    "**/*.{png,webmanifest,ico,jpg,jpeg,webp}",
    "!**/{file,globe,next,vercel,window}.svg",
  ],
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ["youtubei.js"],
  images: {
    // Disable Next.js Image Optimization API so Vercel does not bill image cache usage.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default withSerwist(nextConfig);
