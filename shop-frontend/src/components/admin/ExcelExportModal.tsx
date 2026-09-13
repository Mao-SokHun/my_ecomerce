'use client';

import React, { useState, useMemo } from 'react';
import { Order, Product, Category } from '@/types';
import { generateEcommerceExcelReport, ReportPeriod } from '@/lib/excelReportGenerator';
import { formatPrice } from '@/lib/utils';
import {
  FileSpreadsheet,
  Calendar,
  Download,
  X,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  products: Product[];
  categories?: Category[];
  language?: 'km' | 'en' | 'zh';
}

export function ExcelExportModal({
  isOpen,
  onClose,
  orders,
  products,
  categories = [],
  language = 'km',
}: ExcelExportModalProps) {
  const isKhmer = language === 'km';

  // Period Selection State
  const [period, setPeriod] = useState<ReportPeriod>('monthly');

  // Month & Year Pickers
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-indexed

  const monthOptions: DropdownOption[] = useMemo(() => [
    { value: '0', label: 'មករា (January)' },
    { value: '1', label: 'កុម្ភៈ (February)' },
    { value: '2', label: 'មីនា (March)' },
    { value: '3', label: 'មេសា (April)' },
    { value: '4', label: 'ឧសភា (May)' },
    { value: '5', label: 'មិថុនា (June)' },
    { value: '6', label: 'កក្កដា (July)' },
    { value: '7', label: 'សីហា (August)' },
    { value: '8', label: 'កញ្ញា (September)' },
    { value: '9', label: 'តុលា (October)' },
    { value: '10', label: 'វិច្ឆិកា (November)' },
    { value: '11', label: 'ធ្នូ (December)' },
  ], []);

  const yearOptions: DropdownOption[] = useMemo(() => [
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
  ], []);

  // Weekly Sub-option: 'current' (Mon-Sun of this week) or 'last7' (last 7 days)
  const [weeklyMode, setWeeklyMode] = useState<'current' | 'last7'>('current');

  // Custom Range State
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEndDate = now.toISOString().split('T')[0];
  const [customStart, setCustomStart] = useState<string>(defaultStartDate);
  const [customEnd, setCustomEnd] = useState<string>(defaultEndDate);

  // Sheets selection
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeOrders, setIncludeOrders] = useState(true);
  const [includeTopProducts, setIncludeTopProducts] = useState(true);
  const [includeInventory, setIncludeInventory] = useState(true);

  // Generating loading state
  const [isGenerating, setIsGenerating] = useState(false);

  // Compute Active Date Range based on selection
  const activeDateRange = useMemo(() => {
    if (period === 'weekly') {
      if (weeklyMode === 'last7') {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        return {
          start,
          end,
          label: isKhmer
            ? `៧ ថ្ងៃចុងក្រោយ (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`
            : `Last 7 Days (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`,
        };
      } else {
        // Monday to Sunday of current week
        const curr = new Date();
        const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
        const start = new Date(curr.setDate(first));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return {
          start,
          end,
          label: isKhmer
            ? `សប្ដាហ៍នេះ (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`
            : `Current Week (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`,
        };
      }
    } else if (period === 'monthly') {
      const start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      const monthNames = [
        'មករា (January)', 'កុម្ភៈ (February)', 'មីនា (March)', 'មេសា (April)',
        'ឧសភា (May)', 'មិថុនា (June)', 'កក្កដា (July)', 'សីហា (August)',
        'កញ្ញា (September)', 'តុលា (October)', 'វិច្ឆិកា (November)', 'ធ្នូ (December)'
      ];
      return {
        start,
        end,
        label: isKhmer
          ? `ប្រចាំខែ ${monthNames[selectedMonth]} ${selectedYear}`
          : `Monthly: ${monthNames[selectedMonth]} ${selectedYear}`,
      };
    } else if (period === 'yearly') {
      const start = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      return {
        start,
        end,
        label: isKhmer ? `ប្រចាំឆ្នាំ ${selectedYear}` : `Yearly: ${selectedYear}`,
      };
    } else {
      // Custom Range
      const start = new Date(`${customStart}T00:00:00`);
      const end = new Date(`${customEnd}T23:59:59.999`);
      return {
        start,
        end,
        label: `${customStart} ដល់ ${customEnd}`,
      };
    }
  }, [period, weeklyMode, selectedYear, selectedMonth, customStart, customEnd, isKhmer]);

  // Real-time Preview Statistics
  const previewStats = useMemo(() => {
    const matching = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= activeDateRange.start && d <= activeDateRange.end;
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let revenue = 0;
    let cost = 0;
    let itemsCount = 0;

    matching.forEach((o) => {
      if (o.status !== 'CANCELLED') {
        revenue += o.total || 0;
        o.items?.forEach((i) => {
          const prod = productMap.get(i.productId);
          cost += (prod?.costPrice || 0) * (i.quantity || 1);
          itemsCount += i.quantity || 1;
        });
      }
    });

    const profit = Math.max(0, revenue - cost);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      orderCount: matching.length,
      revenue,
      cost,
      profit,
      margin: Math.round(margin),
      itemsCount,
    };
  }, [orders, products, activeDateRange]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateEcommerceExcelReport({
        period,
        dateRange: activeDateRange,
        orders,
        products,
        categories,
        language,
        includeSheets: {
          summary: includeSummary,
          orders: includeOrders,
          topProducts: includeTopProducts,
          inventory: includeInventory,
        },
      });
      toast.success(
        isKhmer
          ? 'បានទាញយករបាយការណ៍ Excel ដោយជោគជ័យ!'
          : 'Excel Report downloaded successfully!'
      );
      onClose();
    } catch (err) {
      console.error('[ExcelExport] Error generating report:', err);
      toast.error(
        isKhmer
          ? 'មានបញ្ហាក្នុងការបង្កើតរបាយការណ៍ Excel'
          : 'Failed to generate Excel report'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        style={isKhmer ? { fontFamily: "'Kantumruy Pro', 'Noto Sans Khmer', 'Inter', sans-serif" } : undefined}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {isKhmer ? 'ទាញយករបាយការណ៍ Excel (E-Commerce Report)' : 'Export Professional Excel Report'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-white/20 text-white border border-white/30">
                  SH-Shop Pro
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                {isKhmer
                  ? 'របាយការណ៍ហិរញ្ញវត្ថុ ការកុម្ម៉ង់ និងស្តុកទំនិញស្តង់ដារខ្ពស់'
                  : 'Multi-sheet accounting, sales & inventory valuation workbook'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Period Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {isKhmer ? '១. ជ្រើសរើសប្រភេទកាលបរិច្ឆេទ (Select Period)' : '1. Select Report Period'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPeriod('weekly')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                  period === 'weekly'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-surface-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Calendar className="w-4 h-4 mb-1 text-emerald-600" />
                <span>{isKhmer ? 'ប្រចាំសប្ដាហ៍' : 'Weekly'}</span>
                <span className="text-[10px] opacity-75 font-normal">7 Days / Week</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                  period === 'monthly'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-surface-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Calendar className="w-4 h-4 mb-1 text-emerald-600" />
                <span>{isKhmer ? 'ប្រចាំខែ' : 'Monthly'}</span>
                <span className="text-[10px] opacity-75 font-normal">Day-by-Day</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriod('yearly')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                  period === 'yearly'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-surface-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Calendar className="w-4 h-4 mb-1 text-emerald-600" />
                <span>{isKhmer ? 'ប្រចាំឆ្នាំ' : 'Yearly'}</span>
                <span className="text-[10px] opacity-75 font-normal">12 Months Full</span>
              </button>

              <button
                type="button"
                onClick={() => setPeriod('custom')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                  period === 'custom'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-surface-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Layers className="w-4 h-4 mb-1 text-emerald-600" />
                <span>{isKhmer ? 'កំណត់កាលបរិច្ឆេទ' : 'Custom'}</span>
                <span className="text-[10px] opacity-75 font-normal">From - To</span>
              </button>
            </div>
          </div>

          {/* Period Details Configuration */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            {period === 'weekly' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeeklyMode('current')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    weeklyMode === 'current'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-surface-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {isKhmer ? 'សប្ដាហ៍នេះ (ច័ន្ទ - អាទិត្យ)' : 'Current Week (Mon - Sun)'}
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyMode('last7')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    weeklyMode === 'last7'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-surface-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {isKhmer ? '៧ ថ្ងៃចុងក្រោយ (Last 7 Days)' : 'Last 7 Days Rolling'}
                </button>
              </div>
            )}

            {period === 'monthly' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {isKhmer ? 'ជ្រើសរើសខែ' : 'Select Month'}
                  </label>
                  <CustomDropdown
                    value={String(selectedMonth)}
                    onChange={(val) => setSelectedMonth(Number(val))}
                    options={monthOptions}
                    size="sm"
                    variant="emerald"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {isKhmer ? 'ជ្រើសរើសឆ្នាំ' : 'Select Year'}
                  </label>
                  <CustomDropdown
                    value={String(selectedYear)}
                    onChange={(val) => setSelectedYear(Number(val))}
                    options={yearOptions}
                    size="sm"
                    variant="emerald"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {period === 'yearly' && (
              <div className="max-w-xs">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  {isKhmer ? 'ជ្រើសរើសឆ្នាំ' : 'Select Year'}
                </label>
                <CustomDropdown
                  value={String(selectedYear)}
                  onChange={(val) => setSelectedYear(Number(val))}
                  options={yearOptions}
                  size="sm"
                  variant="emerald"
                  className="w-full"
                />
              </div>
            )}

            {period === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {isKhmer ? 'ចាប់ពីថ្ងៃ (Start Date)' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-surface-800 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {isKhmer ? 'ដល់ថ្ងៃ (End Date)' : 'End Date'}
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-surface-800 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 pt-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {isKhmer ? 'កាលបរិច្ឆេទដែលត្រូវ Export:' : 'Export Period:'}{' '}
                <strong className="text-slate-800 dark:text-slate-200">{activeDateRange.label}</strong>
              </span>
            </div>
          </div>

          {/* Live Data Preview Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isKhmer ? '២. ទិដ្ឋភាពទិន្នន័យត្រួសៗ (Live Data Preview)' : '2. Live Summary Preview'}
              </label>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {previewStats.orderCount} {isKhmer ? 'ការកុម្ម៉ង់ត្រូវគ្នា' : 'Matching Orders'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[10px] text-slate-500 font-medium uppercase">
                  {isKhmer ? 'ចំណូលសរុប (Revenue)' : 'Total Revenue'}
                </p>
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {formatPrice(previewStats.revenue)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200/80 dark:border-slate-800">
                <p className="text-[10px] text-slate-500 font-medium uppercase">
                  {isKhmer ? 'ថ្លៃដើមទំនិញ (COGS)' : 'Cost (COGS)'}
                </p>
                <p className="text-sm sm:text-base font-extrabold text-slate-600 dark:text-slate-300 mt-0.5">
                  {formatPrice(previewStats.cost)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium uppercase">
                  {isKhmer ? 'ប្រាក់ចំណេញដុល (Profit)' : 'Gross Profit'}
                </p>
                <p className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {formatPrice(previewStats.profit)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40">
                <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium uppercase">
                  {isKhmer ? 'ភាគរយចំណេញ (Margin)' : 'Profit Margin'}
                </p>
                <p className="text-sm sm:text-base font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5">
                  {previewStats.margin}%
                </p>
              </div>
            </div>
          </div>

          {/* Sheets Included Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              {isKhmer ? '៣. សន្លឹកកិច្ចការក្នុងឯកសារ Excel (Included Worksheets)' : '3. Worksheets Included'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-surface-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    📊 {isKhmer ? 'សេចក្តីសង្ខេបប្រតិបត្តិការ (Executive Summary)' : 'Executive Summary & KPIs'}
                  </p>
                  <p className="text-[10px] text-slate-400">KPI Cards & Period Distribution</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-surface-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeOrders}
                  onChange={(e) => setIncludeOrders(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    📦 {isKhmer ? 'បញ្ជីការកុម្ម៉ង់លម្អិត (Orders Report)' : 'Detailed Orders List'}
                  </p>
                  <p className="text-[10px] text-slate-400">Full order rows with cost & profit formula</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-surface-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeTopProducts}
                  onChange={(e) => setIncludeTopProducts(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    🏷️ {isKhmer ? 'ទំនិញលក់ដាច់ (Top Selling Products)' : 'Top Selling Products'}
                  </p>
                  <p className="text-[10px] text-slate-400">Ranked by units sold & revenue</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-surface-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeInventory}
                  onChange={(e) => setIncludeInventory(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    🏬 {isKhmer ? 'ស្ថានភាពស្តុក & ដើមទុន (Inventory Valuation)' : 'Inventory & Capital Valuation'}
                  </p>
                  <p className="text-[10px] text-slate-400">Current stock, capital & potential profit</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-surface-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-surface-800 transition active:scale-95"
          >
            {isKhmer ? 'បោះបង់' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/25 transition active:scale-95 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isKhmer ? 'កំពុងបង្កើតឯកសារ...' : 'Generating Excel...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isKhmer ? 'ទាញយកឯកសារ Excel (.xlsx)' : 'Download Excel Report (.xlsx)'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
