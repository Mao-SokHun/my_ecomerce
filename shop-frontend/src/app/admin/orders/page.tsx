'use client';

import { useCallback, useEffect, useState } from 'react';
import { orderApi } from '@/lib/api';
import { Order } from '@/types';
import { formatPrice, formatDate, getOrderStatusColor } from '@/lib/utils';
import { Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';

export default function AdminOrdersPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await orderApi.adminGetAll(params);
      setOrders(data.data || []);
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await orderApi.adminUpdateStatus(orderId, { status });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: status as Order['status'] } : o));
      toast.success('Status updated');
    } catch { toast.error('Failed to update'); }
    finally { setUpdatingId(null); }
  };

  const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  return (
    <div style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-gray-500 text-sm">{orders.length} total orders</p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order or customer..."
            className="input pl-9 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input text-sm w-auto"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-800">
                {['Order', 'Customer', 'Items', 'Total', 'Status', 'Payment', 'Date', 'Action'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`order-row-skeleton-${i}`} className="border-b border-gray-50 dark:border-gray-800/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={`order-cell-skeleton-${i}-${j}`} className="py-3 px-4"><div className="h-4 bg-gray-100 dark:bg-surface-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-500">No orders found</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-primary-600 text-xs">{order.orderNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">{order.user?.name}</p>
                      <p className="text-xs text-gray-400">{order.user?.email}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{order.items.length} items</td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{formatPrice(order.total)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${getOrderStatusColor(order.status)}`}>{order.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700'}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                    <td className="py-3 px-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        disabled={updatingId === order.id}
                        className="text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-800 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:text-white"
                      >
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
