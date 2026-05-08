'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { userApi } from '@/lib/api';
import { Address } from '@/types';
import { t } from '@/lib/i18n';

export default function DashboardAddressesPage() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { isAuthenticated, isAuthChecked, fetchUser } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    userApi
      .getAddresses()
      .then(({ data }) => setAddresses(data.data || []))
      .catch(() => toast.error(t(language, 'failedLoadAddresses')))
      .finally(() => setLoading(false));
  }, [language]);

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/dashboard/addresses');
      return;
    }
    load();
  }, [isAuthChecked, isAuthenticated, router, load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t(language, 'remove') + '?')) return;
    try {
      await userApi.deleteAddress(id, language);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      await fetchUser();
      toast.success(t(language, 'deletedSuccess'));
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(msg || t(language, 'updateFailed'));
    }
  };

  if (!isAuthChecked) return null;

  const formatLine = (a: Address) =>
    [a.province, a.district, a.commune, a.village, a.street, a.roadNumber].filter(Boolean).join(', ');

  return (
    <div className="page-container py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t(language, 'myAddressesPage')}</h1>
        <Link href="/checkout" className="btn-primary text-sm text-center">
          {t(language, 'goToCheckout')}
        </Link>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t(language, 'addressesPageHint')}</p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={`addr-skel-${i}`} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="mb-4">{t(language, 'addressesEmpty')}</p>
          <Link href="/checkout" className="btn-primary text-sm inline-block">
            {t(language, 'goToCheckout')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((a) => (
            <li key={a.id} className="card p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white">{a.name}</span>
                  {a.isDefault ? (
                    <span className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 px-2 py-0.5 rounded">
                      {t(language, 'default')}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{a.phone}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{formatLine(a)}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(a.id)}
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
