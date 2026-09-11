import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import reviewRoutes from './routes/review.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import paymentRoutes from './routes/payment.routes';
import locationRoutes from './routes/location.routes';
import settingRoutes from './routes/setting.routes';
import supportRoutes from './routes/support.routes';
import leadRoutes from './routes/lead.routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { checkDatabaseHealth } from './lib/prisma';
import { handleStripeWebhook } from './controllers/stripeWebhook.controller';

const app = express();
app.set('trust proxy', true);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowVercelPreviewOrigins = ['1', 'true', 'yes'].includes(
  String(process.env.CORS_ALLOW_VERCEL || '').trim().toLowerCase()
);

function isAllowedVercelOrigin(origin: string): boolean {
  if (!allowVercelPreviewOrigins) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:') return false;
    return hostname === 'vercel.app' || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

/** RFC1918 + loopback — for dev testing from phone/tablet on the same Wi‑Fi. */
function isPrivateLanHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return true;
  return (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

// Security & middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients and server-to-server requests.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (isAllowedVercelOrigin(origin)) return callback(null, true);
      // Dev: allow frontend on LAN (e.g. http://10.12.0.170:3000 or http://192.168.x.x:3000) from phone.
      if (process.env.NODE_ENV !== 'production' && origin) {
        try {
          const u = new URL(origin);
          const port = u.port || (u.protocol === 'https:' ? '443' : '80');
          if (isPrivateLanHost(u.hostname) && port === '3000') return callback(null, true);
        } catch {
          /* ignore */
        }
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Session-Token',
      'x-session-token',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  })
);
app.use(compression());
app.use(cookieParser());

/** Block access to sensitive dotfiles and config paths. */
app.use((req, res, next) => {
  if (/\/(\.env|\.git|\.ssh|wp-admin|phpmy|eval\()/i.test(req.path)) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
});

/** Product images uploaded when Cloudinary is off — URL path is /uploads/{folder}/{file} */
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
/** Stripe webhooks require the raw body for signature verification (must be before express.json). */
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
/** KHQR webhooks also need raw body for HMAC-SHA256 signature verification. */
app.post('/api/payments/khqr/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => {
  // Store raw body on request so the controller can use it for signature verification
  (req as unknown as Record<string, unknown>).__rawBody =
    Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});
  next();
});
/** JSON bodies only; file uploads use multipart with separate limits. */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting: Smart & robust for online production and local dev
const isProduction = process.env.NODE_ENV === 'production';

const extractClientIp = (req: express.Request): string => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 5000 : 50000,
  keyGenerator: extractClientIp,
  skip: (req) => {
    // Never throttle local development
    if (!isProduction) return true;
    const ip = extractClientIp(req);
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
    // Exempt health checks, root, and public catalog browsing (GET /products, /categories, /settings)
    if (req.path === '/health' || req.path === '/') return true;
    if (
      req.method === 'GET' &&
      (req.path.startsWith('/products') ||
        req.path.startsWith('/categories') ||
        req.path.startsWith('/settings') ||
        req.path.startsWith('/location') ||
        req.path.startsWith('/reviews'))
    ) {
      return true;
    }
    return false;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 60 : 1000,
  keyGenerator: extractClientIp,
  skip: (req) => {
    if (!isProduction) return true;
    const ip = extractClientIp(req);
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/auth/facebook', authLimiter);
app.use('/api/auth/telegram', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Health check
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'SH-Shop backend is running',
    docs: '/api',
    health: '/health',
  });
});

app.get('/health', async (_req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  const statusCode = dbHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: dbHealthy ? 'ok' : 'degraded',
    services: { database: dbHealthy ? 'up' : 'down' },
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

app.get('/api/health', async (_req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  const statusCode = dbHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: dbHealthy ? 'ok' : 'degraded',
    services: { database: dbHealthy ? 'up' : 'down' },
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/leads', leadRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
