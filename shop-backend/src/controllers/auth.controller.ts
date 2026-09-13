import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import prisma from '../lib/prisma';
import { allocateCartId } from '../lib/allocatePrefixedId';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { sendEmail, sendTelegramMessage } from '../lib/notifier';
import { DISPLAY_NAME_PATTERN, normalizeDisplayName } from '../lib/displayName';

const normalizePhoneDigits = (raw: string): string => raw.replace(/\D/g, '');
const forgotPasswordCodes = new Map<string, { code: string; expiresAt: number }>();
const MAX_FORGOT_PASSWORD_ENTRIES = 2500;

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function checkLoginLockout(key: string): void {
  const entry = loginAttempts.get(key);
  if (!entry) return;
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(key);
    return;
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    const minutesLeft = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    throw new AppError(`Account locked. Try again in ${minutesLeft} minute(s).`, 429);
  }
}

function recordFailedLogin(key: string): void {
  const entry = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60000;
  }
  loginAttempts.set(key, entry);
  if (loginAttempts.size > 5000) {
    const oldest = loginAttempts.keys().next().value;
    if (oldest) loginAttempts.delete(oldest);
  }
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

const storeForgotPasswordCode = (email: string, entry: { code: string; expiresAt: number }) => {
  forgotPasswordCodes.set(email, entry);
  if (forgotPasswordCodes.size <= MAX_FORGOT_PASSWORD_ENTRIES) return;
  const target = Math.floor(MAX_FORGOT_PASSWORD_ENTRIES * 0.6);
  while (forgotPasswordCodes.size > target) {
    const first = forgotPasswordCodes.keys().next().value as string | undefined;
    if (first === undefined) break;
    forgotPasswordCodes.delete(first);
  }
};

const MAX_AVATAR_URL_LEN = 2048;

/** Allow empty, same-origin upload paths, or http(s) image URLs only. */
const sanitizeAvatarUrl = (raw: string): string => {
  const s = raw.trim();
  if (!s) return '';
  if (s.length > MAX_AVATAR_URL_LEN) {
    throw new AppError('Avatar URL is too long', 400);
  }
  const low = s.toLowerCase();
  if (low.startsWith('javascript:') || low.startsWith('data:') || low.startsWith('vbscript:')) {
    throw new AppError('Invalid avatar URL', 400);
  }
  if (s.startsWith('/uploads/')) {
    if (s.includes('..') || /\s/.test(s)) {
      throw new AppError('Invalid avatar path', 400);
    }
    return s;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new AppError('Avatar must use http or https', 400);
    }
    return s;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('Avatar must be a valid URL or start with /uploads/', 400);
  }
};

const signAccessToken = (payload: { id: string; email: string; role: string; name: string; tokenVersion: number }) => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '15m',
  } as jwt.SignOptions);
};

const signRefreshToken = (payload: { id: string; tokenVersion: number }) => {
  return jwt.sign(payload, process.env.JWT_SECRET! + '_refresh', {
    expiresIn: '7d',
  } as jwt.SignOptions);
};

const buildTokenPair = (user: { id: string; email?: string | null; role: string; name: string; tokenVersion: number }) => {
  const accessToken = signAccessToken({ id: user.id, email: user.email || '', role: user.role, name: user.name, tokenVersion: user.tokenVersion });
  const refreshToken = signRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
  return { token: accessToken, refreshToken };
};

// ── Secure Refresh Token Helpers ────────────────────────────────────────────

/** SHA-256 hash of the raw refresh token — what we store in the DB. */
const hashToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex');

/** Upsert the RefreshTokenSession row for this user (single session). */
const persistRefreshSession = async (
  userId: string,
  refreshToken: string,
  userAgent?: string,
  ip?: string
): Promise<void> => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshTokenSession.upsert({
    where: { userId },
    create: { userId, tokenHash, expiresAt, userAgent, ip },
    update: { tokenHash, expiresAt, userAgent: userAgent ?? null, ip: ip ?? null },
  });
};

/** Set the refresh token as an HttpOnly, Secure, SameSite=lax cookie. */
const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  });
};

/** Clear the refresh token cookie and delete the DB session row. */
const clearRefreshSession = async (userId: string, res: Response): Promise<void> => {
  res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  await prisma.refreshTokenSession.deleteMany({ where: { userId } }).catch(() => {});
};

const logAudit = async (userId: string, action: string, detail: string | null, ip: string) => {
  try {
    await prisma.auditLog.create({ data: { userId, action, detail, ip } });
  } catch {
    // non-critical
  }
};

const parseCsv = (value?: string): string[] =>
  String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const resolveTelegramTargets = (): string[] =>
  parseCsv(
    process.env.TELEGRAM_USER_CHAT_IDS ||
      process.env.TELEGRAM_USER_CHAT_ID ||
      process.env.TELEGRAM_CHAT_IDS ||
      process.env.TELEGRAM_CHAT_ID
  );

const resolveTelegramBotToken = (): string | undefined =>
  process.env.TELEGRAM_USER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

const formatDateTime24 = (value: Date): string =>
  value.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const buildPasswordResetEmail = (
  code: string,
  customerName?: string,
  email?: string
): { subject: string; text: string; html: string } => {
  const subject = `SH-Shop — Verification Code: ${code} (Expires in 15 mins)`;
  const digits = code.split('');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetLink = email
    ? `${frontendUrl}/login?email=${encodeURIComponent(email)}&code=${code}`
    : `${frontendUrl}/login`;

  const text = [
    'SH-Shop — Verification Code',
    '',
    `Hello ${customerName || 'Valued Customer'},`,
    `We received an authorization request to reset the password for your account (${email || 'your email'}).`,
    '',
    `YOUR VERIFICATION CODE: ${code}`,
    '',
    `Reset Link: ${resetLink}`,
    '',
    '• Valid for 15 minutes (Single-use security token).',
    '• Never share this code with anyone, including SH-Shop staff.',
    '• If you did not make this request, you can safely disregard this email.',
    '',
    '© 2026 SH-Shop E-Commerce Co., Ltd. All rights reserved.',
  ].join('\n');

  const digitBoxesHtml = digits
    .map(
      (d) => `
      <td align="center" style="width: 42px; height: 48px; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border: 1.5px solid #6366f1; border-radius: 10px; font-size: 22px; font-weight: 800; color: #1e1b4b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 3px 8px rgba(99, 102, 241, 0.12); text-align: center;">
        ${d}
      </td>
    `
    )
    .join('<td style="width: 6px;"></td>');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <title>SH-Shop — Password Reset Verification</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
      
      <!-- Outer Background Container (Clean Light Backdrop) -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 25px 12px;">
        <tr>
          <td align="center">
            
            <!-- Main Email Container Card (Compact 460px on Clean Canvas) -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 460px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 30px -8px rgba(15, 23, 42, 0.08), 0 0 0 1px #e2e8f0; border-collapse: separate;">
              
              <!-- Top Hero Luxury Header (Compact) -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 80%, #0e7490 100%); padding: 26px 20px 22px; text-align: center;">
                  
                  <!-- Security Badge Pill -->
                  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 10px;">
                    <tr>
                      <td style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 9999px; padding: 3px 12px; text-align: center;">
                        <span style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #e0f2fe; vertical-align: middle;">
                          🛡️ OFFICIAL SECURITY ALERT
                        </span>
                      </td>
                    </tr>
                  </table>

                  <!-- Brand Security Shield Emblem (Compact 44x44) -->
                  <div style="width: 44px; height: 44px; margin: 0 auto 8px; background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 14px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2); text-align: center; line-height: 42px; font-size: 20px;">
                    🔒
                  </div>

                  <!-- Brand Title -->
                  <h1 style="margin: 0 0 2px; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.4px;">
                    SH-Shop
                  </h1>
                  <p style="margin: 0; font-size: 12px; color: rgba(224, 242, 254, 0.85); font-weight: 400; letter-spacing: 0.2px;">
                    Premium E-Commerce • Account Protection
                  </p>
                </td>
              </tr>

              <!-- Main Body Section (Compact & Well-Proportioned) -->
              <tr>
                <td style="padding: 24px 24px 20px;">
                  
                  <!-- Greeting & Subject Heading -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                    <tr>
                      <td>
                        <div style="display: inline-block; background-color: #eef2ff; color: #4f46e5; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; letter-spacing: 0.4px;">
                          PASSWORD RECOVERY
                        </div>
                        <h2 style="margin: 0 0 6px; font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">
                          Verification Code
                        </h2>
                        <p style="margin: 0; font-size: 13.5px; line-height: 1.55; color: #475569;">
                          Hello <strong style="color: #0f172a;">${customerName || 'Valued Customer'}</strong>, we received a request to reset your password for ${email ? `<span style="color: #4f46e5; font-weight: 600;">${email}</span>` : 'your account'}. Use the code below:
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- 6 Digit Individual Boxes Display (Proportional & Clean) -->
                  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 16px auto 14px;">
                    <tr>
                      ${digitBoxesHtml}
                    </tr>
                  </table>

                  <!-- Quick Copy Snippet Chip (Compact) -->
                  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 18px;">
                    <tr>
                      <td align="center">
                        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #64748b;">
                          Or copy code:
                        </p>
                        <div style="display: inline-block; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 4px 12px;">
                          <span style="font-size: 14px; font-weight: 700; letter-spacing: 4px; color: #0f172a; font-family: monospace;">
                            ${digits.join(' ')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Action Button CTA (Compact Pill) -->
                  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 20px;">
                    <tr>
                      <td align="center">
                        <a href="${resetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 11px 34px; border-radius: 9999px; font-size: 13.5px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 6px 18px rgba(79, 70, 229, 0.32);">
                          Reset Password Now →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Security Advisory Notice Card (Slim & Compact) -->
                  <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 3.5px solid #f59e0b; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="vertical-align: top; width: 22px; padding-right: 8px; font-size: 15px; line-height: 1.2;">
                          ⏱️
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 2px; font-size: 12px; font-weight: 700; color: #92400e;">
                            Expires in 15 minutes
                          </p>
                          <p style="margin: 0; font-size: 11.5px; line-height: 1.45; color: #78350f;">
                            Single-use code. Never share this code with anyone.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Safety Guarantee Text (Slim) -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px;">
                    <p style="margin: 0; font-size: 11px; line-height: 1.45; color: #64748b;">
                      🔒 <strong>Didn't request this?</strong> You can safely ignore this email. Your account remains secure.
                    </p>
                  </div>

                </td>
              </tr>

              <!-- Audit Metadata Card (Compact) -->
              <tr>
                <td style="padding: 0 24px 16px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 10.5px; color: #64748b;">
                    <tr>
                      <td style="padding: 2px 0;"><strong>Security:</strong> SH-Shop Gateway</td>
                      <td align="right" style="padding: 2px 0;">Phnom Penh, Cambodia</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Clean Light Modern Footer -->
              <tr>
                <td style="padding: 18px 20px; background-color: #f8fafc; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0;">
                  <div style="margin-bottom: 6px;">
                    <a href="${frontendUrl}" style="color: #4f46e5; text-decoration: none; font-weight: 600; margin: 0 8px;">Homepage</a>
                    <span style="color: #cbd5e1;">•</span>
                    <a href="${frontendUrl}/support" style="color: #4f46e5; text-decoration: none; font-weight: 600; margin: 0 8px;">Support</a>
                    <span style="color: #cbd5e1;">•</span>
                    <a href="${frontendUrl}" style="color: #4f46e5; text-decoration: none; font-weight: 600; margin: 0 8px;">Privacy</a>
                  </div>
                  <p style="margin: 0 0 2px; color: #475569; font-weight: 500;">
                    © 2026 <strong>SH-Shop E-Commerce Co., Ltd.</strong> All rights reserved.
                  </p>
                  <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                    Automated security dispatch. Please do not reply.
                  </p>
                </td>
              </tr>

            </table>
            <!-- End Main Card -->

          </td>
        </tr>
      </table>

    </body>
    </html>
  `;

  return { subject, text, html };
};

const getRequestIp = (req: Request): string => {
  const xfwd = req.headers['x-forwarded-for'];
  if (typeof xfwd === 'string' && xfwd.trim()) return xfwd.split(',')[0].trim();
  if (Array.isArray(xfwd) && xfwd[0]) return String(xfwd[0]).trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

/** Optional lat/lng from browser Geolocation (client-supplied; not persisted). */
const readOptionalClientGeo = (req: Request): { lat: number; lng: number } | null => {
  const b = req.body as Record<string, unknown> | null | undefined;
  if (!b || typeof b !== 'object') return null;
  const lat = Number(b.clientLatitude);
  const lng = Number(b.clientLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

/** Short display ID for Telegram: U + 9 digits, stable per DB id (not the raw cuid). */
const formatPublicUserId = (id: string): string => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const n = (h % 900_000_000) + 100_000_000;
  return `U${n}`;
};

/** Rough city/country from IP (HTTPS, no API key). Fails silently if offline/rate-limited. */
const lookupIpGeo = async (ip: string): Promise<string | null> => {
  if (!ip || ip === 'unknown') return null;
  if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) return null;
  if (process.env.DISABLE_IP_GEO_LOOKUP === '1' || process.env.DISABLE_IP_GEO_LOOKUP === 'true') return null;
  try {
    const { data } = await axios.get<{
      success?: boolean;
      city?: string;
      region?: string;
      country?: string;
      message?: string;
    }>(`https://ipwho.is/${encodeURIComponent(ip)}`, { timeout: 2800 });
    if (data?.success === false) return null;
    const parts = [data.city, data.region, data.country].filter((p): p is string => Boolean(p && String(p).trim()));
    return parts.length ? parts.join(', ') : null;
  } catch {
    return null;
  }
};

const formatDateTimeAlert = (value: Date): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Phnom_Penh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value);
  return parts.replace(',', ' —');
};

/** Guess phone / tablet / desktop + OS + browser from User-Agent (heuristic only). */
const summarizeDeviceFromUserAgent = (uaRaw: string): string => {
  const ua = uaRaw.slice(0, 500);
  if (!ua || ua === 'unknown') return 'មិនស្គាល់';

  const hasAndroid = /Android/i.test(ua);
  const androidMobile = hasAndroid && /Mobile/i.test(ua);
  const isIpad = /iPad/i.test(ua);
  const isIphone = /iPhone|iPod/i.test(ua);
  const tablet =
    isIpad || (hasAndroid && !androidMobile) || /Tablet|PlayBook|Silk\//i.test(ua);
  const phone =
    isIphone ||
    androidMobile ||
    /webOS|BlackBerry|IEMobile|Opera Mini|Mobile Safari.*\bMobile\b/i.test(ua);
  const formFactor = tablet ? 'Tablet' : phone ? 'Mobile' : 'Desktop';

  let os = 'Unknown OS';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone/i.test(ua)) os = 'iOS';
  else if (/iPad/i.test(ua)) os = 'iPadOS';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera\//i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && /Version\//i.test(ua)) browser = 'Safari';

  return `${os} · ${browser} (${formFactor})`;
};

const notifyTelegramAuthEvent = async (
  req: Request,
  user: { id: string; name: string; email?: string | null; phone?: string | null },
  event: 'REGISTER' | 'LOGIN'
): Promise<void> => {
  const targets = resolveTelegramTargets();
  if (targets.length === 0) return;

  const title = event === 'REGISTER'
    ? '🆕 <b>ការជូនដំណឹង៖ មានការចុះឈ្មោះគណនីថ្មី</b>'
    : '🔐 <b>ការជូនដំណឹង៖ មានការចូលគណនីថ្មី</b>';

  const ip = getRequestIp(req);
  const geo = await lookupIpGeo(ip);
  const clientGeo = readOptionalClientGeo(req);
  const ua = String(req.headers['user-agent'] || 'unknown').slice(0, 500);
  const deviceSummary = summarizeDeviceFromUserAgent(ua);
  const formattedDate = formatDateTimeAlert(new Date());
  const publicId = formatPublicUserId(user.id);

  const lines = [
    title,
    `• <b>កាលបរិច្ឆេទ៖</b> ${formattedDate}`,
    ``,
    `<b>ព័ត៌មានគណនី</b>`,
    `• <b>ឈ្មោះ៖</b> ${user.name || 'មិនមាន'} (<code>${publicId}</code>)`,
    `• <b>អ៊ីមែល៖</b> ${user.email || 'មិនមាន'}`,
    `• <b>ទូរស័ព្ទ៖</b> <code>${user.phone || 'មិនមាន'}</code>`,
    ``,
    `<b>ព័ត៌មានឧបករណ៍ និងបណ្ដាញ</b>`,
    `• <b>ឧបករណ៍៖</b> ${deviceSummary}`,
    `• <b>អាសយដ្ឋាន IP៖</b> <code>${ip}</code>`,
    `• <b>ទីតាំង (IP)៖</b> ${geo || 'មិនអាចស្គាល់ / មិនមានទិន្នន័យ'}`,
  ];

  if (clientGeo) {
    lines.push(`• <b>កូអរដោនេ (GPS)៖</b> <code>${clientGeo.lat.toFixed(6)}, ${clientGeo.lng.toFixed(6)}</code>`);
  }

  lines.push(
    ``,
    `<blockquote>ℹ️ <i>ចំណាំ៖ ព័ត៌មានឧបករណ៍ និងទីតាំងជាការប៉ាន់ប្រមាណតាមបច្ចេកទេសសម្រាប់ជំនួយសុវត្ថិភាពប៉ុណ្ណោះ។</i></blockquote>`
  );

  const text = lines.join('\n');
  const botToken = resolveTelegramBotToken();
  await Promise.allSettled(targets.map((chatId) => sendTelegramMessage({ chatId, text, botToken })));
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !password || !phone) {
      throw new AppError('Name, phone and password are required', 400);
    }

    const displayName = normalizeDisplayName(String(name));
    if (!displayName || !DISPLAY_NAME_PATTERN.test(displayName)) {
      throw new AppError(
        'Name may only include letters (any script), spaces, hyphens (-), apostrophes, periods, and parentheses',
        400
      );
    }

    const phoneDigits = normalizePhoneDigits(String(phone));
    if (!/^\d{8,15}$/.test(phoneDigits)) {
      throw new AppError('Phone can contain numbers only (8-15 digits)', 400);
    }

    const rawEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailStr = rawEmail || null;
    if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      throw new AppError('Invalid email format: use something like name@example.com', 400);
    }

    const passwordValue = String(password);
    const hasLower = /[a-z]/.test(passwordValue);
    const hasUpper = /[A-Z]/.test(passwordValue);
    const hasNumber = /\d/.test(passwordValue);
    const hasSpecial = /[^A-Za-z0-9]/.test(passwordValue);
    if (passwordValue.length < 8 || !hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      throw new AppError('Password must include upper, lower, number, special character and be at least 8 characters', 400);
    }

    if (emailStr) {
      const existingByEmail = await prisma.user.findUnique({ where: { email: emailStr } });
      if (existingByEmail) throw new AppError('Email already registered', 409);
    }
    const existingByPhone = await prisma.user.findFirst({ where: { phone: phoneDigits } });
    if (existingByPhone) throw new AppError('Phone already registered', 409);

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name: displayName, email: emailStr, phone: phoneDigits, password: hashedPassword, provider: 'LOCAL' },
      select: { id: true, name: true, email: true, phone: true, role: true, avatar: true, provider: true, tokenVersion: true, createdAt: true },
    });

    await prisma.cart.create({ data: { id: await allocateCartId(), userId: user.id } });

    const tokens = buildTokenPair(user);
    await persistRefreshSession(user.id, tokens.refreshToken, req.get('user-agent'), getRequestIp(req));
    setRefreshCookie(res, tokens.refreshToken);
    logAudit(user.id, 'REGISTER', 'Local registration', getRequestIp(req));
    notifyTelegramAuthEvent(req, user, 'REGISTER').catch((error) => {
      console.error('[Auth Notify] Register Telegram notification failed:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, ...tokens },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, email, phone, password } = req.body;
    const loginId = String(identifier || email || phone || '').trim();

    if (!loginId || !password) {
      throw new AppError('Phone/email and password are required', 400);
    }

    const lockoutKey = loginId.toLowerCase();
    checkLoginLockout(lockoutKey);

    const digits = normalizePhoneDigits(loginId);
    const isEmail = /@/.test(loginId);
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: loginId.toLowerCase() } : { phone: digits || loginId },
    });

    if (!user) {
      recordFailedLogin(lockoutKey);
      throw new AppError('Invalid phone, email, or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account is inactive', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      recordFailedLogin(lockoutKey);
      throw new AppError('Invalid phone, email, or password', 401);
    }

    clearLoginAttempts(lockoutKey);

    const tokens = buildTokenPair(user);

    // ── Persist refresh session (HttpOnly cookie + DB hash) ──────────────────────
    await persistRefreshSession(
      user.id,
      tokens.refreshToken,
      req.get('user-agent'),
      getRequestIp(req)
    );
    setRefreshCookie(res, tokens.refreshToken);

    logAudit(user.id, 'LOGIN', `Login via ${isEmail ? 'email' : 'phone'}`, getRequestIp(req));
    notifyTelegramAuthEvent(req, user, 'LOGIN').catch((error) => {
      console.error('[Auth Notify] Login Telegram notification failed:', error);
    });

    const { password: _, ...userWithoutPassword } = user;
    void _;

    // Return only the accessToken in the JSON body; refreshToken travels via HttpOnly cookie
    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userWithoutPassword, token: tokens.token, refreshToken: tokens.refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

/** Sign in with Google (GIS id_token). Set GOOGLE_CLIENT_ID to your Web client ID (same value as NEXT_PUBLIC_GOOGLE_CLIENT_ID on Vercel). */
export const googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { credential } = req.body as { credential?: string };
    if (!credential) throw new AppError('Google credential is required', 400);
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) throw new AppError('Google sign-in is not configured on server', 503);

    let payload: Record<string, string | undefined>;
    try {
      const { data } = await axios.get<Record<string, string | undefined>>(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
        { timeout: 10000 }
      );
      payload = data;
    } catch {
      throw new AppError('Invalid Google credential', 401);
    }

    if (payload.error) throw new AppError('Invalid Google credential', 401);
    const aud = payload.aud;
    const azp = payload.azp;
    if (aud !== clientId && azp !== clientId) {
      throw new AppError('Invalid Google credential audience', 401);
    }

    const verified = String(payload.email_verified || '').toLowerCase();
    if (verified === 'false') throw new AppError('Google email is not verified', 401);

    const emailRaw = payload.email?.toLowerCase().trim();
    if (!emailRaw) throw new AppError('Google account has no email', 401);

    const sub = payload.sub || '';
    const name = (payload.name || '').trim() || emailRaw.split('@')[0] || 'Google User';
    const picture = payload.picture || undefined;

    let user = await prisma.user.findUnique({ where: { email: emailRaw } });
    const isNew = !user;
    if (!user) {
      const randomPassword = await bcrypt.hash(`google_${sub}_${Date.now()}`, 12);
      user = await prisma.user.create({
        data: {
          email: emailRaw,
          name,
          avatar: picture || null,
          password: randomPassword,
          emailVerified: true,
          provider: 'GOOGLE',
        },
      });
      await prisma.cart.create({ data: { id: await allocateCartId(), userId: user.id } });
    } else {
      const updates: { name?: string; avatar?: string | null } = {};
      if (name && user.name !== name) updates.name = name;
      if (picture && !user.avatar) updates.avatar = picture;
      if (Object.keys(updates).length) {
        user = await prisma.user.update({ where: { id: user.id }, data: updates });
      }
    }

    const tokens = buildTokenPair(user);
    await persistRefreshSession(user.id, tokens.refreshToken, req.get('user-agent'), getRequestIp(req));
    setRefreshCookie(res, tokens.refreshToken);
    logAudit(user.id, isNew ? 'REGISTER' : 'LOGIN', 'Google OAuth', getRequestIp(req));
    notifyTelegramAuthEvent(
      req,
      { id: user.id, name: user.name, email: user.email, phone: user.phone },
      isNew ? 'REGISTER' : 'LOGIN'
    ).catch((error) => {
      console.error('[Auth Notify] Google Telegram notification failed:', error);
    });

    const { password: _, ...userWithoutPassword } = user;
    void _;

    res.json({
      success: true,
      message: isNew ? 'Google registration successful' : 'Google login successful',
      data: { user: userWithoutPassword, ...tokens },
    });
  } catch (error) {
    next(error);
  }
};

export const facebookLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { accessToken } = req.body as { accessToken?: string };
    if (!accessToken) throw new AppError('Facebook access token is required', 400);

    let data: any;
    try {
      let fbUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`;
      const fbAppSecret = process.env.FACEBOOK_APP_SECRET?.trim();
      if (fbAppSecret) {
        const proof = crypto.createHmac('sha256', fbAppSecret).update(accessToken).digest('hex');
        fbUrl += `&appsecret_proof=${proof}`;
      }
      const fb = await axios.get(fbUrl);
      data = fb.data;
    } catch {
      throw new AppError('Invalid Facebook token', 401);
    }

    if (!data?.id) throw new AppError('Invalid Facebook token', 401);
    const email = (data.email as string | undefined) || `fb_${String(data.id)}@facebook.local`;
    const name = (data.name as string | undefined) || 'Facebook User';
    const avatar = (data?.picture?.data?.url as string | undefined) || (data?.id ? `https://graph.facebook.com/${data.id}/picture?type=large` : null);

    let user = await prisma.user.findUnique({ where: { email } });
    const isNew = !user;
    if (!user) {
      const randomPassword = await bcrypt.hash(`fb_${data.id}_${Date.now()}`, 12);
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar,
          password: randomPassword,
          emailVerified: true,
          provider: 'FACEBOOK',
        },
      });
      await prisma.cart.create({ data: { id: await allocateCartId(), userId: user.id } });
    } else {
      const updates: { avatar?: string | null; name?: string } = {};
      if (avatar && user.avatar !== avatar) updates.avatar = avatar;
      if (name && (!user.name || user.name === 'Facebook User')) updates.name = name;
      if (Object.keys(updates).length) {
        user = await prisma.user.update({ where: { id: user.id }, data: updates });
      }
    }

    const tokens = buildTokenPair(user);
    await persistRefreshSession(user.id, tokens.refreshToken, req.get('user-agent'), getRequestIp(req));
    setRefreshCookie(res, tokens.refreshToken);
    logAudit(user.id, isNew ? 'REGISTER' : 'LOGIN', 'Facebook OAuth', getRequestIp(req));
    notifyTelegramAuthEvent(
      req,
      { id: user.id, name: user.name, email: user.email, phone: user.phone },
      isNew ? 'REGISTER' : 'LOGIN'
    ).catch((error) => {
      console.error('[Auth Notify] Facebook Telegram notification failed:', error);
    });

    const { password: _, ...userWithoutPassword } = user;
    void _;

    res.json({
      success: true,
      message: 'Facebook login successful',
      data: { user: userWithoutPassword, ...tokens },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Telegram Auth & Session State ───────────────────────────────────────────

interface TelegramLoginSession {
  sessionId: string;
  status: 'pending' | 'authorized' | 'expired';
  createdAt: number;
  expiresAt: number;
  user?: any;
  tokens?: any;
}

const telegramLoginSessions = new Map<string, TelegramLoginSession>();
const telegramLoginOtps = new Map<string, { code: string; target: string; expiresAt: number; userInfo?: any }>();

// Cleanup stale sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of telegramLoginSessions.entries()) {
    if (val.expiresAt < now) telegramLoginSessions.delete(key);
  }
  for (const [key, val] of telegramLoginOtps.entries()) {
    if (val.expiresAt < now) telegramLoginOtps.delete(key);
  }
}, 300_000);

export const processTelegramUserAuth = async (
  req: Request,
  payload: {
    id: string | number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  }
) => {
  const telegramId = String(payload.id);
  const email = payload.username
    ? `tg_${payload.username.toLowerCase()}@telegram.local`
    : `tg_${telegramId}@telegram.local`;
  const name = [payload.first_name, payload.last_name].filter(Boolean).join(' ') || payload.username || `Telegram User ${telegramId.slice(-4)}`;
  const avatar = payload.photo_url || null;

  let user = await prisma.user.findUnique({ where: { email } });
  const isNew = !user;

  if (!user) {
    const randomPassword = await bcrypt.hash(`tg_${telegramId}_${Date.now()}`, 12);
    user = await prisma.user.create({
      data: {
        email,
        name,
        avatar,
        password: randomPassword,
        emailVerified: true,
        provider: 'TELEGRAM',
      },
    });
    await prisma.cart.create({ data: { id: await allocateCartId(), userId: user.id } });
  } else {
    const updates: { avatar?: string | null; name?: string } = {};
    if (avatar && user.avatar !== avatar) updates.avatar = avatar;
    if (name && (!user.name || user.name.startsWith('Telegram User'))) updates.name = name;
    if (Object.keys(updates).length) {
      user = await prisma.user.update({ where: { id: user.id }, data: updates });
    }
  }

  const tokens = buildTokenPair(user);
  logAudit(user.id, isNew ? 'REGISTER' : 'LOGIN', 'Telegram OAuth', getRequestIp(req));
  notifyTelegramAuthEvent(
    req,
    { id: user.id, name: user.name, email: user.email, phone: user.phone },
    isNew ? 'REGISTER' : 'LOGIN'
  ).catch((error) => {
    console.error('[Auth Notify] Telegram login notification failed:', error);
  });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, ...tokens };
};

export const telegramLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body as {
      id?: string | number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date?: string | number;
      hash?: string;
    };

    if (!id) {
      throw new AppError('Telegram user ID is required', 400);
    }

    const candidateTokens = [
      process.env.TELEGRAM_LOGIN_BOT_TOKEN,
      process.env.TELEGRAM_USER_BOT_TOKEN,
      '8799740724:AAFIoSChey4_ESmfePJfUGqnIIApwkmOMTA',
      process.env.TELEGRAM_BOT_TOKEN,
    ].map((t) => t?.trim()).filter(Boolean) as string[];

    // Verify Telegram HMAC-SHA256 signature if hash is present
    if (hash && candidateTokens.length > 0) {
      let isVerified = false;

      // Concatenate standard Telegram keys sorted alphabetically
      const standardKeys = ['auth_date', 'first_name', 'id', 'last_name', 'photo_url', 'username'] as const;
      const fbArr: string[] = [];
      for (const k of standardKeys) {
        const val = req.body[k];
        if (val !== undefined && val !== null && String(val).length > 0) {
          fbArr.push(`${k}=${val}`);
        }
      }
      fbArr.sort();
      const fbCheckString = fbArr.join('\n');

      for (const token of candidateTokens) {
        const secretKey = crypto.createHash('sha256').update(token).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(fbCheckString).digest('hex');
        if (computedHash.toLowerCase() === String(hash).toLowerCase()) {
          isVerified = true;
          break;
        }
      }

      // Check with all non-hash keys as secondary fallback
      if (!isVerified) {
        const checkArr: string[] = [];
        for (const [key, val] of Object.entries(req.body)) {
          if (
            key !== 'hash' &&
            key !== 'clientLatitude' &&
            key !== 'clientLongitude' &&
            val !== undefined &&
            val !== null &&
            String(val).length > 0
          ) {
            checkArr.push(`${key}=${val}`);
          }
        }
        checkArr.sort();
        const dataCheckString = checkArr.join('\n');

        for (const token of candidateTokens) {
          const secretKey = crypto.createHash('sha256').update(token).digest();
          const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
          if (computedHash.toLowerCase() === String(hash).toLowerCase()) {
            isVerified = true;
            break;
          }
        }
      }

      if (!isVerified) {
        throw new AppError('Invalid Telegram authentication signature', 401);
      }

      if (auth_date && Date.now() / 1000 - Number(auth_date) > 86400) {
        throw new AppError('Telegram authentication session has expired', 401);
      }
    }

    const authData = await processTelegramUserAuth(req, { id, first_name, last_name, username, photo_url });

    res.json({
      success: true,
      message: 'Telegram login successful',
      data: authData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 1. Create a Telegram login session for 1-click Bot / QR login
 */
export const createTelegramLoginSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = crypto.randomBytes(20).toString('hex');
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 mins

    const botUsername = (process.env.TELEGRAM_BOT_USERNAME || 'new_user_sh_shop_bot').replace(/^@/, '');

    const session: TelegramLoginSession = {
      sessionId,
      status: 'pending',
      createdAt: now,
      expiresAt,
    };

    telegramLoginSessions.set(sessionId, session);

    const botDeepLink = `https://t.me/${botUsername}?start=login_${sessionId}`;
    const botAppDeepLink = `tg://resolve?domain=${botUsername}&start=login_${sessionId}`;

    res.json({
      success: true,
      data: {
        sessionId,
        botUsername,
        botDeepLink,
        botAppDeepLink,
        expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Check Telegram login session status (polled by frontend)
 */
export const checkTelegramLoginSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = String(req.params.sessionId || '');
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'Session ID is required' });
      return;
    }

    const session = telegramLoginSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found or expired', status: 'expired' });
      return;
    }

    if (Date.now() > session.expiresAt) {
      telegramLoginSessions.delete(sessionId);
      res.status(410).json({ success: false, message: 'Session expired', status: 'expired' });
      return;
    }

    if (session.status === 'authorized' && session.tokens && session.user) {
      // Consume session
      telegramLoginSessions.delete(sessionId);
      res.json({
        success: true,
        status: 'authorized',
        data: {
          user: session.user,
          ...session.tokens,
        },
      });
      return;
    }

    res.json({
      success: true,
      status: 'pending',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Authorize a Telegram login session (can be triggered by Web confirmation / Bot callback)
 */
export const authorizeTelegramLoginSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, id, first_name, last_name, username, photo_url } = req.body;
    if (!sessionId || !id) {
      res.status(400).json({ success: false, message: 'sessionId and id are required' });
      return;
    }

    const session = telegramLoginSessions.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
      res.status(404).json({ success: false, message: 'Session expired or invalid' });
      return;
    }

    const authData = await processTelegramUserAuth(req, { id, first_name, last_name, username, photo_url });
    const { user, ...tokens } = authData;

    session.status = 'authorized';
    session.user = user;
    session.tokens = tokens;
    telegramLoginSessions.set(sessionId, session);

    res.json({
      success: true,
      message: 'Session authorized successfully',
      data: authData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Send 6-digit OTP code to Telegram chat
 */
export const sendTelegramLoginCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { target } = req.body as { target?: string };
    const rawTarget = String(target || '').trim();

    if (!rawTarget) {
      res.status(400).json({ success: false, message: 'Telegram Username or Chat ID is required' });
      return;
    }

    const normalizedTarget = rawTarget.replace(/^@/, '');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    telegramLoginOtps.set(normalizedTarget.toLowerCase(), {
      code,
      target: normalizedTarget,
      expiresAt,
    });

    const token =
      process.env.TELEGRAM_LOGIN_BOT_TOKEN ||
      process.env.TELEGRAM_USER_BOT_TOKEN ||
      process.env.TELEGRAM_BOT_TOKEN ||
      '8799740724:AAFIoSChey4_ESmfePJfUGqnIIApwkmOMTA';

    const fallbackChatId = process.env.TELEGRAM_USER_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '855974944390';
    const destinationChatId = /^\d+$/.test(normalizedTarget) ? normalizedTarget : fallbackChatId;

    const messageText = [
      `🔐 <b>SH-Shop Login Verification</b>`,
      ``,
      `លេខកូដសម្ងាត់សម្រាប់ចូលប្រើប្រាស់: <code>${code}</code>`,
      `Your verification code: <code>${code}</code>`,
      ``,
      `⏳ សុពលភាព: 10 នាទី (Valid for 10 minutes)`,
      `⚠️ សូមកុំចែករំលែកកូដនេះទៅកាន់អ្នកដទៃ (Do not share this code)`,
      normalizedTarget !== destinationChatId ? `👤 គណនី: @${normalizedTarget}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await sendTelegramMessage({
      chatId: destinationChatId,
      text: messageText,
      botToken: token,
    });

    res.json({
      success: true,
      message: 'Verification code sent to Telegram',
      data: {
        target: normalizedTarget,
        expiresIn: 600,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Verify 6-digit Telegram OTP code and log in
 */
export const verifyTelegramLoginCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { target, code } = req.body as { target?: string; code?: string };
    const rawTarget = String(target || '').trim().replace(/^@/, '').toLowerCase();
    const rawCode = String(code || '').trim();

    if (!rawTarget || !rawCode) {
      res.status(400).json({ success: false, message: 'Target and code are required' });
      return;
    }

    const entry = telegramLoginOtps.get(rawTarget);
    if (!entry || entry.code !== rawCode || Date.now() > entry.expiresAt) {
      res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
      return;
    }

    telegramLoginOtps.delete(rawTarget);

    const isNumericId = /^\d+$/.test(rawTarget);
    const authData = await processTelegramUserAuth(req, {
      id: isNumericId ? rawTarget : `user_${rawTarget}`,
      username: isNumericId ? undefined : rawTarget,
      first_name: rawTarget,
    });

    res.json({
      success: true,
      message: 'Telegram verification successful',
      data: authData,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        provider: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true, wishlist: true, addresses: true } },
      },
    });

    if (!user) throw new AppError('User not found', 404);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, phone, avatar } = req.body;
    const updateData: { name?: string; phone?: string; avatar?: string } = {};

    if (typeof name !== 'undefined') {
      const displayName = normalizeDisplayName(String(name));
      if (!displayName) throw new AppError('Name is required', 400);
      if (!DISPLAY_NAME_PATTERN.test(displayName)) {
        throw new AppError(
          'Name may only include letters (any script), spaces, hyphens (-), apostrophes, periods, and parentheses',
          400
        );
      }
      updateData.name = displayName;
    }

    if (typeof phone !== 'undefined') {
      const phoneDigits = normalizePhoneDigits(String(phone));
      if (phoneDigits && !/^\d{8,15}$/.test(phoneDigits)) {
        throw new AppError('Phone can contain numbers only (8-15 digits)', 400);
      }
      updateData.phone = phoneDigits || '';
    }

    if (typeof avatar !== 'undefined') {
      updateData.avatar = sanitizeAvatarUrl(String(avatar));
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true, wishlist: true, addresses: true } },
      },
    });

    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

    if (!newPassword) {
      throw new AppError('New password is required', 400);
    }

    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    if (newPassword.length < 8 || !hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      throw new AppError('New password must include upper, lower, number, special character and be at least 8 characters', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('User not found', 404);

    if (user.provider === 'LOCAL') {
      if (!currentPassword) throw new AppError('Current password is required', 400);
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) throw new AppError('Current password is incorrect', 400);
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) throw new AppError('New password must be different from current password', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword, provider: 'LOCAL', tokenVersion: { increment: 1 } },
    });

    logAudit(req.user!.id, 'PASSWORD_CHANGE', null, getRequestIp(req));
    const tokens = buildTokenPair(updated);
    res.json({ success: true, message: 'Password changed successfully', data: tokens });
  } catch (error) {
    next(error);
  }
};

export const requestPasswordResetByEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) throw new AppError('Email is required', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('No account found with this email address. Please check and try again.', 404);
    }

    // Standard 6-digit verification OTP
    const code = String(crypto.randomInt(100000, 1000000));
    const mail = buildPasswordResetEmail(code, user.name, email);
    storeForgotPasswordCode(email, { code, expiresAt: Date.now() + 15 * 60 * 1000 });

    let emailSent = false;
    try {
      emailSent = await sendEmail({
        to: email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    } catch (err) {
      console.error('[Auth] Password reset email delivery failed:', err);
    }

    // Also dispatch to configured Telegram bot so admin/user receives code immediately
    const tgChatId = process.env.TELEGRAM_USER_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    if (tgChatId) {
      try {
        await sendTelegramMessage({
          chatId: tgChatId,
          text: `🔐 <b>SH-Shop Password Reset OTP</b>\n\n` +
                `👤 <b>Account:</b> <code>${email}</code>\n` +
                `🔢 <b>Verification Code:</b> <code>${code}</code>\n` +
                `⏳ <i>Valid for 10 minutes</i>`
        });
      } catch (tgErr) {
        console.error('[Auth] Telegram OTP dispatch failed:', tgErr);
      }
    }

    console.log(`[Auth] 🔑 Password reset OTP for ${email}: ${code} (emailSent=${emailSent})`);

    const isDev = process.env.NODE_ENV !== 'production';

    res.json({
      success: true,
      emailSent,
      message: emailSent
        ? 'Verification code has been sent to your email.'
        : 'Verification code generated.',
      devOtp: isDev ? code : undefined,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordByEmailCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!email || !code || !newPassword) throw new AppError('Email, code and newPassword are required', 400);

    const saved = forgotPasswordCodes.get(email);
    if (!saved || saved.expiresAt < Date.now() || saved.code !== code) {
      throw new AppError('Invalid verification code', 400);
    }

    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    if (newPassword.length < 8 || !hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      throw new AppError('New password must include upper, lower, number, special character and be at least 8 characters', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('User not found', 404);
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword, tokenVersion: { increment: 1 } } });
    forgotPasswordCodes.delete(email);
    logAudit(user.id, 'PASSWORD_RESET', 'Via email code', getRequestIp(req));

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

export const refreshTokenHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Read refresh token from HttpOnly cookie (primary) or body (legacy fallback)
    const cookieToken: string | undefined = (req as any).cookies?.refreshToken;
    const bodyToken: string | undefined = (req.body as any)?.refreshToken;
    const incomingToken = cookieToken || bodyToken;

    if (!incomingToken) {
      throw new AppError('Refresh token is required', 400);
    }

    // 1. Verify JWT signature & expiry
    let decoded: { id: string; tokenVersion: number };
    try {
      decoded = jwt.verify(incomingToken, process.env.JWT_SECRET! + '_refresh') as typeof decoded;
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // 2. Verify hash against DB session row (reuse detection)
    const incomingHash = hashToken(incomingToken);
    const session = await prisma.refreshTokenSession.findFirst({
      where: { userId: decoded.id, expiresAt: { gt: new Date() } },
    });

    if (!session || session.tokenHash !== incomingHash) {
      // Token presented is not the latest one → possible reuse attack
      // Nuke ALL sessions for this user and force re-login
      await prisma.refreshTokenSession.deleteMany({ where: { userId: decoded.id } });
      res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
      throw new AppError('Session compromised — please log in again', 403);
    }

    // 3. Load user and check tokenVersion
    const user = await prisma.user.findFirst({ where: { id: decoded.id, isActive: true } });
    if (!user) throw new AppError('User not found or inactive', 401);
    if (user.tokenVersion !== decoded.tokenVersion) {
      await clearRefreshSession(user.id, res);
      throw new AppError('Token has been revoked — please log in again', 401);
    }

    // 4. Token Rotation: issue brand-new token pair, replace DB row
    const tokens = buildTokenPair(user);
    await persistRefreshSession(
      user.id,
      tokens.refreshToken,
      req.get('user-agent'),
      getRequestIp(req)
    );
    setRefreshCookie(res, tokens.refreshToken);

    res.json({ success: true, data: { token: tokens.token, refreshToken: tokens.refreshToken } });
  } catch (error) {
    next(error);
  }
};

/** Logout: clear cookie + invalidate DB session. */
export const logoutHandler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await clearRefreshSession(userId, res);
    } else {
      res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordByInfo = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
  next(new AppError('Password reset by name+phone is disabled for security. Please use email verification instead.', 403));
};
