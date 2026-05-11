'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  FolderTree,
  ArrowRight,
  SlidersHorizontal,
  Mail,
  PanelTop,
  LayoutGrid,
  PanelBottom,
  FileText,
  Tag,
  Inbox,
  UserPlus,
} from 'lucide-react';
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

function HubLinkCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2.5 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-sm transition-all duration-200 ease-smooth-out hover:border-primary-400/50 hover:bg-gradient-to-br hover:from-primary-50/80 hover:to-white hover:shadow-md dark:border-gray-800 dark:bg-surface-900/95 dark:hover:border-primary-600/45 dark:hover:from-primary-950/40 dark:hover:to-surface-900"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/12 to-indigo-500/10 text-primary-600 dark:from-primary-400/18 dark:to-indigo-500/12 dark:text-primary-300">
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
      </div>
      <div className="min-w-0 pr-5">
        <p className="text-sm font-semibold leading-snug text-slate-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
          {title}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
          {description}
        </p>
      </div>
      <ArrowRight
        className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:text-primary-500 dark:text-slate-600"
        aria-hidden
      />
    </Link>
  );
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
        <div className={`${panelCls} overflow-hidden`}>
          <div className="h-28 border-b border-gray-100 bg-gradient-to-br from-slate-100 to-primary-50/40 dark:border-gray-800 dark:from-surface-900 dark:to-primary-950/20 md:h-32" />
          <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={`hub-s-${i}`} className="h-28 rounded-2xl bg-slate-100 dark:bg-surface-800" />
            ))}
          </div>
          <div className="border-t border-gray-100 px-6 pb-8 dark:border-gray-800">
            <div className="mb-3 h-4 w-40 rounded bg-slate-100 dark:bg-surface-800" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={`hub-b-${i}`} className="h-28 rounded-2xl bg-slate-100 dark:bg-surface-800" />
              ))}
            </div>
          </div>
        </div>
        <div className={`${panelCls} h-48 p-5`} />
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

  const settingsHubItems = [
    { href: '/admin/settings?section=core', icon: SlidersHorizontal, title: adminT(language, 'settingsMenuCore'), desc: adminT(language, 'hubDescCore') },
    { href: '/admin/settings?section=contact', icon: Mail, title: adminT(language, 'settingsMenuContact'), desc: adminT(language, 'hubDescContact') },
    { href: '/admin/settings?section=header', icon: PanelTop, title: adminT(language, 'settingsMenuHeader'), desc: adminT(language, 'hubDescHeader') },
    { href: '/admin/settings?section=homepage', icon: LayoutGrid, title: adminT(language, 'settingsMenuHomepage'), desc: adminT(language, 'hubDescHomepage') },
    { href: '/admin/settings?section=footer', icon: PanelBottom, title: adminT(language, 'settingsMenuFooter'), desc: adminT(language, 'hubDescFooter') },
    { href: '/admin/settings?section=invoice', icon: FileText, title: adminT(language, 'settingsMenuInvoice'), desc: adminT(language, 'hubDescInvoice') },
  ];

  const businessHubItems = [
    { href: '/admin/products', icon: Package, title: adminT(language, 'navProducts'), desc: adminT(language, 'hubDescProducts') },
    { href: '/admin/categories', icon: FolderTree, title: adminT(language, 'navCategories'), desc: adminT(language, 'hubDescCategories') },
    { href: '/admin/orders', icon: ShoppingCart, title: adminT(language, 'navOrders'), desc: adminT(language, 'hubDescOrders') },
    { href: '/admin/users', icon: Users, title: adminT(language, 'navUsers'), desc: adminT(language, 'hubDescUsers') },
    { href: '/admin/coupons', icon: Tag, title: adminT(language, 'navCoupons'), desc: adminT(language, 'hubDescCoupons') },
    { href: '/admin/leads', icon: UserPlus, title: adminT(language, 'navLeads'), desc: adminT(language, 'hubDescLeads') },
    { href: '/admin/support-inbox', icon: Inbox, title: adminT(language, 'navSupportInbox'), desc: adminT(language, 'hubDescSupport') },
  ];

  return (
    <div
      className="space-y-6"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      {/* Welcome + full admin hub (all editable areas, no code) */}
      <div className={`${panelCls} overflow-hidden`}>
        <div className="border-b border-slate-100/90 bg-gradient-to-br from-slate-50 via-white to-primary-50/35 px-6 py-7 dark:border-gray-800 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/25 md:px-8 md:py-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <h1
                className={`text-gray-900 dark:text-white ${isKhmer ? 'text-[28px] font-bold leading-tight md:text-[32px]' : 'text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl'}`}
              >
                {adminT(language, 'dashboard')}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{adminT(language, 'dashboardOverview')}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600/95 dark:text-slate-400">{adminT(language, 'dashboardManageIntro')}</p>
            </div>
            <Link
              href="/admin/settings"
              className="mt-4 inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all duration-200 ease-smooth-out hover:bg-primary-700 md:mt-0"
            >
              {adminT(language, 'dashboardOpenSettings')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="space-y-10 px-6 py-8 md:px-8">
          <section aria-labelledby="hub-settings-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p id="hub-settings-heading" className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  {adminT(language, 'dashboardSettingsGroup')}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{adminT(language, 'sectionTip')}</p>
              </div>
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {adminT(language, 'dashboardAllSettings')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {settingsHubItems.map((item) => (
                <HubLinkCard key={item.href} href={item.href} icon={item.icon} title={item.title} description={item.desc} />
              ))}
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-gray-700" aria-hidden />

          <section aria-labelledby="hub-business-heading">
            <div className="mb-4">
              <p id="hub-business-heading" className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {adminT(language, 'dashboardBusinessGroup')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {businessHubItems.map((item) => (
                <HubLinkCard key={item.href} href={item.href} icon={item.icon} title={item.title} description={item.desc} />
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className={`${panelCls} p-5 md:p-6`}>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className={`text-gray-900 dark:text-white text-lg ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'trendTitle')}</h2>
            <p className="text-xs text-gray-500">
              {adminT(language, 'trendHint')} · {period}d
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-gray-500">{adminT(language, 'quickActions')}</span>
            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-surface-800">
              {[7, 30, 90].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p as 7 | 30 | 90)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-smooth-out ${
                    period === p
                      ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-surface-700'
                  }`}
                >
                  {p}d
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 border-l border-gray-200 pl-3 text-sm dark:border-gray-700">
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
