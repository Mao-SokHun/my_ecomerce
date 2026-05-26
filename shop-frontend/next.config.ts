import type { NextConfig } from 'next';

/** Origin for rewrites (/api, /uploads). Prefer BACKEND_PROXY_TARGET; else derive from NEXT_PUBLIC_API_URL (Vercel). */
function resolveBackendOrigin(): string {
  const explicit = process.env.BACKEND_PROXY_TARGET?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const pub = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (pub) {
    const withoutApi = pub.replace(/\/api\/?$/i, '').replace(/\/$/, '');
    if (withoutApi) return withoutApi;
  }
  return 'http://127.0.0.1:5000';
}

const backendProxyTarget = resolveBackendOrigin();

/** Allow next/image for product URLs hosted on the same API host (e.g. Render). */
function apiUrlRemotePattern(): { protocol: 'https' | 'http'; hostname: string } | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!u.hostname) return null;
    return { protocol: u.protocol === 'http:' ? 'http' : 'https', hostname: u.hostname };
  } catch {
    return null;
  }
}

const apiImageHost = apiUrlRemotePattern();

const nextConfig: NextConfig = {
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          isProd
            ? "script-src 'self' 'unsafe-inline' https://accounts.google.com https://connect.facebook.net"
            : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://connect.facebook.net",
          "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
          "style-src-elem 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com",
          "img-src 'self' data: blob: https: http:",
          "font-src 'self' data: https://fonts.gstatic.com",
          `connect-src 'self' ${backendProxyTarget} https://accounts.google.com https://graph.facebook.com https://www.facebook.com https://oauth2.googleapis.com`,
          "frame-src https://accounts.google.com https://www.facebook.com https://js.stripe.com",
          "worker-src 'self' blob:",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ].join('; '),
      },
    ] as { key: string; value: string }[];
    if (isProd) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }
    return [{ source: '/:path*', headers: securityHeaders }];
  },
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
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh6.googleusercontent.com' },
      { protocol: 'https', hostname: 'quickchart.io' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
      { protocol: 'https', hostname: '*.fbcdn.net' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      ...(apiImageHost ? [apiImageHost] : []),
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
