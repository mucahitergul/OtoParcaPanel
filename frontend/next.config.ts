import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  serverExternalPackages: [],
  async rewrites() {
    return [
      {
        source: '/suppliers/basbuğ',
        destination: '/suppliers/basbuğ',
      },
    ];
  },
};

export default nextConfig;
