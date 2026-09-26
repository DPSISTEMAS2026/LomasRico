import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.85', '192.168.56.1', '127.0.0.1', 'localhost'],
  async rewrites() {
    return [
      { source: '/backend/:path*', destination: 'http://127.0.0.1:3001/:path*' },
    ];
  },
  transpilePackages: ["@lomasrico/shared-types"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
