/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone',
  serverExternalPackages: [],
  // Modül çözümleme için webpack yapılandırması
  webpack: (config, { isServer }) => {
    // Modül çözümleme için alias'ları ayarla
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
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