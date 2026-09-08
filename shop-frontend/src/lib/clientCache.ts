/**
 * Client-Side Instant Cache (SWR / Stale-While-Revalidate + LocalStorage)
 * Eliminates skeleton delay when loading categories, featured products, and settings.
 */

import { Category } from '@/types';

const CACHE_PREFIX = 'sh_cache_v1_';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// In-memory fallback if localStorage is unavailable
const memoryCache = new Map<string, CacheItem<unknown>>();

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Get cached data synchronously (from localStorage or memory)
 */
export function getLocalCache<T>(key: string, maxAgeMs = 1000 * 60 * 30): T | null {
  const fullKey = CACHE_PREFIX + key;

  // Try memory first
  const mem = memoryCache.get(fullKey);
  if (mem && Date.now() - mem.timestamp < maxAgeMs) {
    return mem.data as T;
  }

  // Try localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheItem<T>;
      if (Date.now() - parsed.timestamp < maxAgeMs) {
        memoryCache.set(fullKey, parsed);
        return parsed.data;
      }
    } catch {
      // Ignore parse / storage quota errors
    }
  }

  return null;
}

/**
 * Save data to cache (both memory and localStorage)
 */
export function setLocalCache<T>(key: string, data: T): void {
  const fullKey = CACHE_PREFIX + key;
  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };

  memoryCache.set(fullKey, item as CacheItem<unknown>);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch {
      // Ignore quota errors
    }
  }
}

/**
 * Deduplicate in-flight promises so multiple components calling the same API share 1 network call
 */
export async function deduplicateRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Pre-seeded default categories so 1st-time visitors immediately see rich categories
 * instead of empty skeleton loaders while the API is responding.
 */
export const PRELOADED_CATEGORIES: Category[] = [
  {
    id: 'cat-electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Smartphones, accessories, audio & gadgets',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&auto=format&fit=crop',
    totalProducts: 48,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'cat-fashion',
    name: 'Fashion & Clothing',
    slug: 'fashion',
    description: 'Men & Women modern apparel & streetwear',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&auto=format&fit=crop',
    totalProducts: 64,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'cat-home-living',
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Decor, kitchenware, furniture & essentials',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop',
    totalProducts: 32,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'cat-sports',
    name: 'Sports & Outdoors',
    slug: 'sports',
    description: 'Fitness gear, sportswear & outdoor recreation',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=400&auto=format&fit=crop',
    totalProducts: 26,
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'cat-beauty',
    name: 'Beauty & Personal Care',
    slug: 'beauty',
    description: 'Skincare, cosmetics, fragrances & grooming',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop',
    totalProducts: 38,
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 'cat-groceries',
    name: 'Groceries & Foods',
    slug: 'groceries',
    description: 'Fresh organic foods, snacks & beverages',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop',
    totalProducts: 42,
    sortOrder: 6,
    isActive: true,
  },
  {
    id: 'cat-books',
    name: 'Books & Stationery',
    slug: 'books',
    description: 'Educational, fiction, supplies & office goods',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&auto=format&fit=crop',
    totalProducts: 20,
    sortOrder: 7,
    isActive: true,
  },
  {
    id: 'cat-automotive',
    name: 'Automotive & Motors',
    slug: 'automotive',
    description: 'Vehicle accessories, parts & care tools',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop',
    totalProducts: 18,
    sortOrder: 8,
    isActive: true,
  },
];
