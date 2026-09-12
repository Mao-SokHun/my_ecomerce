'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { adminApi, orderApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { CustomDropdown } from '@/components/ui/CustomDropdown';
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Search,
  Download,
  Printer,
  RefreshCw,
  Sparkles,
  PieChart,
  BarChart3,
  Percent,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Delete,
  History,
  Bookmark,
  Trash2,
} from 'lucide-react';
import type { Product, Category, Order } from '@/types';
import toast from 'react-hot-toast';

export default function FinancialAccountingPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'profit_desc' | 'margin_desc' | 'stock_desc' | 'cost_desc' | 'name_asc'>('profit_desc');

  // Dropdown options for sort
  const sortOptions = useMemo(() => [
    { value: 'profit_desc', label: isKhmer ? 'ចំណេញសរុបខ្ពស់បំផុត' : 'Highest Total Profit', icon: <span>💰</span> },
    { value: 'margin_desc', label: isKhmer ? 'Margin % ខ្ពស់បំផុត' : 'Highest Margin %', icon: <span>📈</span> },
    { value: 'stock_desc', label: isKhmer ? 'ចំនួនស្តុកច្រើនបំផុត' : 'Highest Stock', icon: <span>📦</span> },
    { value: 'cost_desc', label: isKhmer ? 'ដើមទុនខ្ពស់បំផុត' : 'Highest Inventory Cost', icon: <span>🏷️</span> },
    { value: 'name_asc', label: isKhmer ? 'តាមឈ្មោះ A-Z' : 'Name A-Z', icon: <span>🔤</span> },
  ], [isKhmer]);

  // Interactive Profit Simulator state
  const [simCost, setSimCost] = useState<string>('20.00');
  const [simPrice, setSimPrice] = useState<string>('45.00');
  const [simQty, setSimQty] = useState<string>('50');

  // Calculation history
  type SimHistoryEntry = {
    id: number; cost: number; price: number; qty: number;
    profit: number; margin: number; markup: number; timestamp: string;
  };
  const [simHistory, setSimHistory] = useState<SimHistoryEntry[]>([]);

  // Backspace: remove last character from a numeric string
  const backspace = (val: string, setter: (v: string) => void) => {
    const next = val.slice(0, -1);
    setter(next === '' || next === '-' ? '0' : next);
  };

  // ─── General Purpose Calculator ───────────────────────────────────────────
  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const [calcPrev, setCalcPrev]       = useState<number | null>(null);
  const [calcOp, setCalcOp]           = useState<string | null>(null);
  const [calcWait, setCalcWait]       = useState<boolean>(false);
  const [calcExpr, setCalcExpr]       = useState<string>('');   // expression shown above display

  const calcCompute = (a: number, op: string, b: number): number => {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '×') return a * b;
    if (op === '÷') return b === 0 ? 0 : a / b;
    return b;
  };

  const handleCalc = (key: string) => {
    const cur = parseFloat(calcDisplay) || 0;

    if (key === 'AC') {
      setCalcDisplay('0'); setCalcPrev(null);
      setCalcOp(null); setCalcWait(false); setCalcExpr('');
      return;
    }

    if (key === '⌫') {
      if (calcDisplay.length > 1) setCalcDisplay(calcDisplay.slice(0, -1));
      else setCalcDisplay('0');
      return;
    }

    if (key === '±') {
      setCalcDisplay(String(cur * -1));
      return;
    }

    if (key === '%') {
      const result = calcPrev !== null && calcOp ? calcPrev * (cur / 100) : cur / 100;
      setCalcDisplay(String(parseFloat(result.toPrecision(12))));
      setCalcWait(true);
      return;
    }

    if (['+', '-', '×', '÷'].includes(key)) {
      if (calcOp && !calcWait) {
        // Chain: compute running result first
        const result = calcCompute(calcPrev ?? cur, calcOp, cur);
        const pretty = parseFloat(result.toPrecision(12));
        setCalcDisplay(String(pretty));
        setCalcPrev(pretty);
        setCalcExpr(`${pretty} ${key}`);
      } else {
        setCalcPrev(cur);
        setCalcExpr(`${cur} ${key}`);
      }
      setCalcOp(key);
      setCalcWait(true);
      return;
    }

    if (key === '=') {
      if (calcOp && calcPrev !== null) {
        const result = calcCompute(calcPrev, calcOp, cur);
        const pretty = parseFloat(result.toPrecision(12));
        setCalcExpr(`${calcPrev} ${calcOp} ${cur} =`);
        setCalcDisplay(String(pretty));
        setCalcPrev(null); setCalcOp(null); setCalcWait(false);
      }
      return;
    }

    if (key === '.') {
      const base = calcWait ? '0' : calcDisplay;
      if (!base.includes('.')) {
        setCalcDisplay(base + '.');
        setCalcWait(false);
      }
      return;
    }

    // Digit
    if (calcWait) {
      setCalcDisplay(key);
      setCalcWait(false);
    } else {
      setCalcDisplay(calcDisplay === '0' ? key : calcDisplay + key);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [prodRes, catRes, orderRes] = await Promise.all([
        adminApi.getProducts({ limit: 200 }),
        adminApi.getCategories(),
        adminApi.getOrders({ limit: 100 }),
      ]);
      setProducts(prodRes.data.data || []);
      setCategories(catRes.data.data || []);
      setOrders(orderRes.data.data || []);
    } catch (err) {
      console.error('Failed to load accounting data:', err);
      toast.error(isKhmer ? 'មិនអាចទាញយកទិន្នន័យគណនេយ្យបានទេ' : 'Failed to load financial data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category map
  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Core Aggregations
  const financials = useMemo(() => {
    let totalStockUnits = 0;
    let totalInventoryCost = 0;
    let totalRetailValue = 0;
    let totalSoldUnits = 0;
    let missingCostCount = 0;

    products.forEach((p) => {
      const stock = Number(p.stock) || 0;
      const price = Number(p.price) || 0;
      const cost = Number(p.costPrice) || 0;
      const sold = Number(p.soldCount) || 0;

      totalStockUnits += stock;
      totalSoldUnits += sold;
      totalInventoryCost += stock * cost;
      totalRetailValue += stock * price;

      if (!p.costPrice || p.costPrice <= 0) {
        missingCostCount++;
      }
    });

    const totalEstGrossProfit = Math.max(0, totalRetailValue - totalInventoryCost);
    const overallMargin = totalRetailValue > 0 ? Math.round((totalEstGrossProfit / totalRetailValue) * 100) : 0;

    // Realized profit from paid orders
    let realizedRevenue = 0;
    let realizedProfit = 0;
    orders.forEach((o) => {
      if (o.paymentStatus === 'PAID' || o.status === 'DELIVERED') {
        realizedRevenue += o.total || 0;
        // Approximate product cost for paid items
        o.items?.forEach((item) => {
          const itemPrice = item.price || 0;
          const itemQty = item.quantity || 1;
          const prod = products.find((p) => p.id === item.productId);
          const itemCost = prod?.costPrice || (itemPrice * 0.6); // default 60% if unknown
          realizedProfit += Math.max(0, (itemPrice - itemCost) * itemQty);
        });
      }
    });

    return {
      totalStockUnits,
      totalSoldUnits,
      totalInventoryCost,
      totalRetailValue,
      totalEstGrossProfit,
      overallMargin,
      realizedRevenue,
      realizedProfit,
      missingCostCount,
    };
  }, [products, orders]);

  // Filtered & Sorted Products
  const processedProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    list.sort((a, b) => {
      const aCost = a.costPrice || 0;
      const bCost = b.costPrice || 0;
      const aProfitUnit = Math.max(0, (a.price || 0) - aCost);
      const bProfitUnit = Math.max(0, (b.price || 0) - bCost);
      const aTotalProfit = aProfitUnit * (a.stock || 0);
      const bTotalProfit = bProfitUnit * (b.stock || 0);
      const aMargin = a.price > 0 ? (aProfitUnit / a.price) * 100 : 0;
      const bMargin = b.price > 0 ? (bProfitUnit / b.price) * 100 : 0;

      if (sortBy === 'profit_desc') return bTotalProfit - aTotalProfit;
      if (sortBy === 'margin_desc') return bMargin - aMargin;
      if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
      if (sortBy === 'cost_desc') return (bCost * (b.stock || 0)) - (aCost * (a.stock || 0));
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [products, search, selectedCategory, sortBy]);

  // Category Breakdown Analysis
  const categoryAnalysis = useMemo(() => {
    const map = new Map<string, { name: string; count: number; cost: number; retail: number; profit: number }>();
    products.forEach((p) => {
      const catName = p.category?.name || categoriesMap.get(p.categoryId) || (isKhmer ? 'ផ្សេងៗ' : 'Other');
      const stock = Number(p.stock) || 0;
      const cost = Number(p.costPrice) || 0;
      const price = Number(p.price) || 0;

      const itemCost = stock * cost;
      const itemRetail = stock * price;
      const itemProfit = Math.max(0, itemRetail - itemCost);

      if (!map.has(catName)) {
        map.set(catName, { name: catName, count: 0, cost: 0, retail: 0, profit: 0 });
      }
      const c = map.get(catName)!;
      c.count += stock;
      c.cost += itemCost;
      c.retail += itemRetail;
      c.profit += itemProfit;
    });

    const result = Array.from(map.values());
    result.sort((a, b) => b.profit - a.profit);
    return result;
  }, [products, categoriesMap, isKhmer]);

  // Profit Simulator calculations
  const simResult = useMemo(() => {
    const cost = Math.max(0, Number(simCost) || 0);
    const price = Math.max(0, Number(simPrice) || 0);
    const qty = Math.max(1, Number(simQty) || 1);

    const profitPerUnit = Math.max(0, price - cost);
    const totalCost = cost * qty;
    const totalRevenue = price * qty;
    const totalProfit = profitPerUnit * qty;
    const margin = price > 0 ? Math.round((profitPerUnit / price) * 100) : 0;
    const markup = cost > 0 ? Math.round((profitPerUnit / cost) * 100) : 0;

    return {
      profitPerUnit,
      totalCost,
      totalRevenue,
      totalProfit,
      margin,
      markup,
    };
  }, [simCost, simPrice, simQty]);

  // CSV Export
  const exportCSV = () => {
    if (products.length === 0) return;
    const headers = ['Product Name', 'Category', 'Stock', 'Cost Price ($)', 'Selling Price ($)', 'Profit/Unit ($)', 'Margin (%)', 'Total Cost ($)', 'Est Profit ($)'];
    const rowsData = products.map((p) => {
      const cost = p.costPrice || 0;
      const price = p.price || 0;
      const profitUnit = Math.max(0, price - cost);
      const margin = price > 0 ? Math.round((profitUnit / price) * 100) : 0;
      const totalCost = (p.stock || 0) * cost;
      const totalProfit = (p.stock || 0) * profitUnit;
      const cat = p.category?.name || categoriesMap.get(p.categoryId) || '';
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${cat}"`,
        p.stock || 0,
        cost.toFixed(2),
        price.toFixed(2),
        profitUnit.toFixed(2),
        `${margin}%`,
        totalCost.toFixed(2),
        totalProfit.toFixed(2),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rowsData].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial-inventory-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(isKhmer ? 'បានទាញយករបាយការណ៍ CSV ជោគជ័យ' : 'CSV Report downloaded successfully');
  };

  // Save current simulation to history
  const saveToHistory = () => {
    const cost = Math.max(0, Number(simCost) || 0);
    const price = Math.max(0, Number(simPrice) || 0);
    const qty = Math.max(1, Number(simQty) || 1);
    const profitPerUnit = Math.max(0, price - cost);
    const margin = price > 0 ? Math.round((profitPerUnit / price) * 100) : 0;
    const markup = cost > 0 ? Math.round((profitPerUnit / cost) * 100) : 0;
    setSimHistory((prev) => [{
      id: Date.now(), cost, price, qty,
      profit: profitPerUnit * qty, margin, markup,
      timestamp: new Date().toLocaleTimeString(),
    }, ...prev].slice(0, 8));
    toast.success(isKhmer ? 'បានរក្សាទុករបាយការណ៍ក្នុង History' : 'Saved to history!');
  };

  return (
    <div
      className="space-y-4 pb-12"
      style={isKhmer ? { fontFamily: "'Kantumruy Pro', 'Noto Sans Khmer', 'Khmer OS Siemreap', 'Inter', sans-serif" } : undefined}
    >
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-surface-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/25">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {isKhmer ? 'របាយការណ៍ហិរញ្ញវត្ថុ ដើមទុន និងប្រាក់ចំណេញ' : 'Financial Accounting & Profit Valuation'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isKhmer ? 'ការវិភាគថ្លៃដើមនាំចូល (Cost), តម្លៃលក់ (Price), និងប្រាក់ចំណេញដុល (Gross Profit)' : 'Real-time Cost vs Retail Valuation, Profit Margin analysis, and stock inventory capital'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'ទាញយក CSV' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => loadData(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isKhmer ? 'Refresh ទិន្នន័យ' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Missing Cost Alert */}
      {financials.missingCostCount > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isKhmer
                ? `មាន ${financials.missingCostCount} មុខទំនិញមិនទាន់បានកំណត់ថ្លៃដើមនាំចូល (Cost Price) ឡើយ។`
                : `There are ${financials.missingCostCount} products without an assigned cost price.`}
            </span>
          </div>
          <Link
            href="/admin/products"
            className="font-bold underline text-amber-700 dark:text-amber-300 hover:text-amber-900 shrink-0"
          >
            {isKhmer ? 'កែសម្រួលទំនិញ' : 'Edit Products'}
          </Link>
        </div>
      )}

      {/* 4 Main Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Cost */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isKhmer ? 'ដើមទុនក្នុងស្តុកសរុប (យកមក)' : 'Total Inventory Capital'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatPrice(financials.totalInventoryCost, language)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <span>{financials.totalStockUnits.toLocaleString()} {isKhmer ? 'គ្រឿងសរុប' : 'units in stock'}</span>
          </div>
        </div>

        {/* 2. Retail Value */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isKhmer ? 'ចំណូលលក់ចេញប៉ាន់ស្មាន' : 'Estimated Retail Value'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {formatPrice(financials.totalRetailValue, language)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{products.length} {isKhmer ? 'មុខទំនិញសរុប' : 'active products'}</span>
          </div>
        </div>

        {/* 3. Est Gross Profit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:to-surface-900 border border-emerald-500/30 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              {isKhmer ? 'ប្រាក់ចំណេញដុលប៉ាន់ស្មាន' : 'Est. Gross Profit'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
              +
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatPrice(financials.totalEstGrossProfit, language)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              Margin: {financials.overallMargin}%
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">{isKhmer ? 'លើស្តុកទាំងអស់' : 'overall'}</span>
          </div>
        </div>

        {/* 4. Realized Paid Profit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isKhmer ? 'ចំណេញជាក់ស្តែងពីការលក់' : 'Realized Gross Profit'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
            +{formatPrice(financials.realizedProfit, language)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{isKhmer ? 'ចំណូលលក់បាន:' : 'Revenue:'} <strong>{formatPrice(financials.realizedRevenue, language)}</strong></span>
          </div>
        </div>
      </div>

      {/* Middle Section: Category Breakdown & Compact Profit Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Category Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {isKhmer ? 'ការបែងចែកចំណេញតាមប្រភេទ' : 'Profit by Category'}
              </h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-surface-800 text-slate-500">
              {categoryAnalysis.length} {isKhmer ? 'ប្រភេទ' : 'Categories'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
            {categoryAnalysis.map((cat) => {
              const margin = cat.retail > 0 ? Math.round((cat.profit / cat.retail) * 100) : 0;
              const profitShare = financials.totalEstGrossProfit > 0 ? Math.round((cat.profit / financials.totalEstGrossProfit) * 100) : 0;

              return (
                <div key={cat.name} className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-surface-850 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[140px]">{cat.name}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      +{formatPrice(cat.profit, language)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-surface-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      style={{ width: `${Math.max(5, Math.min(100, profitShare))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{cat.count} {isKhmer ? 'គ្រឿង' : 'pcs'} • Margin: {margin}%</span>
                    <span>{profitShare}% {isKhmer ? 'ចំណែកចំណេញ' : 'share'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profit Simulator with Backspace + History */}
        <div className="h-fit bg-white dark:bg-surface-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                {isKhmer ? 'ម៉ាស៊ីនគណនាចំណេញ' : 'Profit Simulator'}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
              Live
            </span>
          </div>

          {/* 3 Inputs with backspace buttons */}
          <div className="grid grid-cols-3 gap-3">
            {/* Cost */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {isKhmer ? 'ដើមទុន ($)' : 'Cost ($)'}
              </label>
              <div className="flex gap-1">
                <input
                  type="number" step="0.01" value={simCost}
                  onChange={(e) => setSimCost(e.target.value)}
                  className="w-full h-10 px-2 text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button type="button" onClick={() => backspace(simCost, setSimCost)}
                  title="Delete last digit"
                  className="h-10 w-9 shrink-0 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition active:scale-95">
                  <Delete className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sell Price */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {isKhmer ? 'លក់ ($)' : 'Sell ($)'}
              </label>
              <div className="flex gap-1">
                <input
                  type="number" step="0.01" value={simPrice}
                  onChange={(e) => setSimPrice(e.target.value)}
                  className="w-full h-10 px-2 text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button type="button" onClick={() => backspace(simPrice, setSimPrice)}
                  title="Delete last digit"
                  className="h-10 w-9 shrink-0 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition active:scale-95">
                  <Delete className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Qty */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {isKhmer ? 'ចំនួន' : 'Qty'}
              </label>
              <div className="flex gap-1">
                <input
                  type="number" value={simQty}
                  onChange={(e) => setSimQty(e.target.value)}
                  className="w-full h-10 px-2 text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button type="button" onClick={() => backspace(simQty, setSimQty)}
                  title="Delete last digit"
                  className="h-10 w-9 shrink-0 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition active:scale-95">
                  <Delete className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Live Result */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                {isKhmer ? 'ចំណេញ / ១គ្រឿង:' : 'Profit / Unit:'}
              </span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                +${simResult.profitPerUnit.toFixed(2)} ({simResult.margin}%)
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {isKhmer ? 'ដើមទុនសរុប:' : 'Total Cost:'}
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold text-sm">
                ${simResult.totalCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
              <span className="text-base text-emerald-800 dark:text-emerald-200 font-extrabold">
                {isKhmer ? 'ចំណេញសរុប:' : 'Total Profit:'}
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xl font-black">
                +${simResult.totalProfit.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Save to History Button */}
          <button
            type="button"
            onClick={saveToHistory}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition active:scale-95"
          >
            <Bookmark className="w-4 h-4" />
            {isKhmer ? 'រក្សាទុករបាយការណ៍នេះ' : 'Save to History'}
          </button>

          {/* History Log */}
          {simHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <History className="w-3.5 h-3.5" />
                  <span>{isKhmer ? 'ប្រវត្តិគណនា' : 'Calculation History'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSimHistory([])}
                  className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700 transition font-semibold"
                >
                  <Trash2 className="w-3 h-3" />
                  {isKhmer ? 'លុបទាំងអស់' : 'Clear all'}
                </button>
              </div>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                {simHistory.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-100 dark:border-slate-800 text-xs group hover:border-emerald-300 dark:hover:border-emerald-700 transition">
                    <div className="space-y-0.5">
                      <div className="font-mono text-slate-600 dark:text-slate-300">
                        Cost <strong>${h.cost}</strong> · Sell <strong>${h.price}</strong> · Qty <strong>{h.qty}</strong>
                      </div>
                      <div className="text-slate-400 text-[10px]">{h.timestamp}</div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +${h.profit.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">{h.margin}% margin</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ General Purpose Calculator ═════════════════════════════════════ */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            {isKhmer ? 'ម៉ាស៊ីនគណនាទូទៅ' : 'General Calculator'}
          </h2>
        </div>

        <div className="max-w-xs mx-auto space-y-3">
          {/* Display */}
          <div className="rounded-2xl bg-slate-900 dark:bg-black p-4 text-right space-y-1 min-h-[80px] flex flex-col justify-end">
            <div className="text-slate-400 text-xs font-mono truncate min-h-[16px]">{calcExpr || '\u00a0'}</div>
            <div className="text-white text-3xl font-black font-mono tracking-tight truncate">
              {calcDisplay}
            </div>
          </div>

          {/* Buttons */}
          {(() => {
            const btn = (
              label: string,
              variant: 'gray' | 'dark' | 'orange' | 'blue' | 'red' = 'gray'
            ) => {
              const colors: Record<string, string> = {
                gray:   'bg-slate-100 hover:bg-slate-200 dark:bg-surface-700 dark:hover:bg-surface-600 text-slate-800 dark:text-white',
                dark:   'bg-slate-700 hover:bg-slate-600 dark:bg-surface-600 dark:hover:bg-surface-500 text-white',
                orange: 'bg-amber-400 hover:bg-amber-500 text-white shadow-sm shadow-amber-400/30',
                blue:   'bg-primary-500 hover:bg-primary-600 text-white shadow-sm shadow-primary-500/30',
                red:    'bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-800/50 text-rose-600 dark:text-rose-400',
              };
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleCalc(label)}
                  className={`h-14 rounded-2xl text-lg font-bold transition-all duration-100 active:scale-95 select-none ${colors[variant]}`}
                >
                  {label}
                </button>
              );
            };

            return (
              <div className="grid grid-cols-4 gap-2">
                {btn('AC', 'dark')}
                {btn('±', 'dark')}
                {btn('%', 'dark')}
                {btn('⌫', 'red')}

                {btn('7')}  {btn('8')}  {btn('9')}
                {btn('÷', 'orange')}

                {btn('4')}  {btn('5')}  {btn('6')}
                {btn('×', 'orange')}

                {btn('1')}  {btn('2')}  {btn('3')}
                {btn('-', 'orange')}

                {/* 0 spans 2 columns */}
                <button
                  type="button"
                  onClick={() => handleCalc('0')}
                  className="col-span-2 h-14 rounded-2xl text-lg font-bold bg-slate-100 hover:bg-slate-200 dark:bg-surface-700 dark:hover:bg-surface-600 text-slate-800 dark:text-white transition-all active:scale-95 select-none text-left pl-6"
                >
                  0
                </button>
                {btn('.', 'gray')}
                {btn('+', 'orange')}

                <button
                  type="button"
                  onClick={() => handleCalc('=')}
                  className="col-span-4 h-14 rounded-2xl text-lg font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/30 transition-all active:scale-95 select-none"
                >
                  =
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom Section: Full Product Valuation & Profit Table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              {isKhmer ? 'តារាងគណនេយ្យទំនិញលម្អិត (Product Profit & Valuation Matrix)' : 'Product Profit & Valuation Matrix'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isKhmer ? 'បង្ហាញតម្លៃយកមក តម្លៃលក់ចេញ និងប្រាក់ចំណេញក្នុងទំនិញនីមួយៗ' : 'Full financial overview per individual catalog item'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input with generous padding */}
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isKhmer ? 'ស្វែងរកតាមឈ្មោះ ឬ Brand...' : 'Search product or brand...'}
                className="w-full h-10 pl-10 pr-8 text-xs sm:text-sm rounded-xl bg-slate-50/90 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-2xs transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-surface-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center text-xs transition"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter — Luxury CustomDropdown */}
            {(() => {
              const catOptions = [
                { value: 'ALL', label: isKhmer ? 'គ្រប់ប្រភេទទាំងអស់' : 'All Categories', icon: <span>📁</span> },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ];
              return (
                <CustomDropdown
                  size="md"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={catOptions}
                  className="min-w-[200px]"
                />
              );
            })()}

            {/* Sort Filter — Luxury CustomDropdown */}
            <CustomDropdown
              size="md"
              value={sortBy}
              onChange={(v) => setSortBy(v as any)}
              options={sortOptions}
              className="min-w-[220px]"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-surface-850 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">{isKhmer ? 'ទំនិញ' : 'Product'}</th>
                <th className="py-3.5 px-3 text-center">{isKhmer ? 'ស្តុក' : 'Stock'}</th>
                <th className="py-3.5 px-3 text-right">{isKhmer ? 'ថ្លៃដើមយកមក (Cost)' : 'Cost Price'}</th>
                <th className="py-3.5 px-3 text-right">{isKhmer ? 'តម្លៃលក់ចេញ (Price)' : 'Selling Price'}</th>
                <th className="py-3.5 px-3 text-right">{isKhmer ? 'ចំណេញ / ១គ្រឿង' : 'Profit / Unit'}</th>
                <th className="py-3.5 px-3 text-right">{isKhmer ? 'ដើមទុនសរុប (Total Cost)' : 'Total Cost'}</th>
                <th className="py-3.5 px-4 text-right">{isKhmer ? 'ប្រាក់ចំណេញសរុប' : 'Total Est. Profit'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {processedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {isKhmer ? 'មិនមានទិន្នន័យទំនិញត្រូវនឹងការស្វែងរកទេ' : 'No products found'}
                  </td>
                </tr>
              ) : (
                processedProducts.map((p) => {
                  const cost = Number(p.costPrice) || 0;
                  const price = Number(p.price) || 0;
                  const stock = Number(p.stock) || 0;
                  const profitUnit = Math.max(0, price - cost);
                  const margin = price > 0 ? Math.round((profitUnit / price) * 100) : 0;
                  const totalCost = stock * cost;
                  const totalProfit = stock * profitUnit;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/90 dark:hover:bg-surface-850/60 transition-colors group">
                      {/* Product Name & Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/products/${p.slug || p.id}`}
                            target="_blank"
                            className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-surface-800 shrink-0 border border-slate-200/80 dark:border-slate-700 block group-hover:shadow-sm transition"
                            title={isKhmer ? 'មើលលើហាងផ្ទាល់' : 'View on Store'}
                          >
                            {p.thumbnail ? (
                              <Image src={p.thumbnail} alt={p.name} fill className="object-cover group-hover:scale-105 transition duration-200" sizes="40px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 max-w-[220px] sm:max-w-sm">
                            <Link
                              href={`/products/${p.slug || p.id}`}
                              target="_blank"
                              className="font-bold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block transition"
                            >
                              {p.name}
                            </Link>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              {p.brand && <span className="uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">{p.brand}</span>}
                              {p.category && <span>• {p.category.name}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-lg text-xs font-mono font-bold border ${stock <= 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60'
                            : stock <= 5
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-surface-800 dark:text-slate-200 dark:border-slate-700'
                          }`}>
                          {stock}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3 text-right">
                        {cost > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                            {formatPrice(cost, language)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 font-medium italic">
                            {isKhmer ? 'មិនទាន់កំណត់' : 'No cost'}
                          </span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60">
                          {formatPrice(price, language)}
                        </span>
                      </td>

                      {/* Profit / Unit & Margin */}
                      <td className="py-3 px-3 text-right">
                        {cost > 0 ? (
                          <div className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300/80 dark:border-emerald-700/80 px-2 py-1 rounded-lg text-xs shadow-2xs">
                            <span>+{formatPrice(profitUnit, language)}</span>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-black">
                              {margin}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Total Cost */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300 font-bold text-xs">
                        {formatPrice(totalCost, language)}
                      </td>

                      {/* Total Est Profit */}
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +{formatPrice(totalProfit, language)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Totals */}
            {processedProducts.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-surface-850 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  <td className="py-3.5 px-4 font-black">
                    {isKhmer ? `សរុប (${processedProducts.length} មុខ):` : `Total (${processedProducts.length} items):`}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-black">
                    {processedProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-400 text-xs">—</td>
                  <td className="py-3.5 px-3 text-right text-slate-400 text-xs">—</td>
                  <td className="py-3.5 px-3 text-right text-slate-400 text-xs">—</td>
                  <td className="py-3.5 px-3 text-right font-mono font-black text-slate-800 dark:text-slate-200">
                    {formatPrice(
                      processedProducts.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.costPrice) || 0), 0),
                      language
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                    +{formatPrice(
                      processedProducts.reduce((sum, p) => {
                        const cost = Number(p.costPrice) || 0;
                        const price = Number(p.price) || 0;
                        const stock = Number(p.stock) || 0;
                        return sum + stock * Math.max(0, price - cost);
                      }, 0),
                      language
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
