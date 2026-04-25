import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lomasrico/shared-types"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000' },
      { protocol: 'https', hostname: '**.onrender.com' },
      { protocol: 'https', hostname: '**.render.com' },
      // Supabase Storage (banners, product images, etc.)
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
    unoptimized: true,
  }
};

export default nextConfig;
