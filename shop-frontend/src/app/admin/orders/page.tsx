'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { orderApi, adminApi } from '@/lib/api';
import { Order, Product, Category } from '@/types';
import { formatPrice, formatKhrPrice, formatDate, getOrderStatusColor, getPaymentStatusColor } from '@/lib/utils';
import { Search, RefreshCw, Printer, Volume2, VolumeX, Eye, X, MapPin, Phone, Mail, User, Package, CreditCard, Truck, Receipt, CheckCircle, Clock, Tag, Filter, FileSpreadsheet, Scan } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { adminT } from '@/lib/admin-i18n';
import { playNewOrderChime, printThermalReceipt } from '@/components/admin/ThermalReceiptPrinter';
import Image from 'next/image';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';
import { useRealtime } from '@/providers/RealtimeProvider';
import { ExcelExportModal } from '@/components/admin/ExcelExportModal';
import { CopyableOrderCode } from '@/components/ui/CopyableOrderCode';
import { printThermalShippingLabel, getCarrierInfo, getCarrierTrackingUrl } from '@/components/admin/ShippingLabelPrinter';
import { ExternalLink } from 'lucide-react';

export default function AdminOrdersPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_orders');
        if (cached) return JSON.parse(cached);
      } catch { }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_orders');
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch { }
    }
    return true;
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Auto-Print & Sound Alert Settings (Persisted in localStorage)
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Excel Export State
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    adminApi.getProducts({ limit: 500 }).then((res) => {
      if (res.data?.data) setProducts(res.data.data);
    }).catch(() => {});
    adminApi.getCategories().then((res) => {
      if (res.data?.data) setCategories(res.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAutoPrint = localStorage.getItem('pos_auto_print');
      const savedSoundAlert = localStorage.getItem('pos_sound_alert');
      const savedPaperWidth = localStorage.getItem('pos_paper_width');
      if (savedAutoPrint !== null) setAutoPrintEnabled(savedAutoPrint === 'true');
      if (savedSoundAlert !== null) setSoundAlertEnabled(savedSoundAlert === 'true');
      if (savedPaperWidth === '80mm' || savedPaperWidth === '58mm') setPaperWidth(savedPaperWidth);
    }
  }, []);

  const handleToggleAutoPrint = (enabled: boolean) => {
    setAutoPrintEnabled(enabled);
    localStorage.setItem('pos_auto_print', String(enabled));
    toast.success(
      enabled
        ? isKhmer ? 'បានបើកការព្រីនស្វ័យប្រវត្តិ (Auto-Print ON)' : 'Auto-Print Enabled'
        : isKhmer ? 'បានបិទការព្រីនស្វ័យប្រវត្តិ (Auto-Print OFF)' : 'Auto-Print Disabled'
    );
  };

  const handleToggleSound = (enabled: boolean) => {
    setSoundAlertEnabled(enabled);
    localStorage.setItem('pos_sound_alert', String(enabled));
    if (enabled) playNewOrderChime();
    toast.success(
      enabled
        ? isKhmer ? 'បានបើកសំឡេងរោទ៍ Order ថ្មី (Sound Alert ON)' : 'Sound Alert Enabled'
        : isKhmer ? 'បានបិទសំឡេងរោទ៍ (Sound Alert OFF)' : 'Sound Alert Disabled'
    );
  };

  const handlePaperChange = (size: '80mm' | '58mm') => {
    setPaperWidth(size);
    localStorage.setItem('pos_paper_width', size);
    toast.success(`Paper size: ${size}`);
  };

  const fetchOrders = useCallback(async (isBackgroundPoll = false) => {
    if (!isBackgroundPoll) setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await orderApi.adminGetAll(params);
      const incomingOrders: Order[] = data.data || [];

      // Detect newly arrived orders during live background polling
      if (!isFirstLoadRef.current && incomingOrders.length > 0) {
        const newOrders = incomingOrders.filter((o) => !knownOrderIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          // Play sound alert
          if (soundAlertEnabled) {
            playNewOrderChime();
          }

          // Trigger notifications and Auto-print
          newOrders.forEach((newOrder) => {
            toast.success(
              isKhmer
                ? `🔔 មានការកម្មង់ថ្មី: ${newOrder.orderNumber} (${formatPrice(newOrder.total)})`
                : `🔔 New Order: ${newOrder.orderNumber} (${formatPrice(newOrder.total)})`,
              { duration: 6000 }
            );

            if (autoPrintEnabled) {
              printThermalReceipt(newOrder, paperWidth);
            }
          });
        }
      }

      // Update known order IDs tracking
      incomingOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
      isFirstLoadRef.current = false;
      setOrders(incomingOrders);

      if (!search && !statusFilter) {
        try {
          sessionStorage.setItem('admin_cached_orders', JSON.stringify(incomingOrders));
        } catch { }
      }

      // Keep selectedOrder in sync ONLY if currently open without causing race conditions
      setSelectedOrder((prev) => {
        if (!prev) return null;
        const updated = incomingOrders.find((o) => o.id === prev.id);
        return updated || prev;
      });
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  }, [search, statusFilter, soundAlertEnabled, autoPrintEnabled, paperWidth, isKhmer]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { socket } = useRealtime();

  // Instant Real-time WebSocket listener for orders
  useEffect(() => {
    if (!socket) return;

    const handleOrderCreated = (newOrder: Order) => {
      if (!newOrder || !newOrder.id) return;
      knownOrderIdsRef.current.add(newOrder.id);

      // Play chime & notify immediately
      if (soundAlertEnabled) {
        playNewOrderChime();
      }
      toast.success(
        isKhmer
          ? `🔔 មានការកម្មង់ថ្មី: ${newOrder.orderNumber} (${formatPrice(newOrder.total)})`
          : `🔔 New Order: ${newOrder.orderNumber} (${formatPrice(newOrder.total)})`,
        { duration: 6000 }
      );

      if (autoPrintEnabled) {
        printThermalReceipt(newOrder, paperWidth);
      }

      setOrders((prev) => {
        const exists = prev.some((o) => o.id === newOrder.id);
        if (exists) return prev.map((o) => (o.id === newOrder.id ? { ...o, ...newOrder } : o));
        return [newOrder, ...prev];
      });
    };

    const handleOrderUpdated = (updatedOrder: Order) => {
      if (!updatedOrder || !updatedOrder.id) return;
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)));
      setSelectedOrder((prev) => (prev && prev.id === updatedOrder.id ? { ...prev, ...updatedOrder } : prev));
    };

    socket.on('ORDER_CREATED', handleOrderCreated);
    socket.on('ORDER_UPDATED', handleOrderUpdated);

    return () => {
      socket.off('ORDER_CREATED', handleOrderCreated);
      socket.off('ORDER_UPDATED', handleOrderUpdated);
    };
  }, [socket, soundAlertEnabled, autoPrintEnabled, paperWidth, isKhmer]);

  // Background fallback sync
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await orderApi.adminUpdateStatus(orderId, { status });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: status as Order['status'] } : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: status as Order['status'] } : null);
      }
      toast.success(isKhmer ? 'បានកែប្រែស្ថានភាពជោគជ័យ' : 'Status updated successfully');
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការកែប្រែស្ថានភាព' : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrintClick = (order: Order) => {
    printThermalReceipt(order, paperWidth);
    toast.success(isKhmer ? `កំពុងព្រីនវិក្កយបត្រ ${order.orderNumber}` : `Printing receipt for ${order.orderNumber}`);
  };

  const handleTestChime = () => {
    playNewOrderChime();
    toast.success(isKhmer ? '🔔 បានសាកល្បងសំឡេងរោទ៍ Order' : '🔔 Tested Order Chime');
  };

  const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  const orderStatusOptions: DropdownOption[] = useMemo(() => [
    { value: 'PENDING', label: 'PENDING', dotColor: '#eab308' },
    { value: 'CONFIRMED', label: 'CONFIRMED', dotColor: '#3b82f6' },
    { value: 'PROCESSING', label: 'PROCESSING', dotColor: '#8b5cf6' },
    { value: 'SHIPPED', label: 'SHIPPED', dotColor: '#6366f1' },
    { value: 'DELIVERED', label: 'DELIVERED', dotColor: '#10b981' },
    { value: 'CANCELLED', label: 'CANCELLED', dotColor: '#ef4444' },
  ], []);

  const orderFilterOptions: DropdownOption[] = useMemo(() => [
    { value: '', label: adminT(language, 'allStatuses'), dotColor: '#94a3b8' },
    ...orderStatusOptions,
  ], [language, orderStatusOptions]);

  const paperWidthOptions: DropdownOption[] = [
    { value: '80mm', label: '80mm (Standard)' },
    { value: '58mm', label: '58mm (Small)' },
  ];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      PENDING: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return counts;
  }, [orders]);

  return (
    <div style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>{adminT(language, 'ordersTitle')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </h1>
          <p className="text-gray-500 text-sm">
            {orders.length} {adminT(language, 'totalOrders')}
          </p>
        </div>

        {/* POS Thermal Printer & Live Alert Bar */}
        <div className="flex flex-wrap items-center gap-2.5 p-2 bg-white dark:bg-surface-850 rounded-2xl border border-gray-200/80 dark:border-surface-700 shadow-sm">
          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={() => handleToggleSound(!soundAlertEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${soundAlertEnabled
                ? 'bg-amber-50 text-amber-700 border border-amber-300/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-surface-700 dark:text-gray-400'
              }`}
          >
            {soundAlertEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{isKhmer ? 'សំឡេងរោទ៍' : 'Sound Alert'}</span>
          </button>

          {/* Auto Print Toggle */}
          <button
            type="button"
            onClick={() => handleToggleAutoPrint(!autoPrintEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${autoPrintEnabled
                ? 'bg-primary-50 text-primary-700 border border-primary-300/80 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-800 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-surface-700 dark:text-gray-400'
              }`}
          >
            <Printer className="w-4 h-4" />
            <span>{isKhmer ? 'ព្រីនស្វ័យប្រវត្តិ (Auto-Print)' : 'Auto-Print'}</span>
          </button>

          {/* Paper Size Selector */}
          <CustomDropdown
            size="xs"
            value={paperWidth}
            onChange={(val) => handlePaperChange(val as '80mm' | '58mm')}
            options={paperWidthOptions}
          />

          {/* Test Chime Button */}
          <button
            type="button"
            onClick={handleTestChime}
            title="Test Sound Alert"
            className="p-1.5 text-gray-500 hover:text-amber-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-700 rounded-lg transition"
          >
            <Volume2 className="w-4 h-4 text-amber-500" />
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={() => setExcelModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
            title={isKhmer ? 'ទាញយករបាយការណ៍ Excel' : 'Export Excel'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
            <span>{isKhmer ? 'ទាញយក Excel' : 'Export Excel'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchOrders(false)}
            className="p-1.5 text-gray-500 hover:text-primary-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-700 rounded-lg transition"
            title={adminT(language, 'refreshBtn')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN SEARCH & FILTERS TOOLBAR (PREMIUM & SPACIOUS) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-surface-750 bg-white dark:bg-surface-900 shadow-2xs p-3.5 sm:p-4 mb-6 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={adminT(language, 'searchOrderPlaceholder')}
              style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
              className="w-full h-11 text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition shadow-inner"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-surface-700 transition z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Status Dropdown Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <CustomDropdown
              size="md"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={orderFilterOptions}
              icon={<Filter className="w-4 h-4 text-slate-400" />}
              className="min-w-[190px] sm:min-w-[230px] w-full md:w-auto"
            />
          </div>
        </div>

        {/* Quick Filter Status Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-surface-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'តម្រង៖' : 'Filter:'}</span>
            </span>

            {[
              {
                key: '',
                label: isKhmer ? 'ទាំងអស់' : 'All',
                count: statusCounts.all,
                dot: 'bg-slate-500',
                activeCls: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm',
                activeBadge: 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white',
                inactiveBadge: 'bg-slate-200/90 dark:bg-surface-700 text-slate-800 dark:text-slate-100 border border-slate-300/80 dark:border-slate-600',
              },
              {
                key: 'PENDING',
                label: isKhmer ? 'រង់ចាំទូទាត់' : 'Pending',
                count: statusCounts.PENDING,
                dot: 'bg-amber-500',
                activeCls: 'bg-amber-600 text-white shadow-sm shadow-amber-600/20',
                activeBadge: 'bg-white text-amber-700',
                inactiveBadge: 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/80',
              },
              {
                key: 'CONFIRMED',
                label: isKhmer ? 'បានបញ្ជាក់' : 'Confirmed',
                count: statusCounts.CONFIRMED,
                dot: 'bg-sky-500',
                activeCls: 'bg-sky-600 text-white shadow-sm shadow-sky-600/20',
                activeBadge: 'bg-white text-sky-700',
                inactiveBadge: 'bg-sky-100/90 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 border border-sky-300/80 dark:border-sky-800/80',
              },
              {
                key: 'PROCESSING',
                label: isKhmer ? 'កំពុងដំណើរការ' : 'Processing',
                count: statusCounts.PROCESSING,
                dot: 'bg-violet-500',
                activeCls: 'bg-violet-600 text-white shadow-sm shadow-violet-600/20',
                activeBadge: 'bg-white text-violet-700',
                inactiveBadge: 'bg-violet-100/90 dark:bg-violet-950/70 text-violet-800 dark:text-violet-200 border border-violet-300/80 dark:border-violet-800/80',
              },
              {
                key: 'SHIPPED',
                label: isKhmer ? 'បានផ្ញើ' : 'Shipped',
                count: statusCounts.SHIPPED,
                dot: 'bg-indigo-500',
                activeCls: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20',
                activeBadge: 'bg-white text-indigo-700',
                inactiveBadge: 'bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200 border border-indigo-300/80 dark:border-indigo-800/80',
              },
              {
                key: 'DELIVERED',
                label: isKhmer ? 'បានដឹកជញ្ជូន' : 'Delivered',
                count: statusCounts.DELIVERED,
                dot: 'bg-emerald-600',
                activeCls: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20',
                activeBadge: 'bg-white text-emerald-700',
                inactiveBadge: 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-800/80',
              },
              {
                key: 'CANCELLED',
                label: isKhmer ? 'បានបោះបង់' : 'Cancelled',
                count: statusCounts.CANCELLED,
                dot: 'bg-rose-500',
                activeCls: 'bg-rose-600 text-white shadow-sm shadow-rose-600/20',
                activeBadge: 'bg-white text-rose-700',
                inactiveBadge: 'bg-rose-100/90 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border border-rose-300/80 dark:border-rose-800/80',
              },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={`order-tab-${tab.key}`}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all duration-150 flex items-center gap-2 border ${
                    isActive
                      ? `${tab.activeCls} border-transparent ring-2 ring-offset-1 ring-slate-900/10 dark:ring-offset-surface-900`
                      : 'bg-white dark:bg-surface-850 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-800 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : tab.dot}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-xs font-mono font-black shadow-2xs ${
                      isActive
                        ? tab.activeBadge
                        : tab.count === 0
                          ? 'bg-slate-100 dark:bg-surface-700 text-slate-400 dark:text-slate-500 font-medium'
                          : tab.inactiveBadge
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 font-medium self-end sm:self-auto">
            {isKhmer ? `បង្ហាញ ${orders.length} ការកុម្ម៉ង់` : `Showing ${orders.length} orders`}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-800">
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 w-12">{isKhmer ? 'ល.រ' : language === 'zh' ? '序号' : '#'}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'orderCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'customerCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'itemsCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'totalCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'statusCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'paymentCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'dateCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'actionsCol')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`order-row-skeleton-${i}`} className="border-b border-gray-50 dark:border-gray-800/50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={`order-cell-skeleton-${i}-${j}`} className="py-3 px-4">
                        <div className="h-4 bg-gray-100 dark:bg-surface-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-500">
                    {adminT(language, 'noOrdersFound')}
                  </td>
                </tr>
              ) : (
                orders.map((order, idx) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-surface-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums w-12">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <CopyableOrderCode
                        code={order.orderNumber}
                        onClick={() => setSelectedOrder(order)}
                        size="xs"
                        variant="badge"
                        showCopyAlways={true}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">{order.user?.name || 'Customer'}</p>
                      <p className="text-xs text-gray-400">{order.address?.phone || order.user?.phone || order.user?.email}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{order.items.length} {isKhmer ? 'មុខ' : 'items'}</td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{formatPrice(order.total)}</td>
                    <td className="py-3 px-4">
                      <CustomDropdown
                        size="xs"
                        value={order.status}
                        onChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                        disabled={updatingId === order.id}
                        options={orderStatusOptions}
                        buttonClassName="w-auto min-w-[125px] font-semibold text-xs shadow-2xs"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {/* View Order Detail Modal Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          title={isKhmer ? 'មើលព័ត៌មានលម្អិតអំពីការកម្មង់' : 'View Order Details'}
                          className="p-1.5 rounded-lg border border-primary-200 dark:border-primary-900/50 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition flex items-center gap-1 text-xs font-semibold shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">{isKhmer ? 'មើល' : 'View'}</span>
                        </button>

                        {/* Thermal Receipt Print Button */}
                        <button
                          type="button"
                          onClick={() => handlePrintClick(order)}
                          title={isKhmer ? 'ព្រីនវិក្កយបត្រ POS' : 'Print Thermal POS Receipt'}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-surface-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-700 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Thermal Shipping Label (A6) Print Button */}
                        <button
                          type="button"
                          onClick={() => printThermalShippingLabel(order)}
                          title={isKhmer ? 'ព្រីនផ្លាកបិទកញ្ចប់ដឹកជញ្ជូន (Waybill A6 4x6")' : 'Print Shipping Label (A6)'}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition flex items-center gap-1 text-xs font-semibold shadow-xs"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ORDER DETAILS POPUP MODAL */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <div
          onClick={() => setSelectedOrder(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-white dark:bg-surface-900 rounded-[24px] shadow-2xl border border-gray-200/80 dark:border-surface-750 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-surface-800 flex items-center justify-between bg-gray-50/70 dark:bg-surface-850/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-md shadow-primary-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CopyableOrderCode
                      code={selectedOrder.orderNumber}
                      size="md"
                      variant="badge"
                      showCopyAlways={true}
                    />
                    <span className={`badge text-[11px] ${getOrderStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                    <span
                      className={`badge text-[11px] ${getPaymentStatusColor(selectedOrder.paymentStatus)}`}
                    >
                      {selectedOrder.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID (COD)'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(selectedOrder.createdAt)}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
              {/* Customer & Address Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Customer Info */}
                <div className="p-4 bg-gray-50 dark:bg-surface-850 rounded-2xl border border-gray-100 dark:border-surface-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-200/60 dark:border-surface-750">
                    <User className="w-4 h-4 text-primary-500" />
                    <span>{isKhmer ? 'ព័ត៌មានអតិថិជន' : 'Customer Info'}</span>
                  </div>
                  <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {selectedOrder.user?.name || selectedOrder.address?.name || 'Customer'}
                    </p>
                    <p className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-primary-500" />
                      <span>{selectedOrder.address?.phone || selectedOrder.user?.phone || 'N/A'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{selectedOrder.user?.email || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                {/* Shipping & Carrier Info */}
                <div className="p-4 bg-gray-50 dark:bg-surface-850 rounded-2xl border border-gray-100 dark:border-surface-800 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-surface-750">
                    <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                      <Truck className="w-4 h-4 text-primary-500" />
                      <span>{isKhmer ? 'ការដឹកជញ្ជូន & ក្រុមហ៊ុន' : 'Shipping & Logistics'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                      {getCarrierInfo(selectedOrder.shippingCarrier).name}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>
                        {[
                          selectedOrder.address?.province,
                          selectedOrder.address?.district,
                          selectedOrder.address?.commune,
                          selectedOrder.address?.village,
                        ].filter(Boolean).join(', ') || 'Phnom Penh, Cambodia'}
                        {selectedOrder.address?.roadNumber && ` (${selectedOrder.address.roadNumber})`}
                      </span>
                    </p>

                    {/* Live Carrier Tracking Link */}
                    {(() => {
                      const trackingUrl = getCarrierTrackingUrl(
                        selectedOrder.shippingCarrier,
                        selectedOrder.trackingNumber || selectedOrder.orderNumber
                      );
                      return (
                        <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-gray-200/60 dark:border-surface-750 text-[11px]">
                          <span className="text-gray-400 font-mono">
                            Ref: {selectedOrder.trackingNumber || selectedOrder.orderNumber}
                          </span>
                          {trackingUrl ? (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-primary-600 hover:text-primary-700 hover:underline"
                            >
                              <span>{isKhmer ? 'តាមដានកញ្ចប់' : 'Live Tracking'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-400 italic text-[10px]">Standard Delivery</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-surface-800 overflow-hidden">
                <div className="p-3 bg-gray-50 dark:bg-surface-850 border-b border-gray-200/80 dark:border-surface-800 flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary-500" />
                    <span>{isKhmer ? 'មុខទំនិញបញ្ជាទិញ' : 'Order Items'} ({selectedOrder.items.length})</span>
                  </span>
                  <span>{isKhmer ? 'តម្លៃសរុប' : 'Subtotal'}</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-surface-800 max-h-60 overflow-y-auto custom-scrollbar">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/50 dark:hover:bg-surface-850/50">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <span className="font-bold font-mono text-gray-900 dark:text-white shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Financial Totals */}
              <div className="p-4 bg-gray-50 dark:bg-surface-850 rounded-2xl border border-gray-100 dark:border-surface-800 space-y-2 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>{isKhmer ? 'តម្លៃទំនិញរាយ' : 'Subtotal'}:</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-white">{formatPrice(selectedOrder.subtotal || selectedOrder.total)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{isKhmer ? 'បញ្ចុះតម្លៃ' : 'Discount'}:</span>
                    <span className="font-mono font-medium">-{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>{isKhmer ? 'ថ្លៃសេវាដឹកជញ្ជូន' : 'Shipping Fee'}:</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-white">
                    {selectedOrder.shippingCost ? formatPrice(selectedOrder.shippingCost) : '$0.00'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200/80 dark:border-surface-700 flex justify-between items-baseline">
                  <div>
                    <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                      {isKhmer ? 'តម្លៃសរុប (Total Amount)' : 'Total Amount'}:
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {isKhmer ? 'វិធីសាស្ត្រទូទាត់' : 'Payment'}: {selectedOrder.paymentMethod ? selectedOrder.paymentMethod.toUpperCase() : 'Bakong KHQR'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-primary-600 dark:text-primary-400">
                      {formatPrice(selectedOrder.total)}
                    </p>
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      ≈ {formatKhrPrice(selectedOrder.total)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Update Controls inside Modal */}
              <div className="p-4 bg-primary-50/50 dark:bg-primary-950/20 rounded-2xl border border-primary-100 dark:border-primary-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                    {isKhmer ? 'កែប្រែស្ថានភាពការបញ្ជាទិញ' : 'Change Order Status'}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {isKhmer ? 'ជ្រើសរើសស្ថានភាពថ្មីដើម្បីធ្វើបច្ចុប្បន្នភាព' : 'Select a new status to update directly'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CustomDropdown
                    size="sm"
                    align="right"
                    value={selectedOrder.status}
                    onChange={(val) => handleStatusUpdate(selectedOrder.id, val)}
                    disabled={updatingId === selectedOrder.id}
                    options={orderStatusOptions}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-850 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Thermal Receipt Print */}
                <button
                  type="button"
                  onClick={() => handlePrintClick(selectedOrder)}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-surface-750 border border-gray-200 dark:border-surface-700 text-gray-800 dark:text-white text-xs font-bold hover:bg-gray-100 dark:hover:bg-surface-700 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-primary-600" />
                  <span>{isKhmer ? 'ព្រីនវិក្កយបត្រ POS' : 'Print POS Receipt'}</span>
                </button>

                {/* Thermal Shipping Label Print (A6 4x6") */}
                <button
                  type="button"
                  onClick={() => printThermalShippingLabel(selectedOrder)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs shadow-rose-500/20 active:scale-95 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{isKhmer ? 'ព្រីនផ្លាកដឹកជញ្ជូន (Waybill A6)' : 'Print Shipping Label'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-surface-750 dark:hover:bg-surface-700 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition"
              >
                {isKhmer ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Excel Export Hub */}
      <ExcelExportModal
        isOpen={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        orders={orders}
        products={products}
        categories={categories}
        language={language}
      />
    </div>
  );
}
