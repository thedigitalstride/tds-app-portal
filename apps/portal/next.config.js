/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tds/ui', '@tds/database'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

module.exports = nextConfig;
