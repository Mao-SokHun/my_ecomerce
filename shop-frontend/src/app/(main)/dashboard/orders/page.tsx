'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Package,
  ChevronRight,
  Eye,
  Calendar,
  Search,
  X,
  Copy,
  Check,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order } from '@/types';
import { orderApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { formatPrice, formatDate, getOrderStatusColor, getPaymentStatusColor, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useRealtime } from '@/providers/RealtimeProvider';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { isAuthenticated, isAuthChecked } = useAuthStore();
  const { language } = useLanguageStore();
  const isKhmer = language === 'km';
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

  const { socket } = useRealtime();

  // Instant Real-time WebSocket updates for customer's orders
  useEffect(() => {
    if (!socket) return;

    const handleOrderCreated = (newOrder: Order) => {
      if (!newOrder || !newOrder.id) return;
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === newOrder.id);
        if (exists) return prev.map((o) => (o.id === newOrder.id ? { ...o, ...newOrder } : o));
        return [newOrder, ...prev];
      });
    };

    const handleOrderUpdated = (updatedOrder: Order) => {
      if (!updatedOrder || !updatedOrder.id) return;
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)));
    };

    socket.on('ORDER_CREATED', handleOrderCreated);
    socket.on('ORDER_UPDATED', handleOrderUpdated);

    return () => {
      socket.off('ORDER_CREATED', handleOrderCreated);
      socket.off('ORDER_UPDATED', handleOrderUpdated);
    };
  }, [socket]);

  const handleCopyOrderNumber = (orderNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderNumber);
    setCopiedId(orderNumber);
    toast.success(isKhmer ? `បានចម្លង ${orderNumber}` : `Copied ${orderNumber}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancel = async (orderId: string) => {
    if (!window.confirm(isKhmer ? 'តើអ្នកពិតជាចង់បោះបង់ការកម្ម៉ង់នេះមែនទេ?' : 'Are you sure you want to cancel this order?')) {
      return;
    }
    try {
      await orderApi.cancel(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o)));
      toast.success(t(language, 'orderStatus_CANCELLED'));
    } catch {
      toast.error(t(language, 'cannotCancelOrder'));
    }
  };

  const getOrderDetailsPath = (orderId: string, orderNumber: string) => {
    const safeOrderNumber = orderNumber.trim().replace(/\s+/g, '-');
    return `/dashboard/orders/${encodeURIComponent(`${safeOrderNumber}__${orderId}`)}`;
  };

  // KPI Stats
  const totalOrders = orders.length;
  const activeOrders = useMemo(
    () => orders.filter((o) => ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)).length,
    [orders]
  );
  const deliveredOrders = useMemo(() => orders.filter((o) => o.status === 'DELIVERED').length, [orders]);
  const cancelledOrders = useMemo(() => orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REFUNDED').length, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search match
      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.items.some((i) => i.name.toLowerCase().includes(query));

      if (!matchSearch) return false;

      // Status match
      if (statusFilter === 'ACTIVE') {
        return ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status);
      }
      if (statusFilter === 'DELIVERED') {
        return order.status === 'DELIVERED';
      }
      if (statusFilter === 'CANCELLED') {
        return order.status === 'CANCELLED' || order.status === 'REFUNDED';
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  if (!isAuthChecked) return null;

  return (
    <div
      className="page-container py-6 sm:py-8 max-w-5xl mx-auto space-y-6"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-w-0"
      >
        <Link href="/" className="hover:text-primary-600 transition-colors shrink-0">
          {t(language, 'breadcrumbHome')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden />
        <Link href="/dashboard" className="hover:text-primary-600 transition-colors shrink-0">
          {t(language, 'breadcrumbAccount')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden />
        <span className="text-slate-900 dark:text-white font-bold min-w-0">
          {isKhmer ? 'ការបញ្ជាទិញរបស់ខ្ញុំ' : 'My Orders'}
        </span>
      </nav>

      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>{isKhmer ? 'ការបញ្ជាទិញរបស់ខ្ញុំ' : 'My Orders'}</span>
            {!loading && totalOrders > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold">
                {totalOrders}
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {isKhmer
              ? 'តាមដានស្ថានភាពទំនិញ ព័ត៌មានដឹកជញ្ជូន និងវិក្កយបត្ររបស់អ្នក'
              : 'Track order shipment status, delivery updates, and purchase receipts'}
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-750 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition shadow-2xs self-start sm:self-auto"
        >
          <ShoppingBag className="w-4 h-4 text-primary-500" />
          <span>{isKhmer ? 'ទិញទំនិញបន្ថែម' : 'Continue Shopping'}</span>
        </Link>
      </div>

      {/* Quick Summary KPI Cards */}
      {!loading && totalOrders > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
              statusFilter === 'ALL'
                ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-500/60 ring-2 ring-primary-500/20 shadow-sm'
                : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {isKhmer ? 'ការកម្មង់សរុប' : 'Total Orders'}
              </span>
              <Package className="w-3.5 h-3.5 text-primary-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{totalOrders}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
              statusFilter === 'ACTIVE'
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500/60 ring-2 ring-amber-500/20 shadow-sm'
                : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{isKhmer ? 'កំពុងរៀបចំ/ផ្ញើ' : 'In Progress'}</span>
              </span>
              <Truck className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">{activeOrders}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('DELIVERED')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
              statusFilter === 'DELIVERED'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {isKhmer ? 'បានដឹកជញ្ជូនរួច' : 'Delivered'}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{deliveredOrders}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('CANCELLED')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
              statusFilter === 'CANCELLED'
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500/60 ring-2 ring-rose-500/20 shadow-sm'
                : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                {isKhmer ? 'បានបោះបង់' : 'Cancelled'}
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">{cancelledOrders}</p>
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      {!loading && totalOrders > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-surface-800 shadow-2xs">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar p-0.5">
            {[
              { id: 'ALL', label: isKhmer ? 'ទាំងអស់' : 'All', count: totalOrders },
              { id: 'ACTIVE', label: isKhmer ? 'កំពុងដំណើរការ' : 'Active', count: activeOrders },
              { id: 'DELIVERED', label: isKhmer ? 'ដឹកជញ្ជូនរួច' : 'Delivered', count: deliveredOrders },
              { id: 'CANCELLED', label: isKhmer ? 'បានបោះបង់' : 'Cancelled', count: cancelledOrders },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-surface-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកលេខ Order ឬឈ្មោះទំនិញ...' : 'Search order # or product...'}
              className="w-full h-9 pl-9 pr-7 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={`order-skeleton-${i}`}
              className="rounded-2xl border border-slate-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 animate-pulse space-y-4 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="h-6 w-48 rounded-lg bg-slate-200 dark:bg-surface-800" />
                <div className="h-6 w-24 rounded-lg bg-slate-200 dark:bg-surface-800" />
              </div>
              <div className="h-16 rounded-xl bg-slate-100 dark:bg-surface-800" />
              <div className="flex items-center justify-between pt-2">
                <div className="h-5 w-32 rounded bg-slate-100 dark:bg-surface-800" />
                <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-surface-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-300 dark:border-surface-800 bg-white dark:bg-surface-900/60 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-900 flex items-center justify-center mx-auto text-primary-600 dark:text-primary-400 shadow-sm">
            <Package className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {search || statusFilter !== 'ALL'
                ? isKhmer
                  ? 'រកមិនឃើញការបញ្ជាទិញដែលត្រូវនឹងការស្វែងរកទេ'
                  : 'No matching orders found'
                : isKhmer
                ? 'មិនទាន់មានការបញ្ជាទិញនៅឡើយទេ'
                : 'No orders yet'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {search || statusFilter !== 'ALL'
                ? isKhmer
                  ? 'សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬជ្រើសរើសផ្ទាំងតម្រងផ្សេង'
                  : 'Try adjusting your search terms or filter criteria'
                : isKhmer
                ? 'សូមរីករាយជាមួយការជ្រើសរើសទំនិញគុណភាពខ្ពស់ និងការផ្តល់ជូនពិសេសពីហាងយើងខ្ញុំ'
                : 'Browse our collection and find premium products for you'}
            </p>
          </div>
          <div className="pt-2">
            {search || statusFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
              >
                {isKhmer ? 'សម្អាតការស្វែងរក' : 'Reset Filters'}
              </button>
            ) : (
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary-500/25 hover:from-primary-700 hover:to-violet-700 transition"
              >
                <span>{isKhmer ? 'ចាប់ផ្តើមទិញទំនិញឥឡូវនេះ' : 'Start Shopping'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Orders List */
        <div className="space-y-4">
          <AnimatePresence>
            {filteredOrders.map((order, index) => {
              const detailHref = getOrderDetailsPath(order.id, order.orderNumber);
              const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const preview = order.items.slice(0, 3);
              const moreCount = Math.max(0, order.items.length - preview.length);
              const isPaid = order.paymentStatus === 'PAID';
              const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);

              return (
                <motion.article
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.2) }}
                  className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-2xs hover:shadow-md hover:border-primary-300 dark:hover:border-surface-700 transition-all duration-200 overflow-hidden"
                >
                  {/* Card Header Bar */}
                  <div className="p-4 sm:px-5 sm:py-3.5 bg-slate-50/70 dark:bg-surface-800/40 border-b border-slate-100 dark:border-surface-800/80 flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Order ID & Date */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-400 flex items-center justify-center shrink-0 shadow-2xs">
                        <Package className="w-4 h-4" />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-wide">
                          {order.orderNumber}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyOrderNumber(order.orderNumber, e)}
                          title="Copy order number"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-surface-700 transition"
                        >
                          {copiedId === order.orderNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium sm:border-l sm:border-slate-200 sm:dark:border-surface-750 sm:pl-2.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(order.createdAt, language)}</span>
                      </div>
                    </div>

                    {/* Right: Status Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('px-2.5 py-1 rounded-xl text-[11px] font-bold border', getOrderStatusColor(order.status))}>
                        {t(language, `orderStatus_${order.status}`)}
                      </span>

                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5',
                          getPaymentStatusColor(order.paymentStatus)
                        )}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isPaid ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                          }`}
                        />
                        <span>{t(language, isPaid ? 'paymentStatus_PAID' : 'paymentStatus_PENDING')}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Items Preview */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {preview.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-surface-800/60 border border-slate-100 dark:border-surface-750/70"
                        >
                          <div className="relative w-12 h-12 rounded-xl bg-slate-200 dark:bg-surface-700 overflow-hidden shrink-0 border border-slate-200/60 dark:border-white/10">
                            {item.image ? (
                              <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-snug">
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-extrabold text-primary-600 dark:text-primary-400 font-mono">
                                {formatPrice(item.price, language)}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                                ×{item.quantity}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {moreCount > 0 && (
                        <Link
                          href={detailHref}
                          className="flex items-center justify-center p-3 rounded-2xl bg-primary-50/60 hover:bg-primary-100/80 dark:bg-primary-950/30 dark:hover:bg-primary-950/50 border border-primary-200/60 dark:border-primary-900/50 text-xs font-bold text-primary-700 dark:text-primary-300 transition group"
                        >
                          <span>{t(language, 'orderMoreLines', { count: moreCount })}</span>
                          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Summary & Actions */}
                  <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-slate-50/50 dark:bg-surface-850/40 border-t border-slate-100 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Price and Item Count */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {isKhmer ? 'សរុបរួម (' : 'Total ('}
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">{totalQty} {isKhmer ? 'មុខ' : 'items'}</strong>
                        {isKhmer ? ')៖' : '):'}
                      </span>
                      <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                        {formatPrice(order.total, language)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(order.id)}
                          className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-surface-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition shadow-2xs"
                        >
                          {t(language, 'cancel')}
                        </button>
                      )}

                      <Link
                        href={detailHref}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white text-xs font-bold shadow-sm shadow-primary-500/25 transition active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t(language, 'viewOrder')}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
