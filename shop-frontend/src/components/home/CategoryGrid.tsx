'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Category } from '@/types';
import { categoryApi } from '@/lib/api';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { CategorySkeleton } from '@/components/ui/Skeleton';
import { CategoryScrollBar } from '@/components/home/CategoryScrollBar';
import { getLocalCache, PRELOADED_CATEGORIES } from '@/lib/clientCache';

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>(() => {
    const cached = getLocalCache<Category[]>('categories_all');
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return PRELOADED_CATEGORIES;
  });
  const { language } = useLanguageStore();
  const countLocale = language === 'km' ? 'km-KH' : language === 'zh' ? 'zh-CN' : 'en-US';

  useEffect(() => {
    categoryApi
      .getAll()
      .then(({ data }) => {
        if (Array.isArray(data?.data) && data.data.length > 0) {
          setCategories(data.data);
        }
      })
      .catch(console.error);
  }, []);

  if (categories.length === 0) {
    return (
      <section className="py-16 page-container">
        <div className="h-8 w-48 bg-gray-100 dark:bg-surface-800 rounded-lg mb-8 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CategorySkeleton key={`cat-skeleton-${i}`} />
          ))}
        </div>
      </section>
    );
  }

  /** Prefer API aggregate (parent + all subcategories); fallback if older payload lacks totalProducts */
  const getDisplayCount = (category: Category): number => {
    if (typeof category.totalProducts === 'number' && Number.isFinite(category.totalProducts)) {
      return Math.max(0, category.totalProducts);
    }
    const selfCount = category._count?.products ?? 0;
    const childrenCount = (category.children || []).reduce(
      (sum, child) => sum + (child._count?.products ?? 0),
      0,
    );
    return selfCount + childrenCount;
  };

  const formatCount = (n: number) => n.toLocaleString(countLocale);

  return (
    <section className="py-12 sm:py-20 page-container">
      <div className="flex items-end justify-between mb-8 sm:mb-12 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 mb-2">
            <span>✦ {t(language, 'browse')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {t(language, 'shopByCategory')}
          </h2>
        </div>
        <Link
          href="/products"
          className="hidden sm:inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors group"
        >
          <span>{t(language, 'viewAll')}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Mobile: horizontal category bar */}
      <div className="sm:hidden mb-6">
        <CategoryScrollBar
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      </div>

      {/* Desktop/Tablet: Editorial Portrait Collection Cards */}
      <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {categories.map((category, i) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.05, duration: 0.45 }}
          >
            <Link
              href={`/products?category=${category.slug}`}
              className="group relative block aspect-[4/5] rounded-3xl overflow-hidden bg-slate-900 border border-black/[0.08] dark:border-white/[0.12] hover:border-amber-400/50 shadow-md hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 hover:-translate-y-1"
            >
              {/* Full Bleed Image */}
              {category.image ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center">
                  <span className="text-4xl text-amber-200/50 font-serif">{category.name[0]}</span>
                </div>
              )}

              {/* Rich Multi-stop Dark Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent z-[1] transition-opacity duration-500 group-hover:opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent z-[1]" />

              {/* Top Collection Badge */}
              <div className="absolute top-4 left-4 z-[2]">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-black/40 backdrop-blur-md text-white/90 border border-white/15">
                  DEPT 0{i + 1}
                </span>
              </div>

              {/* Bottom Card Content */}
              <div className="absolute bottom-0 inset-x-0 p-5 z-[2] flex flex-col justify-end">
                <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                  <p className="text-lg sm:text-xl font-bold text-white group-hover:text-amber-300 transition-colors drop-shadow-md">
                    {category.name}
                  </p>
                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/15">
                    <span className="text-xs text-amber-200/80 font-medium tabular-nums">
                      {t(language, 'itemsCount', { count: formatCount(getDisplayCount(category)) })}
                    </span>
                    <span className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-amber-400 group-hover:text-slate-950 text-white flex items-center justify-center transition-all duration-300 transform group-hover:scale-110">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Mobile "View all" link */}
      <div className="sm:hidden mt-6 text-center">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20"
        >
          <span>{t(language, 'viewAll')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
