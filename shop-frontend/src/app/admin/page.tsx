'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatPrice, formatDate, getOrderStatusColor } from '@/lib/utils';
import type { Order } from '@/types';
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
  AlertTriangle,
  BellRing,
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
      className="group relative flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/95 p-2.5 shadow-xs transition-all duration-200 ease-smooth-out hover:border-primary-400/50 hover:bg-gradient-to-br hover:from-primary-50/70 hover:to-white hover:shadow-sm dark:border-gray-800 dark:bg-surface-900/90 dark:hover:border-primary-600/40 dark:hover:from-primary-950/30 dark:hover:to-surface-900"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500/12 to-indigo-500/10 text-primary-600 dark:from-primary-400/18 dark:to-indigo-500/12 dark:text-primary-300">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pr-1">
        <p className="truncate text-xs font-semibold text-slate-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
          {title}
        </p>
        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <ArrowRight
        className="pointer-events-none h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:text-primary-500 dark:text-slate-600"
        aria-hidden
      />
    </Link>
  );
}

export default function AdminDashboard() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const [data, setData] = useState<DashboardData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_dashboard');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_dashboard');
        if (cached) return false;
      } catch {}
    }
    return true;
  });
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [ordersList, setOrdersList] = useState<Order[]>([]);

  const panelCls = 'rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-surface-900/90 backdrop-blur shadow-xs';

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = (isSilent = false) => {
      if (!isSilent && !data) setLoading(true);
      Promise.all([
        adminApi.getDashboard(),
        adminApi.getOrders({ limit: 100 }).catch(() => ({ data: { data: [] } })),
      ])
        .then(([dashRes, ordersRes]) => {
          if (isMounted) {
            setData(dashRes.data.data);
            if (ordersRes.data?.data) {
              setOrdersList(ordersRes.data.data);
            }
            try {
              sessionStorage.setItem('admin_cached_dashboard', JSON.stringify(dashRes.data.data));
            } catch {}
          }
        })
        .catch(console.error)
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };

    fetchDashboard(!!data);
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className={`${panelCls} overflow-hidden`}>
          <div className="h-16 border-b border-gray-100 bg-slate-100 dark:border-gray-800 dark:bg-surface-800" />
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={`hub-s-${i}`} className="h-14 rounded-xl bg-slate-100 dark:bg-surface-800" />
            ))}
          </div>
          <div className="border-t border-gray-100 p-3 dark:border-gray-800">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={`hub-b-${i}`} className="h-14 rounded-xl bg-slate-100 dark:bg-surface-800" />
              ))}
            </div>
          </div>
        </div>
        <div className={`${panelCls} h-36 p-4`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((i) => <div key={`stat-skeleton-${i}`} className={`${panelCls} h-24`} />)}
        </div>
        <div className="grid sm:grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => <div key={`kpi-skeleton-${i}`} className={`${panelCls} h-20`} />)}
        </div>
      </div>
    );
  }

  const ordersSource = ordersList.length > 0 ? ordersList : (data?.recentOrders || []);
  const now = Date.now();
  const rangeStart = now - period * 24 * 60 * 60 * 1000;
  const filteredOrders = ordersSource.filter((o) => new Date(o.createdAt).getTime() >= rangeStart);

  const bucketCount = period <= 7 ? period : period <= 30 ? 10 : 12;
  const bucketMs = (period * 24 * 60 * 60 * 1000) / bucketCount;
  const trendBuckets = Array.from({ length: bucketCount }, (_, i) => {
    const start = rangeStart + i * bucketMs;
    const end = start + bucketMs;
    const inBucket = filteredOrders.filter((o) => {
      const ts = new Date(o.createdAt).getTime();
      return ts >= start && ts < end;
    });
    // Exclude cancelled orders from revenue
    const validRevenue = inBucket
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    return {
      label: i + 1,
      orders: inBucket.length,
      revenue: validRevenue,
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

  const ordersPath = makePath(trendBuckets.map((b) => b.orders), 280, 50);
  const revenuePath = makePath(trendBuckets.map((b) => b.revenue), 280, 50);

  // Exclude cancelled orders from revenue
  const validPeriodOrders = filteredOrders.filter((o) => o.status !== 'CANCELLED');
  const periodRevenue = validPeriodOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
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
      className="space-y-4"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      {/* Urgent Low Stock Banner Alert */}
      {(data?.overview?.stock?.lowStockCount ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm">
                {isKhmer 
                  ? `⚠️ ការដាស់តឿនស្តុក៖ មាន ${data?.overview?.stock?.lowStockCount} មុខទំនិញជិតអស់ស្តុក (សល់ ≤ 5 ឬ អស់ស្តុក)!` 
                  : `⚠️ Stock Alert: ${data?.overview?.stock?.lowStockCount} products are running low on stock (≤ 5 units)!`}
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                {isKhmer 
                  ? 'សូមពិនិត្យ និងបញ្ចូលស្តុកថ្មីជាបន្ទាន់ ដើម្បីកុំឱ្យរអាក់រអួលដល់ការលក់។' 
                  : 'Please review and restock items promptly to avoid sales interruptions.'}
              </p>
            </div>
          </div>
          <Link
            href="/admin/products?filter=low_stock"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition shrink-0"
          >
            <span>{isKhmer ? 'គ្រប់គ្រងស្តុក' : 'Manage Stock'}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Welcome + full admin hub (compact dense navigation) */}
      <div className={`${panelCls} overflow-hidden`}>
        <div className="border-b border-slate-100/90 bg-gradient-to-br from-slate-50 via-white to-primary-50/35 px-4 py-3 dark:border-gray-800 dark:from-surface-950 dark:via-surface-900 dark:to-primary-950/25 sm:px-5 sm:py-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1
                className={`text-gray-900 dark:text-white ${isKhmer ? 'text-lg sm:text-xl font-bold leading-tight' : 'text-base sm:text-lg font-bold tracking-tight'}`}
              >
                {adminT(language, 'dashboard')}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{adminT(language, 'dashboardOverview')}</p>
            </div>
            <Link
              href="/admin/settings"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-primary-700"
            >
              {adminT(language, 'dashboardOpenSettings')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="space-y-3.5 p-3.5 sm:p-4">
          <section aria-labelledby="hub-settings-heading">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p id="hub-settings-heading" className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  {adminT(language, 'dashboardSettingsGroup')}
                </p>
              </div>
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {adminT(language, 'dashboardAllSettings')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {settingsHubItems.map((item) => (
                <HubLinkCard key={item.href} href={item.href} icon={item.icon} title={item.title} description={item.desc} />
              ))}
            </div>
          </section>

          <div className="h-px bg-gray-100 dark:bg-gray-800" aria-hidden />

          <section aria-labelledby="hub-business-heading">
            <div className="mb-2">
              <p id="hub-business-heading" className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {adminT(language, 'dashboardBusinessGroup')}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
              {businessHubItems.map((item) => (
                <HubLinkCard key={item.href} href={item.href} icon={item.icon} title={item.title} description={item.desc} />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Orders & Revenue Trend Sparklines */}
      <div className={`${panelCls} p-3.5 sm:p-4`}>
        <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={`text-gray-900 dark:text-white text-sm sm:text-base ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'trendTitle')}</h2>
            <p className="text-[11px] text-gray-500">
              {adminT(language, 'trendHint')} · {period}d
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-surface-800">
              {[7, 30, 90].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p as 7 | 30 | 90)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    period === p
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-surface-700'
                  }`}
                >
                  {p}d
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 border-l border-gray-200 pl-2.5 text-xs dark:border-gray-700">
              <div>
                <span className="text-[10px] text-gray-500">{adminT(language, 'orders')}: </span>
                <span className="font-bold text-gray-900 dark:text-white">{periodOrders}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500">{adminT(language, 'revenue')}: </span>
                <span className="font-bold text-emerald-600">{formatPrice(periodRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/60 dark:bg-surface-800/60 p-2.5 sm:p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">Orders Trend</p>
              <span className="text-[10px] text-indigo-500 font-mono font-bold">{periodOrders} orders</span>
            </div>
            <svg viewBox="0 0 280 50" className="w-full h-12 sm:h-14">
              <path d={ordersPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/60 dark:bg-surface-800/60 p-2.5 sm:p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">Revenue Trend</p>
              <span className="text-[10px] text-emerald-500 font-mono font-bold">{formatPrice(periodRevenue)}</span>
            </div>
            <svg viewBox="0 0 280 50" className="w-full h-12 sm:h-14">
              <path d={revenuePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Stats (4 overview cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {stats.map(({ icon: Icon, label, value, growth, format, color }) => (
          <div key={label} className={`${panelCls} p-3 sm:p-3.5`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
                <Icon className="w-4 h-4" />
              </div>
              {growth !== 0 && (
                <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${growth > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(growth)}%
                </div>
              )}
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{format(value)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">{label}</p>
          </div>
        ))}
      </div>

      {/* Inventory & Profit KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className={`${panelCls} p-3 sm:p-3.5`}>
          <p className="text-[11px] text-gray-500">{adminT(language, 'lowStockProducts')}</p>
          <p className="text-lg sm:text-xl font-bold text-red-600 mt-0.5">{data?.overview.stock?.lowStockCount || 0}</p>
        </div>
        <div className={`${panelCls} p-3 sm:p-3.5`}>
          <p className="text-[11px] text-gray-500">{adminT(language, 'inventoryValue')}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5">
            {formatPrice(data?.overview.stock?.inventoryValue || 0)}
          </p>
        </div>
        <div className={`${panelCls} p-3 sm:p-3.5`}>
          <p className="text-[11px] text-gray-500">{adminT(language, 'estimatedGrossProfit')}</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-0.5">
            {formatPrice(data?.overview.profit?.realizedGrossProfit || 0)}
          </p>
        </div>
      </div>

      {/* Recent orders & Top products */}
      <div className="grid lg:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Recent orders */}
        <div className={`${panelCls} p-3.5 sm:p-4`}>
          <h2 className={`text-gray-900 dark:text-white mb-2.5 text-sm sm:text-base ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'recentOrders')}</h2>
          <div className="space-y-2">
            {data?.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-2.5 p-2 sm:p-2.5 bg-gray-50/80 dark:bg-surface-800/80 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-semibold text-gray-900 dark:text-white">{order.orderNumber}</p>
                  <p className="text-[11px] text-gray-500 truncate">{order.user.name} · {formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{formatPrice(order.total)}</p>
                  <span className={`badge text-[10px] ${getOrderStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className={`${panelCls} p-3.5 sm:p-4`}>
          <h2 className={`text-gray-900 dark:text-white mb-2.5 text-sm sm:text-base ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'topSellingProducts')}</h2>
          <div className="space-y-2">
            {data?.topProducts.map((product, i) => (
              <div key={product.id} className="flex items-center gap-2.5 p-1.5 sm:p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-surface-800 transition">
                <span className="w-5 text-xs font-bold text-gray-400">#{i + 1}</span>
                <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0">
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
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                  <p className="text-[10px] text-gray-400">{product.soldCount} {adminT(language, 'sold')} · {product.stock} {adminT(language, 'inStock')}</p>
                </div>
                <p className="text-xs font-bold text-gray-900 dark:text-white shrink-0">{formatPrice(product.price)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders by status */}
      {data?.ordersByStatus && (
        <div className={`${panelCls} p-3.5 sm:p-4`}>
          <h2 className={`text-gray-900 dark:text-white mb-2.5 text-sm sm:text-base ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'ordersByStatus')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {data.ordersByStatus.map(({ status, count }) => (
              <div key={status} className="text-center p-2 bg-gray-50/80 dark:bg-surface-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.lowStockProducts && data.lowStockProducts.length > 0 && (
        <div className={`${panelCls} p-3.5 sm:p-4`}>
          <h2 className={`text-gray-900 dark:text-white mb-2.5 text-sm sm:text-base ${isKhmer ? 'font-semibold' : 'font-bold'}`}>{adminT(language, 'lowStockAlert')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {data.lowStockProducts.map((p) => (
              <div key={p.id} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1">{p.name}</p>
                <p className="text-[11px] text-red-600 mt-0.5">{adminT(language, 'onlyLeft')} {p.stock}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
