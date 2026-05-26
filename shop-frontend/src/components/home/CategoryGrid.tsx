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

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([]);
  const { language } = useLanguageStore();
  const countLocale = language === 'km' ? 'km-KH' : language === 'zh' ? 'zh-CN' : 'en-US';

  useEffect(() => {
    categoryApi
      .getAll()
      .then(({ data }) => setCategories(Array.isArray(data?.data) ? data.data : []))
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
    <section className="py-10 sm:py-16 page-container">
      <div className="flex items-end justify-between mb-5 sm:mb-8">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-primary-600 mb-0.5 sm:mb-1">{t(language, 'browse')}</p>
          <h2 className="section-title text-xl sm:text-2xl">{t(language, 'shopByCategory')}</h2>
        </div>
        <Link
          href="/products"
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {t(language, 'viewAll')} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 sm:gap-4">
        {categories.map((category, i) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <Link
              href={`/products?category=${category.slug}`}
              className="group card h-full flex flex-col items-center gap-2.5 sm:gap-4 p-4 sm:p-6 hover:shadow-xl transition-all duration-500"
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl overflow-hidden glass group-hover:scale-110 transition-transform duration-500 shadow-sm">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 64px, 80px"
                  />
                ) : (
                  <div className="w-full h-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">{category.name[0]}</span>
                  </div>
                )}
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors truncate">
                  {category.name}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 tabular-nums">
                  {t(language, 'itemsCount', { count: formatCount(getDisplayCount(category)) })}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Mobile "View all" link */}
      <div className="sm:hidden mt-4 text-center">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {t(language, 'viewAll')} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
