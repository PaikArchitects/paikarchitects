import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/ig', destination: '/?utm_source=instagram&utm_medium=bio', permanent: false },
    ];
  },
};

export default nextConfig;