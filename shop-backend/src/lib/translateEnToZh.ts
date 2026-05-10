import fs from 'fs';
import https from 'https';
import path from 'path';

const CACHE_PATH = path.join(process.cwd(), 'src/data/cambodia_location_zh_cache.json');

type CacheShape = Record<string, string>;

function loadDiskCache(): CacheShape {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) as CacheShape;
    }
  } catch {
    /* ignore */
  }
  return {};
}

let memoryCache: CacheShape = loadDiskCache();
let pendingSave: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (pendingSave) clearTimeout(pendingSave);
  pendingSave = setTimeout(() => {
    pendingSave = null;
    try {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(memoryCache, null, 0), 'utf8');
    } catch {
      /* ignore */
    }
  }, 800);
}

function gtxTranslate(sl: string, tl: string, text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve('');

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(
    trimmed
  )}`;

  return new Promise((resolve) => {
    https
      .get(url, { timeout: 25000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as unknown;
            if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
              const parts = parsed[0] as Array<[string, string, ...unknown[]]>;
              resolve(parts.map((p) => p[0]).join('').trim());
            } else {
              resolve(trimmed);
            }
          } catch {
            resolve(trimmed);
          }
        });
      })
      .on('error', () => resolve(trimmed));
  });
}

const LATIN = /[A-Za-z]/;

function looksLikeChinese(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s) && !LATIN.test(s);
}

function cacheKey(en: string, km?: string): string {
  return JSON.stringify([en.trim(), km?.trim() || '']);
}

/** True if this pair is already in the in-memory translation cache (disk cache is loaded at startup). */
export function isEnPlaceNameCached(en: string, nameKh?: string | null): boolean {
  const e = en.trim();
  const km = nameKh?.trim() || '';
  const key = cacheKey(e, km || undefined);
  return Boolean(key && memoryCache[key]);
}

/**
 * English / Khmer place name → Simplified Chinese (no Latin in result when possible).
 * Cached by (en, optional kh) pair.
 */
export async function enPlaceNameToZh(en: string, nameKh?: string | null): Promise<string> {
  if (process.env.CAMBODIA_SKIP_TRANSLATION === '1') {
    return '';
  }
  const e = en.trim();
  const km = nameKh?.trim() || '';
  const key = cacheKey(e, km || undefined);

  if (key && memoryCache[key]) {
    return memoryCache[key];
  }

  let zh = e ? await gtxTranslate('en', 'zh-CN', e) : '';
  if (!looksLikeChinese(zh) && km) {
    zh = await gtxTranslate('km', 'zh-CN', km);
  }
  if (!looksLikeChinese(zh) && e) {
    zh = await gtxTranslate('en', 'zh-CN', e);
  }

  if (!looksLikeChinese(zh)) {
    zh = km ? await gtxTranslate('km', 'zh-CN', km) : zh;
  }

  if (!key) return zh || '';

  memoryCache[key] = zh;
  scheduleSave();
  return zh;
}

export function flushZhCache(): void {
  if (pendingSave) clearTimeout(pendingSave);
  pendingSave = null;
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(memoryCache, null, 0), 'utf8');
  } catch {
    /* ignore */
  }
}

export function delayMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
