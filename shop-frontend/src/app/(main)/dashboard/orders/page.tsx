'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ChevronRight, Eye } from 'lucide-react';
import { Order } from '@/types';
import { orderApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { formatPrice, formatDate, getOrderStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, isAuthChecked } = useAuthStore();
  const { language } = useLanguageStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    orderApi.getAll().then(({ data }) => setOrders(data.data || [])).finally(() => setLoading(false));
  }, [isAuthChecked, isAuthenticated, router]);

  if (!isAuthChecked) return null;

  const handleCancel = async (orderId: string) => {
    try {
      await orderApi.cancel(orderId);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
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
      toast.error(t(language, 'failedUpdate'));
    }
  };

  const getOrderDetailsPath = (orderId: string, orderNumber: string) => {
    const safeOrderNumber = orderNumber.trim().replace(/\s+/g, '-');
    return `/dashboard/orders/${encodeURIComponent(`${safeOrderNumber}__${orderId}`)}`;
  };

  return (
    <div className="page-container py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-primary-600">{t(language, 'breadcrumbHome')}</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard" className="hover:text-primary-600">{t(language, 'breadcrumbAccount')}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-white">{t(language, 'breadcrumbOrders')}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t(language, 'breadcrumbOrders')}</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={`order-history-skeleton-${i}`} className="card p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 card bg-gray-50/50 dark:bg-surface-900/50 border-dashed">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t(language, 'noOrdersYet')}</h2>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">{t(language, 'startShoppingPrompt')}</p>
          <Link href="/products" className="btn-primary px-8 py-3">
            {t(language, 'browseProducts')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-bold text-sm font-mono text-gray-900 dark:text-white">{order.orderNumber}</p>
                    <span className={`badge ${getOrderStatusColor(order.status)} underline-offset-4`}>
                      {t(language, `orderStatus_${order.status}`)}
                    </span>
                    <span className={`badge ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {t(language, order.paymentStatus === 'PAID' ? 'paymentStatus_PAID' : 'paymentStatus_PENDING')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(order.createdAt, language)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {order.items.slice(0, 3).map((item) => (
                      <span key={item.id} className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-surface-800 px-2 py-0.5 rounded">
                        {item.name} ×{item.quantity}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{t(language, 'browseMore').replace('{count}', String(order.items.length - 3))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{formatPrice(order.total, language)}</p>
                    <p className="text-xs text-gray-500">{t(language, 'itemsCount').replace('{count}', String(order.items.length))}</p>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={getOrderDetailsPath(order.id, order.orderNumber)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {['PENDING', 'CONFIRMED'].includes(order.status) && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors font-semibold"
                      >
                        {t(language, 'cancel')}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveHistory(order.id)}
                      className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-surface-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
                    >
                      {t(language, 'remove')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
