import type { Request } from 'express';

export type AppLang = 'km' | 'en' | 'zh';

/**
 * Resolves UI language for API messages: body.lang, query.lang, then Accept-Language.
 * Defaults to Khmer (km).
 */
export function getRequestLang(req: Request): AppLang {
  const body = req.body as Record<string, unknown> | undefined;
  const fromBody = String(body?.lang ?? '').toLowerCase().trim();
  if (fromBody === 'en' || fromBody === 'zh' || fromBody === 'km') return fromBody;

  const fromQuery = String(req.query.lang ?? '').toLowerCase().trim();
  if (fromQuery === 'en' || fromQuery === 'zh' || fromQuery === 'km') return fromQuery;

  const al = String(req.headers['accept-language'] ?? '').toLowerCase();
  if (al.includes('zh')) return 'zh';
  if (al.includes('en')) return 'en';
  return 'km';
}
