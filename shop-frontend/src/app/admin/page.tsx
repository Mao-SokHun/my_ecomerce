'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { adminApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Package, ShoppingCart, Users, DollarSign, Sparkles, FolderTree, Truck } from 'lucide-react';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { adminT } from '@/lib/admin-i18n';

interface DashboardData {
  overview: {
    orders: { value: number; growth: number };
    revenue: { value: number; growth: number };
    users: { value: number; growth: number };
    products: { value: number };
    stock?: {
      lowStockCount: number;
      totalUnits: number;
      inventoryValue: number;
      estimatedRevenueIfSold: number;
    };
    profit?: {
      realizedGrossProfit: number;
    };
  };
  recentOrders: Array<{
    id: string; orderNumber: string; total: number; status: string; createdAt: string;
    user: { name: string; email: string };
    items: Array<{ name: string; quantity: number }>;
  }>;
  topProducts: Array<{
    id: string; name: string; thumbnail: string; price: number; soldCount: number; stock: number;
  }>;
  lowStockProducts?: Array<{
    id: string;
    name: string;
    stock: number;
    thumbnail?: string | null;
  }>;
  ordersByStatus: Array<{ status: string; count: number }>;
}

export default function AdminDashboard() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const panelCls = 'rounded-3xl border border-white/70 dark:border-gray-800 bg-white/90 dark:bg-surface-900/80 backdrop-blur shadow-lg shadow-slate-200/60 dark:shadow-black/20';

  useEffect(() => {
    adminApi.getDashboard()
      .then(({ data: res }) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className={`${panelCls} p-6 h-24`} />
        <div className={`${panelCls} p-4 h-16`} />
        <div className={`${panelCls} p-5 h-56`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={`stat-skeleton-${i}`} className={`${panelCls} h-36`} />)}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={`kpi-skeleton-${i}`} className={`${panelCls} h-28`} />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={`panel-skeleton-${i}`} className={`${panelCls} h-72`} />)}
        </div>
      </div>
    );
  }

  const recentOrders = data?.recentOrders || [];
  const now = Date.now();
  const rangeStart = now - period * 24 * 60 * 60 * 1000;
  const filteredOrders = recentOrders.filter((o) => new Date(o.createdAt).getTime() >= rangeStart);

  const bucketCount = period <= 7 ? period : period <= 30 ? 10 : 12;
  const bucketMs = (period * 24 * 60 * 60 * 1000) / bucketCount;
  const trendBuckets = Array.from({ length: bucketCount }, (_, i) => {
    const start = rangeStart + i * bucketMs;
    const end = start + bucketMs;
    const inBucket = filteredOrders.filter((o) => {
      const ts = new Date(o.createdAt).getTime();
      return ts >= start && ts < end;
    });
    return {
      label: i + 1,
      orders: inBucket.length,
      revenue: inBucket.reduce((sum, o) => sum + o.total, 0),
    };
  });

  const makePath = (values: number[], width: number, height: number) => {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    const step = values.length > 1 ? width / (values.length - 1) : width;
    return values
      .map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  };

  const ordersPath = makePath(trendBuckets.map((b) => b.orders), 280, 80);
  const revenuePath = makePath(trendBuckets.map((b) => b.revenue), 280, 80);

  const periodRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const periodOrders = filteredOrders.length;

  const stats = [
    {
      icon: ShoppingCart,
      label: adminT(language, 'ordersThisMonth'),
      value: data?.overview.orders.value || 0,
      growth: data?.overview.orders.growth || 0,
      format: (v: number) => v.toString(),
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    },
    {
      icon: DollarSign,
      label: adminT(language, 'revenueThisMonth'),
      value: data?.overview.revenue.value || 0,
      growth: data?.overview.revenue.growth || 0,
      format: formatPrice,
      color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    },
    {
      icon: Users,
      label: adminT(language, 'newUsersThisMonth'),
      value: data?.overview.users.value || 0,
      growth: data?.overview.users.growth || 0,
      format: (v: number) => v.toString(),
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    },
    {
      icon: Package,
      label: adminT(language, 'activeProducts'),
      value: data?.overview.products.value || 0,
      growth: 0,
      format: (v: number) => v.toString(),
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div
      className="space-y-6"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      <div className={`${panelCls} p-6 bg-gradient-to-r from-primary-500/10 via-indigo-500/10 to-fuchsia-500/10`}>
        <h1 className={`text-gray-900 dark:text-white ${isKhmer ? 'text-[32px] font-bold' : 'text-3xl font-black tracking-tight'}`}>
          {adminT(language, 'dashboard')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{adminT(language, 'dashboardOverview')}</p>
      </div>

      <div className={`${panelCls} p-4 flex flex-wrap gap-3`}>
        <span className="text-sm font-medium text-gray-500 w-full sm:w-auto">{adminT(language, 'quickActions')}</span>
        <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-800 p-1">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p as 7 | 30 | 90)}
              className={`px-3 py-1.5 text-xs rounded-lg transition ${
                period === p
                  ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-700'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
        <Link href="/admin/products" className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-2">
          <Package className="w-4 h-4" /> {adminT(language, 'productsFeatured')}
        </Link>
        <Link href="/admin/categories" className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-2">
          <FolderTree className="w-4 h-4" /> Categories
        </Link>
        <Link href="/admin/settings" className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-2">
          <Truck className="w-4 h-4" /> {adminT(language, 'shippingFee')}
        </Link>
        <Link href="/admin/products" className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-2 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <Sparkles className="w-4 h-4" /> {adminT(language, 'toggleFeatured')}
        </Link>
      </div>

      <div className={`${panelCls} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className={`text-gray-900 dark:text-white text-lg ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'trendTitle')}</h2>
            <p className="text-xs text-gray-500">{adminT(language, 'trendHint')} {period} days</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">{adminT(language, 'orders')}</p>
              <p className="font-bold text-gray-900 dark:text-white">{periodOrders}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{adminT(language, 'revenue')}</p>
              <p className="font-bold text-emerald-600">{formatPrice(periodRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-surface-800 p-4">
            <p className="text-xs text-gray-500 mb-2">Orders Trend</p>
            <svg viewBox="0 0 280 80" className="w-full h-24">
              <path d={ordersPath} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-surface-800 p-4">
            <p className="text-xs text-gray-500 mb-2">Revenue Trend</p>
            <svg viewBox="0 0 280 80" className="w-full h-24">
              <path d={revenuePath} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, growth, format, color }) => (
          <div key={label} className={`${panelCls} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              {growth !== 0 && (
                <div className={`flex items-center gap-0.5 text-xs font-semibold ${growth > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(growth)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{format(value)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className={`${panelCls} p-5`}>
          <p className="text-xs text-gray-500">{adminT(language, 'lowStockProducts')}</p>
          <p className="text-2xl font-black text-red-600 mt-1">{data?.overview.stock?.lowStockCount || 0}</p>
        </div>
        <div className={`${panelCls} p-5`}>
          <p className="text-xs text-gray-500">{adminT(language, 'inventoryValue')}</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {formatPrice(data?.overview.stock?.inventoryValue || 0)}
          </p>
        </div>
        <div className={`${panelCls} p-5`}>
          <p className="text-xs text-gray-500">{adminT(language, 'estimatedGrossProfit')}</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {formatPrice(data?.overview.profit?.realizedGrossProfit || 0)}
          </p>
        </div>
      </div>

      {/* Recent orders & Top products */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className={`${panelCls} p-5`}>
          <h2 className={`text-gray-900 dark:text-white mb-4 text-lg ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'recentOrders')}</h2>
          <div className="space-y-3">
            {data?.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-3 bg-gray-50/90 dark:bg-surface-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{order.user.name} · {formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(order.total)}</p>
                  <span className={`badge text-xs ${
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className={`${panelCls} p-5`}>
          <h2 className={`text-gray-900 dark:text-white mb-4 text-lg ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'topSellingProducts')}</h2>
          <div className="space-y-3">
            {data?.topProducts.map((product, i) => (
              <div key={product.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-surface-800 transition">
                <span className="w-6 text-sm font-bold text-gray-400">#{i + 1}</span>
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {product.thumbnail && (
                    <Image 
                      src={product.thumbnail} 
                      alt={product.name} 
                      fill 
                      className="object-cover" 
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.soldCount} {adminT(language, 'sold')} · {product.stock} {adminT(language, 'inStock')}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">{formatPrice(product.price)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders by status */}
      {data?.ordersByStatus && (
        <div className={`${panelCls} p-5`}>
          <h2 className={`text-gray-900 dark:text-white mb-4 text-lg ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'ordersByStatus')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {data.ordersByStatus.map(({ status, count }) => (
              <div key={status} className="text-center p-3 bg-gray-50/90 dark:bg-surface-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-2xl font-black text-gray-900 dark:text-white">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.lowStockProducts && data.lowStockProducts.length > 0 && (
        <div className={`${panelCls} p-5`}>
          <h2 className={`text-gray-900 dark:text-white mb-4 text-lg ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'lowStockAlert')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.lowStockProducts.map((p) => (
              <div key={p.id} className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{p.name}</p>
                <p className="text-xs text-red-600 mt-1">{adminT(language, 'onlyLeft')} {p.stock}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
