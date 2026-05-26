import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

/* ─────────── 1. Payment-specific Rate Limiter ─────────── */

export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 15 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as unknown as { user?: { id: string } }).user?.id;
    return userId || req.ip || 'unknown';
  },
  message: {
    success: false,
    message: 'Too many payment requests. Please wait before trying again.',
  },
});

export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isProduction ? 60 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many webhook calls.' },
});

/* ─────────── 2. IP Whitelist for Payment Callbacks ─────────── */

const ABA_ALLOWED_IPS = (process.env.ABA_ALLOWED_IPS || '').split(',').map(s => s.trim()).filter(Boolean);

export const abaIpWhitelist = (req: Request, res: Response, next: NextFunction): void => {
  if (ABA_ALLOWED_IPS.length === 0) {
    next();
    return;
  }

  const clientIp = req.ip || req.socket.remoteAddress || '';
  const forwardedFor = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim();
  const realIp = forwardedFor || clientIp;

  if (ABA_ALLOWED_IPS.includes(realIp)) {
    next();
    return;
  }

  console.warn(`[SECURITY] ABA callback blocked from unauthorized IP: ${realIp}`);
  res.status(403).json({ success: false, message: 'Forbidden' });
};

/* ─────────── 3. Webhook Replay Protection ─────────── */

const processedWebhooks = new Map<string, number>();
const REPLAY_WINDOW_MS = 30 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - REPLAY_WINDOW_MS;
  for (const [key, timestamp] of processedWebhooks) {
    if (timestamp < cutoff) processedWebhooks.delete(key);
  }
}, 5 * 60 * 1000);

export function isWebhookReplay(provider: string, transactionId: string): boolean {
  const key = `${provider}:${transactionId}`;
  if (processedWebhooks.has(key)) return true;
  processedWebhooks.set(key, Date.now());
  return false;
}

/* ─────────── 4. Input Sanitization ─────────── */

function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[<>"'`;()]/g, '')
    .trim()
    .slice(0, 500);
}

export const sanitizePaymentInputs = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string' && key !== 'hash' && key !== 'signature') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }
  next();
};

/* ─────────── 5. Request Fingerprint Logging ─────────── */

export const logPaymentAttempt = (req: Request, _res: Response, next: NextFunction): void => {
  const userId = (req as unknown as { user?: { id: string } }).user?.id || 'anonymous';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${ip}:${ua}:${userId}`)
    .digest('hex')
    .slice(0, 12);

  console.log(`[PAYMENT] Attempt by user=${userId} ip=${ip} fingerprint=${fingerprint} path=${req.path}`);
  next();
};
