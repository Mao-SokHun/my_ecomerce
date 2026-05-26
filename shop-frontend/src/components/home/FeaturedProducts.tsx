'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Product } from '@/types';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductSkeleton } from '@/components/ui/Skeleton';
import { productApi } from '@/lib/api';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguageStore();

  useEffect(() => {
    productApi.getFeatured(language)
      .then(({ data }) => setProducts(data.data || []))
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
    <section className="py-10 sm:py-16 page-container">
      <div className="flex items-end justify-between mb-5 sm:mb-8">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-primary-600 mb-0.5 sm:mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t(language, 'trending')}
          </p>
          <h2 className="section-title text-xl sm:text-2xl">{t(language, 'featuredProducts')}</h2>
        </div>
        <Link
          href="/products?featured=true"
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {t(language, 'viewAll')} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-6 sm:mt-10">
        <Link href="/products" className="btn-secondary inline-flex text-sm sm:text-base">
          {t(language, 'browseAllProducts')} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
