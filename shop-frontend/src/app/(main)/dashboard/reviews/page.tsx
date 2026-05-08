'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { reviewApi } from '@/lib/api';
import { t } from '@/lib/i18n';

type ReviewRow = {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  createdAt: string;
  product: { id: string; name: string; slug: string; thumbnail?: string | null };
};

export default function DashboardReviewsPage() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { isAuthenticated, isAuthChecked, fetchUser } = useAuthStore();
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/dashboard/reviews');
      return;
    }

    reviewApi
      .getMine()
      .then(({ data }) => setItems(data.data || []))
      .catch(() => toast.error(t(language, 'failedLoadReviews')))
      .finally(() => setLoading(false));
  }, [isAuthChecked, isAuthenticated, language, router]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t(language, 'remove') + '?')) return;
    try {
      await reviewApi.delete(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
      await fetchUser();
      toast.success(t(language, 'deletedSuccess'));
    } catch {
      toast.error(t(language, 'updateFailed'));
    }
  };

  if (!isAuthChecked) return null;

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t(language, 'myReviewsPage')}</h1>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`rev-skel-${i}`} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <p className="mb-4">{t(language, 'reviewsEmpty')}</p>
          <Link href="/products" className="btn-primary text-sm inline-block">
            {t(language, 'browseProducts')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id} className="card p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={`${r.id}-star-${i}`} className={`w-4 h-4 ${i < r.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.title ? <p className="font-semibold text-gray-900 dark:text-white">{r.title}</p> : null}
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 whitespace-pre-wrap">{r.comment}</p>
                <Link href={`/products/${r.product.slug}`} className="text-primary-600 text-sm font-medium mt-2 inline-block">
                  {t(language, 'viewProduct')}: {r.product.name}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(r.id)}
                className="shrink-0 inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" /> {t(language, 'remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
