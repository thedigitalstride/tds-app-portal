import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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

export default nextConfig;
