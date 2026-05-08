import type { NextConfig } from 'next';

const backendProxyTarget = process.env.BACKEND_PROXY_TARGET || 'http://127.0.0.1:5000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendProxyTarget}/api/:path*` },
      /** Same-origin image URLs when DB stores path-only or for Next/Image via localhost:3000 */
      { source: '/uploads/:path*', destination: `${backendProxyTarget}/uploads/:path*` },
    ];
  },
  /** Reduces stale chunk 404 / ChunkLoadError after HMR on Windows (pairs with NEXT_DISABLE_WEBPACK_CACHE). */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'i.pinimg.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'example.com' },
      { protocol: 'https', hostname: 'shop.switch.com.my' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
