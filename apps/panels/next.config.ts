import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.85', '192.168.56.1'],
  transpilePackages: ["@lomasrico/shared-types"],
  async rewrites() {
    return [
      { source: '/backend/:path*', destination: 'http://127.0.0.1:3001/:path*' },
    ];
  },
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
