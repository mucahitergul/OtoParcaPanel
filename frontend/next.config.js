/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  /* config options here */
  output: 'standalone',
  serverExternalPackages: [],
  // Modül çözümleme için webpack yapılandırması
  webpack: (config, { isServer }) => {
    // Linux uyumlu path çözümlemesi için
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.posix.resolve(__dirname.replace(/\\/g, '/'), './src'),
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/suppliers/basbuğ',
        destination: '/suppliers/basbuğ',
      },
    ];
  },
};

module.exports = nextConfig;