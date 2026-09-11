import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const formatPrice = (price: number, lang: string = 'en', currency: string = 'USD'): string => {
  const locale = lang === 'km' ? 'km-KH' : lang === 'zh' ? 'zh-CN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);
};

export const formatKhrPrice = (priceInUsd: number, exchangeRate: number = 4100): string => {
  const khrAmount = Math.round((priceInUsd || 0) * exchangeRate);
  return `៛${khrAmount.toLocaleString('en-US')}`;
};

export const formatDualPrice = (priceInUsd: number, exchangeRate: number = 4100): { usd: string; khr: string; display: string } => {
  const usd = formatPrice(priceInUsd || 0);
  const khr = formatKhrPrice(priceInUsd || 0, exchangeRate);
  return { usd, khr, display: `${usd} (${khr})` };
};

export const formatDate = (date: string | Date, lang: string = 'en'): string => {
  const locale = lang === 'km' ? 'km-KH' : lang === 'zh' ? 'zh-CN' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date: string | Date, lang: string = 'en'): string => {
  const locale = lang === 'km' ? 'km-KH' : lang === 'zh' ? 'zh-CN' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const getDiscountPercent = (price: number, comparePrice: number): number => {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
};

export const getOrderStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PENDING:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 dark:border-amber-500/30',
    CONFIRMED:
      'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25 dark:border-sky-500/30',
    PROCESSING:
      'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25 dark:border-purple-500/30',
    SHIPPED:
      'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25 dark:border-blue-500/30',
    DELIVERED:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 dark:border-emerald-500/30',
    CANCELLED:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 dark:border-rose-500/30',
    REFUNDED:
      'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25 dark:border-slate-500/30',
  };
  return (
    colors[status] ||
    'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/25 dark:border-gray-500/30'
  );
};

export const getPaymentStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PENDING:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 dark:border-rose-500/30',
    PAID:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 dark:border-emerald-500/30',
    FAILED:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 dark:border-rose-500/30',
    REFUNDED:
      'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25 dark:border-purple-500/30',
  };
  return (
    colors[status] ||
    'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/25 dark:border-gray-500/30'
  );
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Normalizes pasted image links to a full URL so Next/Image, store, and phones load reliably.
 * - `https://…` / `http://…` unchanged
 * - `//cdn…` → `https://cdn…`
 * - `/uploads/…` → `${origin}/uploads/…` (uses browser origin, or optional base URL)
 */
export function resolveToFullImageUrl(
  raw: string,
  baseUrl?: string
): string {
  const s = raw.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) {
    const origin =
      baseUrl?.replace(/\/$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    return origin ? `${origin}${s}` : s;
  }
  return s;
}

/** Split gallery text by comma or newline, trim, resolve each segment to a full image URL. */
export function normalizeImageListToFullUrls(imagesStr: string, baseUrl?: string): string[] {
  return imagesStr
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((u) => resolveToFullImageUrl(u, baseUrl));
}

/** Same rules as shop-backend `displayName.ts` (Khmer/Latin names with spaces). */
export const DISPLAY_NAME_PATTERN = /^[-\p{L}\p{M}\s'.()]+$/u;

const INVISIBLE_FORMAT_CHARS = /[\u200B-\u200D\uFEFF\u2060]/g;

export function normalizeDisplayName(raw: string): string {
  return String(raw)
    .normalize('NFC')
    .replace(INVISIBLE_FORMAT_CHARS, '')
    .trim()
    .replace(/\s+/g, ' ');
}
