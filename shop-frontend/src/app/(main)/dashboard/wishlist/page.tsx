'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { userApi } from '@/lib/api';
import { Product } from '@/types';
import { ProductCard } from '@/components/products/ProductCard';
import { t } from '@/lib/i18n';

type WishlistRow = {
  id: string;
  product: Product;
};

export default function DashboardWishlistPage() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { isAuthenticated, isAuthChecked } = useAuthStore();
  const [items, setItems] = useState<WishlistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/dashboard/wishlist');
      return;
    }

    userApi
      .getWishlist(language)
      .then(({ data }) => setItems(data.data || []))
      .catch(() => toast.error(t(language, 'failedUpdateWishlist')))
      .finally(() => setLoading(false));
  }, [isAuthChecked, isAuthenticated, language, router]);

  if (!isAuthChecked) return null;

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t(language, 'wishlist')}</h1>
        <Link href="/products" className="btn-secondary text-sm">
          {t(language, 'browseProducts')}
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`wishlist-skeleton-${i}`} className="card animate-pulse">
              <div className="aspect-square bg-gray-200 dark:bg-gray-800" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t(language, 'wishlist')}</h3>
          <p className="text-gray-500 mb-4">{t(language, 'wishlistEmpty')}</p>
          <Link href="/products" className="btn-primary text-sm">
            {t(language, 'browseProducts')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((row) => (
            <ProductCard key={row.id} product={row.product} />
          ))}
        </div>
      )}
    </div>
  );
}
