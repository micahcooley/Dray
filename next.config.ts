import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy at sylorlabs.com/drey (uncomment for production)
  // basePath: '/drey',
  // assetPrefix: '/drey',

  // NOTE: API routes require server-side rendering, so we can't use 'export' mode
  // For production with API routes, you'll need a Node.js server or edge runtime
  // output: 'export',

  // Image optimization for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
