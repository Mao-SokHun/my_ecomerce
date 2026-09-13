'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import { Product } from '@/types';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductSkeleton } from '@/components/ui/Skeleton';
import { productApi } from '@/lib/api';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { getLocalCache } from '@/lib/clientCache';

export function FeaturedProducts() {
  const { language } = useLanguageStore();

  const [products, setProducts] = useState<Product[]>(() => {
    const cached = getLocalCache<Product[]>(`featured_products_${language}`);
    if (Array.isArray(cached) && cached.length > 0) return cached;
    const fallback = getLocalCache<Product[]>('featured_products_km') || getLocalCache<Product[]>('featured_products_en');
    return Array.isArray(fallback) ? fallback : [];
  });

  const [loading, setLoading] = useState(() => {
    const cached = getLocalCache<Product[]>(`featured_products_${language}`);
    return !(Array.isArray(cached) && cached.length > 0);
  });

  useEffect(() => {
    productApi.getFeatured(language)
      .then(({ data }) => {
        if (Array.isArray(data?.data) && data.data.length > 0) {
          setProducts(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [language]);

  if (loading) {
    return (
      <section className="py-10 sm:py-16 page-container">
        <div className="h-6 sm:h-8 w-40 sm:w-48 bg-gray-100 dark:bg-surface-800 rounded-lg mb-5 sm:mb-8 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductSkeleton key={`featured-skeleton-${i}`} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-20 page-container">
      <div className="flex items-end justify-between mb-8 sm:mb-12 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>{t(language, 'trending')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {t(language, 'featuredProducts')}
          </h2>
        </div>
        <Link
          href="/products?featured=true"
          className="hidden sm:inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors group"
        >
          <span>{t(language, 'viewAll')}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-10 sm:mt-14">
        <Link
          href="/products"
          className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white bg-white dark:bg-surface-900 hover:bg-amber-50 dark:hover:bg-surface-800 border border-black/10 dark:border-white/15 hover:border-amber-400/50 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300"
        >
          <span>{t(language, 'browseAllProducts')}</span>
          <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
