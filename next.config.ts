import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["youtube-sr"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
