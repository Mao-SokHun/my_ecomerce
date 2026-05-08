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
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    SHIPPED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getPaymentStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
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
