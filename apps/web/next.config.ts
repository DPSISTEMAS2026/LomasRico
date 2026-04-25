import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lomasrico/shared-types"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
