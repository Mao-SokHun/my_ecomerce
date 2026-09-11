'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { orderApi } from '@/lib/api';
import { Order } from '@/types';
import { formatPrice, formatKhrPrice, formatDate, getOrderStatusColor, getPaymentStatusColor } from '@/lib/utils';
import { Search, RefreshCw, Printer, Volume2, VolumeX, Sparkles, Eye, X, MapPin, Phone, Mail, User, Package, CreditCard, Truck, Receipt, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { adminT } from '@/lib/admin-i18n';
import { playNewOrderChime, printThermalReceipt } from '@/components/admin/ThermalReceiptPrinter';
import Image from 'next/image';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';

export default function AdminOrdersPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_orders');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_orders');
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
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
        } catch {}
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

  // Live Auto-Polling every 6 seconds for new orders
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 6000);
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

  const orderStatusOptions: DropdownOption[] = [
    { value: 'PENDING', label: 'PENDING', dotColor: '#eab308' },
    { value: 'CONFIRMED', label: 'CONFIRMED', dotColor: '#3b82f6' },
    { value: 'PROCESSING', label: 'PROCESSING', dotColor: '#8b5cf6' },
    { value: 'SHIPPED', label: 'SHIPPED', dotColor: '#6366f1' },
    { value: 'DELIVERED', label: 'DELIVERED', dotColor: '#10b981' },
    { value: 'CANCELLED', label: 'CANCELLED', dotColor: '#ef4444' },
  ];

  const orderFilterOptions: DropdownOption[] = [
    { value: '', label: adminT(language, 'allStatuses'), dotColor: '#94a3b8' },
    ...orderStatusOptions,
  ];

  const paperWidthOptions: DropdownOption[] = [
    { value: '80mm', label: '80mm (Standard)' },
    { value: '58mm', label: '58mm (Small)' },
  ];

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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              soundAlertEnabled
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              autoPrintEnabled
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
            <Sparkles className="w-4 h-4" />
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={adminT(language, 'searchOrderPlaceholder')}
            className="input pl-9 text-sm"
          />
        </div>
        <CustomDropdown
          size="sm"
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          options={orderFilterOptions}
          className="w-44 shrink-0"
        />
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-800">
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
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={`order-cell-skeleton-${i}-${j}`} className="py-3 px-4">
                        <div className="h-4 bg-gray-100 dark:bg-surface-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    {adminT(language, 'noOrdersFound')}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-surface-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="font-mono font-bold text-primary-600 dark:text-primary-400 text-xs hover:underline flex items-center gap-1 text-left"
                        title={isKhmer ? 'ចុចដើម្បីមើលលម្អិត' : 'Click to view details'}
                      >
                        <span>{order.orderNumber}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">{order.user?.name || 'Customer'}</p>
                      <p className="text-xs text-gray-400">{order.address?.phone || order.user?.phone || order.user?.email}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{order.items.length} {isKhmer ? 'មុខ' : 'items'}</td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{formatPrice(order.total)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${getOrderStatusColor(order.status)}`}>{order.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`badge ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
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

                        {/* Order Status Select */}
                        <CustomDropdown
                          size="xs"
                          align="right"
                          value={order.status}
                          onChange={(val) => handleStatusUpdate(order.id, val)}
                          disabled={updatingId === order.id}
                          options={orderStatusOptions}
                        />
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
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-mono">
                      {selectedOrder.orderNumber}
                    </h2>
                    <span className={`badge text-[11px] ${getOrderStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                    <span
                      className={`badge text-[11px] ${
                        selectedOrder.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {selectedOrder.paymentStatus === 'PAID' ? 'PAID (បានបង់)' : 'UNPAID (មិនទាន់បង់)'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(selectedOrder.createdAt)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintClick(selectedOrder)}
                  className="px-3 py-1.5 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700 hover:border-primary-500 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition shadow-xs"
                  title="Print Thermal Receipt"
                >
                  <Printer className="w-3.5 h-3.5 text-primary-600" />
                  <span className="hidden sm:inline">{isKhmer ? 'ព្រីន' : 'Print'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-surface-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
              {/* Customer & Shipping Summary Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Customer Information */}
                <div className="p-4 bg-gray-50/80 dark:bg-surface-800/60 rounded-2xl border border-gray-100 dark:border-surface-750">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-primary-600" />
                    <span>{isKhmer ? 'ព័ត៌មានអតិថិជន' : 'Customer Info'}</span>
                  </h3>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedOrder.user?.name || selectedOrder.address?.name || 'Customer'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-mono font-medium">{selectedOrder.address?.phone || selectedOrder.user?.phone || 'N/A'}</span>
                    </p>
                    {selectedOrder.user?.email && (
                      <p className="text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{selectedOrder.user.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery Address & Carrier */}
                <div className="p-4 bg-gray-50/80 dark:bg-surface-800/60 rounded-2xl border border-gray-100 dark:border-surface-750">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    <span>{isKhmer ? 'អាសយដ្ឋានដឹកជញ្ជូន' : 'Shipping Address'}</span>
                  </h3>
                  <div className="space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedOrder.address
                        ? [selectedOrder.address.province, selectedOrder.address.district, selectedOrder.address.commune, selectedOrder.address.village].filter(Boolean).join(', ')
                        : 'មិនមានបញ្ជាក់'}
                    </p>
                    {selectedOrder.address?.roadNumber && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isKhmer ? 'ផ្ទះ/ផ្លូវ' : 'Road/House'}: {selectedOrder.address.roadNumber}
                      </p>
                    )}
                    {selectedOrder.notes && (
                      <p className="text-xs italic text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded-lg mt-1 border border-amber-200/50 dark:border-amber-900/40">
                        Note: {selectedOrder.notes}
                      </p>
                    )}
                    <div className="pt-2 flex items-center gap-2 text-xs">
                      <span className="text-gray-400">{isKhmer ? 'ដឹកតាម' : 'Carrier'}:</span>
                      <span className="px-2 py-0.5 rounded-md font-bold bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300 flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {selectedOrder.shippingCarrier === 'JNT' ? 'J&T Express' : 'VET (វីរៈប៊ុនថាំ)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ordered Items List */}
              <div className="border border-gray-100 dark:border-surface-750 rounded-2xl overflow-hidden">
                <div className="p-3 bg-gray-50 dark:bg-surface-800 border-b border-gray-100 dark:border-surface-750 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-primary-600" />
                    <span>{isKhmer ? 'មុខទំនិញដែលបានកុម្ម៉ង់' : 'Ordered Products'} ({selectedOrder.items.length})</span>
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">
                    {selectedOrder.items.reduce((s, i) => s + (i.quantity || 0), 0)} {isKhmer ? 'ចំនួនសរុប' : 'total items'}
                  </span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-surface-800">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={item.id || idx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-surface-800/30 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-surface-800 relative overflow-hidden shrink-0 border border-gray-100 dark:border-surface-700">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatPrice(item.price)} × <span className="font-bold text-gray-800 dark:text-gray-200">{item.quantity}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        <p className="text-[11px] text-gray-400 font-medium">
                          ≈ {formatKhrPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="p-4 bg-slate-50 dark:bg-surface-800/50 rounded-2xl border border-gray-100 dark:border-surface-750 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{isKhmer ? 'តម្លៃដើម (Subtotal)' : 'Subtotal'}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>
                      {isKhmer ? 'បញ្ចុះតម្លៃ' : 'Discount'} {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}:
                    </span>
                    <span className="font-medium">-{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{isKhmer ? 'ថ្លៃដឹកជញ្ជូន (Shipping)' : 'Shipping Fee'}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPrice(selectedOrder.shippingCost)}</span>
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-surface-800 bg-gray-50 dark:bg-surface-850 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-surface-750 dark:hover:bg-surface-700 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition"
              >
                {isKhmer ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
