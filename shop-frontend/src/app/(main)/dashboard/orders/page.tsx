'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Package, ChevronRight, Eye, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Order } from '@/types';
import { orderApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { formatPrice, formatDate, getOrderStatusColor, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function orderStatusAccent(status: Order['status']): string {
  const map: Record<Order['status'], string> = {
    PENDING: 'border-l-amber-400',
    CONFIRMED: 'border-l-sky-500',
    PROCESSING: 'border-l-violet-500',
    SHIPPED: 'border-l-indigo-500',
    DELIVERED: 'border-l-emerald-500',
    CANCELLED: 'border-l-rose-500',
    REFUNDED: 'border-l-slate-400',
  };
  return map[status] ?? 'border-l-gray-300';
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, isAuthChecked } = useAuthStore();
  const { language } = useLanguageStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    orderApi
      .getAll()
      .then(({ data }) => setOrders(data.data || []))
      .finally(() => setLoading(false));
  }, [isAuthChecked, isAuthenticated, router]);

  if (!isAuthChecked) return null;

  const handleCancel = async (orderId: string) => {
    try {
      await orderApi.cancel(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o)));
      toast.success(t(language, 'orderStatus_CANCELLED'));
    } catch {
      toast.error(t(language, 'cannotCancelOrder'));
    }
  };

  const handleRemoveHistory = async (orderId: string) => {
    try {
      await orderApi.archiveHistory(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      toast.success(t(language, 'orderRemoved'));
    } catch {
      toast.error(t(language, 'updateFailed'));
    }
  };

  const getOrderDetailsPath = (orderId: string, orderNumber: string) => {
    const safeOrderNumber = orderNumber.trim().replace(/\s+/g, '-');
    return `/dashboard/orders/${encodeURIComponent(`${safeOrderNumber}__${orderId}`)}`;
  };

  return (
    <div className="page-container py-6 sm:py-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 min-w-0"
      >
        <Link href="/" className="hover:text-primary-600 transition-colors shrink-0">
          {t(language, 'breadcrumbHome')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-60" aria-hidden />
        <Link href="/dashboard" className="hover:text-primary-600 transition-colors shrink-0">
          {t(language, 'breadcrumbAccount')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-60" aria-hidden />
        <span className="text-gray-900 dark:text-white font-medium min-w-0 break-words">
          {t(language, 'breadcrumbOrders')}
        </span>
      </nav>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {t(language, 'breadcrumbOrders')}
        </h1>
        {!loading && orders.length > 0 && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {t(language, 'ordersListSummary', { count: orders.length })}
          </p>
        )}
      </div>

      {loading ? (
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={`order-history-skeleton-${i}`}
              className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-900 p-5 animate-pulse"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="h-14 w-14 rounded-2xl bg-gray-200 dark:bg-surface-800 shrink-0" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-5 w-44 rounded-lg bg-gray-200 dark:bg-surface-800" />
                  <div className="h-4 w-28 rounded bg-gray-100 dark:bg-surface-800" />
                  <div className="h-16 max-w-sm rounded-xl bg-gray-100 dark:bg-surface-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-surface-900/50">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20 mb-5">
            <Package className="w-10 h-10 text-primary-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{t(language, 'noOrdersYet')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
            {t(language, 'startShoppingPrompt')}
          </p>
          <Link href="/products" className="btn-primary px-8 py-3 inline-flex shadow-premium">
            {t(language, 'browseProducts')}
          </Link>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {orders.map((order, index) => {
            const detailHref = getOrderDetailsPath(order.id, order.orderNumber);
            const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const preview = order.items.slice(0, 3);
            const moreCount = Math.max(0, order.items.length - preview.length);

            return (
              <motion.article
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.35) }}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-900 shadow-sm',
                  'hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300',
                  'border-l-[4px] max-w-full',
                  orderStatusAccent(order.status),
                )}
              >
                <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-center lg:gap-6">
                  <div className="flex min-w-0 w-full gap-3 sm:gap-3.5 lg:w-auto lg:max-w-xl">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/80 dark:from-primary-900/40 dark:to-primary-900/20 text-primary-600 dark:text-primary-400 shadow-inner ring-1 ring-primary-200/60 dark:ring-primary-800/40 sm:h-11 sm:w-11">
                      <Package className="w-5 h-5" strokeWidth={1.75} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-3 sm:gap-y-2">
                        <span className="inline-flex w-fit max-w-full font-mono text-[13px] sm:text-sm font-bold tracking-wide text-gray-900 dark:text-white px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-surface-800 ring-1 ring-gray-200/80 dark:ring-gray-700 break-all">
                          {order.orderNumber}
                        </span>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10',
                              getOrderStatusColor(order.status),
                            )}
                          >
                            {t(language, `orderStatus_${order.status}`)}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                              order.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-900 ring-emerald-600/15 dark:bg-emerald-900/35 dark:text-emerald-300 dark:ring-emerald-500/25'
                                : 'bg-amber-50 text-amber-950 ring-amber-600/15 dark:bg-amber-900/35 dark:text-amber-200 dark:ring-amber-500/25',
                            )}
                          >
                            {t(language, order.paymentStatus === 'PAID' ? 'paymentStatus_PAID' : 'paymentStatus_PENDING')}
                          </span>
                        </div>
                      </div>

                      <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
                        <span>{formatDate(order.createdAt, language)}</span>
                      </p>

                      <div className="flex flex-col gap-2 pt-0.5">
                        {preview.map((item) => (
                          <div
                            key={item.id}
                            className="flex min-w-0 w-full max-w-full items-center gap-2.5 rounded-xl bg-gray-50 dark:bg-surface-800/90 pl-2 pr-3 py-2 ring-1 ring-gray-100 dark:ring-gray-700/90"
                          >
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-surface-700">
                              {item.image ? (
                                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="40px" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-gray-800 dark:text-gray-100 [overflow-wrap:anywhere] line-clamp-2">
                              {item.name}
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                              ×{item.quantity}
                            </span>
                          </div>
                        ))}
                        {moreCount > 0 && (
                          <Link
                            href={detailHref}
                            className="inline-flex min-h-10 w-full max-w-full items-center justify-center rounded-xl bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 ring-1 ring-primary-200/80 transition-colors hover:bg-primary-100 dark:bg-primary-900/25 dark:text-primary-300 dark:ring-primary-800/60 dark:hover:bg-primary-900/40"
                          >
                            {t(language, 'orderMoreLines', { count: moreCount })}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 w-full shrink-0 flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:w-full lg:w-[13.5rem] lg:border-l lg:border-t-0 lg:border-gray-100 lg:pl-5 lg:pt-0 lg:dark:border-gray-800">
                    <div className="rounded-xl bg-gray-50/90 px-3 py-2.5 dark:bg-surface-800/70 lg:bg-transparent lg:p-0 lg:dark:bg-transparent">
                      <div className="text-center lg:text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          {t(language, 'total')}
                        </p>
                        <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white leading-tight sm:text-xl">
                          {formatPrice(order.total, language)}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                          {t(language, 'itemsCount', { count: totalQty })}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-2">
                      <Link
                        href={detailHref}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 active:scale-[0.99] hover:bg-primary-700 motion-safe:transition-transform"
                      >
                        <Eye className="w-4 h-4 shrink-0" aria-hidden />
                        {t(language, 'viewOrder')}
                      </Link>
                      <div
                        className={cn(
                          'grid w-full gap-2',
                          ['PENDING', 'CONFIRMED'].includes(order.status) ? 'grid-cols-2' : 'grid-cols-1',
                        )}
                      >
                        {['PENDING', 'CONFIRMED'].includes(order.status) && (
                          <button
                            type="button"
                            onClick={() => handleCancel(order.id)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 active:bg-red-50 dark:border-red-900/60 dark:bg-surface-900 dark:text-red-400 dark:active:bg-red-950/40 dark:hover:bg-red-950/40"
                          >
                            {t(language, 'cancel')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveHistory(order.id)}
                          className={cn(
                            'inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 active:bg-gray-100 dark:border-gray-700 dark:bg-surface-800 dark:text-gray-300 dark:active:bg-surface-700 dark:hover:bg-surface-700',
                            !['PENDING', 'CONFIRMED'].includes(order.status) && 'col-span-full',
                          )}
                        >
                          {t(language, 'remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
