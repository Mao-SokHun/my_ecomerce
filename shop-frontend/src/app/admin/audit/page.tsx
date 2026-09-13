'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Download,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  User,
  Activity,
  Boxes,
  ShoppingCart,
  DollarSign,
  Layers,
  ArrowRight,
  Sparkles,
  PlusCircle,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AuditLogEntry,
  StaffRole,
  STAFF_ROLES,
  getAuditLogs,
  logAuditEvent,
  getActiveStaffRole,
} from '@/lib/rbac';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import toast from 'react-hot-toast';

export default function AdminAuditPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [activeRole, setActiveRole] = useState<StaffRole>('SUPER_ADMIN');
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    setLogs(getAuditLogs());
    setActiveRole(getActiveStaffRole());

    const handleUpdate = () => {
      setLogs(getAuditLogs());
    };
    const handleRoleChange = () => {
      setActiveRole(getActiveStaffRole());
    };

    window.addEventListener('audit_logs_updated', handleUpdate);
    window.addEventListener('staff_role_changed', handleRoleChange);
    return () => {
      window.removeEventListener('audit_logs_updated', handleUpdate);
      window.removeEventListener('staff_role_changed', handleRoleChange);
    };
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesCategory =
        selectedCategory === 'ALL' || log.actionCategory === selectedCategory;
      const matchesRole =
        selectedRole === 'ALL' || log.actorRole === selectedRole;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.descriptionKm.toLowerCase().includes(q) ||
        log.descriptionEn.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.targetName && log.targetName.toLowerCase().includes(q)) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(q));

      return matchesCategory && matchesRole && matchesSearch;
    });
  }, [logs, selectedCategory, selectedRole, searchQuery]);

  const stats = useMemo(() => {
    const total = logs.length;
    const stockLogs = logs.filter((l) => l.actionCategory === 'STOCK').length;
    const orderLogs = logs.filter((l) => l.actionCategory === 'ORDER').length;
    const authLogs = logs.filter((l) => l.actionCategory === 'AUTH').length;
    const productLogs = logs.filter((l) => l.actionCategory === 'PRODUCT').length;
    return { total, stockLogs, orderLogs, authLogs, productLogs };
  }, [logs]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error(isKhmer ? 'មិនមានទិន្នន័យដើម្បី Export ទេ' : 'No logs to export');
      return;
    }

    const headers = ['ID', 'Date', 'Category', 'Action', 'Actor', 'Role', 'Description (KM)', 'Previous Value', 'New Value', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.createdAt).toLocaleString('km-KH')}"`,
      `"${l.actionCategory}"`,
      `"${l.action}"`,
      `"${l.actorName.replace(/"/g, '""')}"`,
      `"${l.actorRole}"`,
      `"${l.descriptionKm.replace(/"/g, '""')}"`,
      `"${(l.previousValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || '103.216.50.12'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(isKhmer ? 'បានទាញយកឯកសារ Audit Log CSV ជោគជ័យ!' : 'Audit Log CSV exported successfully!');
  };

  const handleCreateSampleLog = () => {
    setIsSimulating(true);
    const sampleEvents = [
      {
        action: 'PRICE_UPDATE',
        actionCategory: 'PRODUCT' as const,
        descriptionKm: 'បានកែប្រែតម្លៃលក់ Keychron Q1 Pro ($189.00 -> $199.99)',
        descriptionEn: 'Updated product price for Keychron Q1 Pro ($189.00 -> $199.99)',
        targetName: 'Keychron Q1 Pro',
        previousValue: '$189.00',
        newValue: '$199.99',
      },
      {
        action: 'STOCK_RESTOCK',
        actionCategory: 'STOCK' as const,
        descriptionKm: 'បានទទួលការនាំចូលស្តុកថ្មី 20 គ្រឿង ពីផ្គត់ផ្គង់ E-Tech Cambodia',
        descriptionEn: 'Received 20 units restocked from E-Tech Cambodia',
        targetName: 'Logitech MX Master 3S',
        previousValue: 'Stock: 4',
        newValue: 'Stock: 24',
      },
      {
        action: 'WAYBILL_PRINTED',
        actionCategory: 'ORDER' as const,
        descriptionKm: 'បានព្រីនផ្លាកដឹកជញ្ជូន A6 Thermal Waybill សម្រាប់ J&T Express (Tracking: JNT-889921)',
        descriptionEn: 'Printed A6 Thermal Shipping Label for J&T Express (Tracking: JNT-889921)',
        targetName: 'ORD-JNT-9981',
        previousValue: 'UNPRINTED',
        newValue: 'PRINTED_A6',
      },
      {
        action: 'COUPON_GENERATION',
        actionCategory: 'SYSTEM' as const,
        descriptionKm: 'បានបង្កើតកូដបញ្ចុះតម្លៃ VIPPLATINUM (បញ្ចុះ 15%)',
        descriptionEn: 'Created discount promo code VIPPLATINUM (15% OFF)',
        targetName: 'VIPPLATINUM',
        previousValue: 'None',
        newValue: 'Active 15%',
      },
    ];

    const pick = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
    logAuditEvent({
      ...pick,
      actorName: 'Mao Sokhun (Admin)',
      actorRole: activeRole,
      ipAddress: '103.216.50.12 (Phnom Penh)',
    });

    setTimeout(() => {
      setIsSimulating(false);
      toast.success(isKhmer ? 'បានកត់ត្រាសកម្មភាព Audit ថ្មីជោគជ័យ!' : 'New sample audit log generated!');
    }, 400);
  };

  const getCategoryBadge = (cat: AuditLogEntry['actionCategory']) => {
    switch (cat) {
      case 'PRODUCT':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'STOCK':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'ORDER':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'AUTH':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'FINANCE':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl shadow-indigo-950/20 border border-slate-800 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                {isKhmer ? 'កំណត់ត្រាសវនកម្មសន្តិសុខ (Audit Trail Log)' : 'Security Audit Trail Log'}
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Active
                </span>
              </h1>
              <p className="text-xs text-slate-300">
                {isKhmer
                  ? 'កត់ត្រារាល់សកម្មភាពកែប្រែតម្លៃលក់ កាត់ស្តុកខូច ប្តូរស្ថានភាព Order និងការផ្លាស់ប្តូរសិទ្ធិបុគ្គលិកទាំងអស់'
                  : 'Immutable system audit log tracking price modifications, stock write-offs, order updates, and role permissions'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCreateSampleLog}
            disabled={isSimulating}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isKhmer ? 'សាកល្បងកត់ត្រា Log' : 'Simulate Log Event'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white text-xs font-bold transition shadow-md shadow-primary-500/25 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isKhmer ? 'ទាញយក CSV' : 'Export Audit CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isKhmer ? 'កំណត់ត្រាសរុប' : 'Total Logs'}
            </span>
            <Activity className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isKhmer ? 'ព្រឹត្តិការណ៍សន្តិសុខទាំងអស់' : 'All recorded events'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isKhmer ? 'សកម្មភាពស្តុកទំនិញ' : 'Stock Events'}
            </span>
            <Boxes className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.stockLogs}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isKhmer ? 'កាត់ខូច & កែប្រែចំនួន' : 'Write-offs & adjustments'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isKhmer ? 'សកម្មភាពបញ្ជាទិញ' : 'Order Events'}
            </span>
            <ShoppingCart className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats.orderLogs}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isKhmer ? 'ការដឹកជញ្ជូន & ស្ថានភាព' : 'Status & label printing'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isKhmer ? 'សិទ្ធិ & សុវត្ថិភាព' : 'Auth & Security'}
            </span>
            <Shield className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats.authLogs}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isKhmer ? 'ការប្តូរសិទ្ធិបុគ្គលិក' : 'Staff role changes'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isKhmer
                ? 'ស្វែងរកឈ្មោះបុគ្គលិក, សកម្មភាព, ទំនិញ...'
                : 'Search actor, action, product name, IP...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-gray-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-gray-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">{isKhmer ? '📂 គ្រប់ប្រភេទសកម្មភាព' : '📂 All Categories'}</option>
            <option value="PRODUCT">{isKhmer ? '📦 ផលិតផល (Product)' : '📦 Product'}</option>
            <option value="STOCK">{isKhmer ? '📊 ស្តុកទំនិញ (Stock)' : '📊 Stock'}</option>
            <option value="ORDER">{isKhmer ? '🛒 ការបញ្ជាទិញ (Order)' : '🛒 Order'}</option>
            <option value="AUTH">{isKhmer ? '🛡️ សិទ្ធិបុគ្គលិក (Auth & Roles)' : '🛡️ Auth & Roles'}</option>
            <option value="FINANCE">{isKhmer ? '💰 ហិរញ្ញវត្ថុ (Finance)' : '💰 Finance'}</option>
            <option value="SYSTEM">{isKhmer ? '⚙️ ប្រព័ន្ធ (System)' : '⚙️ System'}</option>
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-gray-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">{isKhmer ? '👤 គ្រប់តួនាទីបុគ្គលិក' : '👤 All Roles'}</option>
            <option value="SUPER_ADMIN">👑 Super Admin</option>
            <option value="ADMIN">💼 Admin</option>
            <option value="CASHIER">💳 Cashier / POS</option>
            <option value="WAREHOUSE">📦 Warehouse</option>
          </select>

          {(searchQuery || selectedCategory !== 'ALL' || selectedRole !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedRole('ALL');
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition"
            >
              {isKhmer ? 'សម្អាត Filter' : 'Reset Filter'}
            </button>
          )}
        </div>
      </div>

      {/* Audit Trail Logs Table */}
      <div className="rounded-3xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {isKhmer
                ? `បង្ហាញ ${filteredLogs.length} ក្នុងចំណោម ${logs.length} កំណត់ត្រា`
                : `Showing ${filteredLogs.length} of ${logs.length} audit records`}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isKhmer ? 'ទិន្នន័យត្រូវបានការពារដោយស្វ័យប្រវត្តិ' : 'Auto-protected immutable records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-surface-850/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-white/[0.06]">
                <th className="py-3 px-4">{isKhmer ? 'កាលបរិច្ឆេទ & ម៉ោង' : 'Timestamp'}</th>
                <th className="py-3 px-4">{isKhmer ? 'អ្នកធ្វើសកម្មភាព (Staff Actor)' : 'Staff Actor'}</th>
                <th className="py-3 px-4">{isKhmer ? 'ប្រភេទសកម្មភាព' : 'Category & Action'}</th>
                <th className="py-3 px-4">{isKhmer ? 'ព័ត៌មានលម្អិតនៃសកម្មភាព' : 'Activity Description'}</th>
                <th className="py-3 px-4">{isKhmer ? 'ការកែប្រែ (Previous -> New)' : 'Modification (Before -> After)'}</th>
                <th className="py-3 px-4">{isKhmer ? 'IP អាសយដ្ឋាន' : 'IP / Device'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-bold">
                        {isKhmer ? 'រកមិនឃើញកំណត់ត្រាសវនកម្មណាទេ' : 'No audit records match your filters'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const roleConfig = STAFF_ROLES[log.actorRole] || STAFF_ROLES.SUPER_ADMIN;
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {new Date(log.createdAt).toLocaleDateString('km-KH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Staff Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-[11px] shadow-sm">
                            {log.actorName[0] || 'A'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {log.actorName}
                            </p>
                            <span
                              className={`inline-flex items-center text-[9.5px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}
                            >
                              {roleConfig.titleEn}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category & Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border w-max ${getCategoryBadge(
                              log.actionCategory
                            )}`}
                          >
                            {log.actionCategory}
                          </span>
                          <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                            {log.action}
                          </span>
                        </div>
                      </td>

                      {/* Activity Description */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed max-w-md">
                          {isKhmer ? log.descriptionKm : log.descriptionEn}
                        </p>
                        {log.targetName && (
                          <span className="inline-block mt-1 text-[10.5px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-1.5 py-0.5 rounded-md border border-primary-100 dark:border-primary-900/50">
                            🎯 {log.targetName}
                          </span>
                        )}
                      </td>

                      {/* Previous -> New Value */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.previousValue || log.newValue ? (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {log.previousValue && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-mono line-through border border-rose-200/60 dark:border-rose-900/60">
                                {log.previousValue}
                              </span>
                            )}
                            {log.previousValue && log.newValue && (
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            )}
                            {log.newValue && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold font-mono border border-emerald-200/60 dark:border-emerald-900/60">
                                {log.newValue}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                            {log.ipAddress || '103.216.50.12'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Phnom Penh, KH
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
