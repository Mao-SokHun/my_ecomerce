import type { AppLanguage } from '@/lib/i18n';
import { t } from '@/lib/i18n';

/** Icon per category slug — mirrors seed top-level categories */
export const SHOP_CATEGORY_ICON: Record<string, string> = {
  electronics: '📱',
  fashion: '👕',
  'home-living': '🏠',
  sports: '⚽',
  books: '📚',
  beauty: '💄',
  groceries: '🛒',
  automotive: '🚗',
};

const SLUG_TO_I18N: Record<string, string> = {
  electronics: 'electronics',
  fashion: 'fashion',
  'home-living': 'homeGarden',
  sports: 'sports',
  books: 'navBooks',
  beauty: 'navBeautyCare',
  groceries: 'navGroceries',
  automotive: 'navAutomotive',
};

export type ShopNavCategory = { slug: string; name: string };

/** Default list when API has not loaded yet (matches prisma seed top-level). */
export const STATIC_SHOP_NAV_CATEGORIES: ShopNavCategory[] = [
  { slug: 'electronics', name: 'Electronics' },
  { slug: 'fashion', name: 'Fashion' },
  { slug: 'home-living', name: 'Home & Living' },
  { slug: 'sports', name: 'Sports & Outdoors' },
  { slug: 'books', name: 'Books' },
  { slug: 'beauty', name: 'Beauty & Personal Care' },
  { slug: 'groceries', name: 'Groceries' },
  { slug: 'automotive', name: 'Automotive' },
];

export function shopCategoryIcon(slug: string): string {
  return SHOP_CATEGORY_ICON[slug] ?? '📦';
}

export function shopCategoryLabel(lang: AppLanguage, slug: string, apiName: string): string {
  const key = SLUG_TO_I18N[slug];
  if (key) return t(lang, key);
  return apiName;
}
