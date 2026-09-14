'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { adminApi, orderApi, productApi, categoryApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import {
  TrendingUp,
  TrendingDown,
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
  PieChart,
  BarChart3,
  Percent,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  History,
  Trash2,
  Delete as DeleteIcon,
  X,
  FileSpreadsheet,
  Calendar,
  Eye,
} from 'lucide-react';
import type { Product, Category, Order } from '@/types';
import toast from 'react-hot-toast';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';
import { ExcelExportModal } from '@/components/admin/ExcelExportModal';
import {
  getStockAdjustments,
  saveStockAdjustment,
  removeStockAdjustment,
  calculateStockLossSummary,
  StockAdjustmentItem,
} from '@/lib/stockLossStorage';
import { useConfirm } from '@/components/ui/ConfirmModal';

export default function FinancialAccountingPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const { confirm } = useConfirm();
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);


  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_products');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_categories');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
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
        const cached = sessionStorage.getItem('admin_cached_products');
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
    }
    return true;
  });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'profit_desc' | 'margin_desc' | 'stock_desc' | 'cost_desc' | 'name_asc'>('profit_desc');

  // Stock Loss & Damaged Goods Tracking (Pure Loss Deductions)
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentItem[]>([]);
  const [logLossModalOpen, setLogLossModalOpen] = useState(false);
  const [viewLossModalOpen, setViewLossModalOpen] = useState(false);
  const [selectedLossDetail, setSelectedLossDetail] = useState<StockAdjustmentItem | null>(null);
  const [lossFilterReason, setLossFilterReason] = useState<string>('ALL');
  const [lossSearch, setLossSearch] = useState<string>('');

  // Log Loss Modal form state
  const [lossProductId, setLossProductId] = useState<string>('');
  const [lossQty, setLossQty] = useState<number>(1);
  const [lossReason, setLossReason] = useState<string>('damaged');
  const [lossNotes, setLossNotes] = useState<string>('');
  const [lossDateTime, setLossDateTime] = useState<string>('');
  const [isSubmittingLoss, setIsSubmittingLoss] = useState(false);

  useEffect(() => {
    const loadAdjustments = () => {
      setStockAdjustments(getStockAdjustments());
    };
    loadAdjustments();
    window.addEventListener('stock_adjustments_updated', loadAdjustments);
    return () => window.removeEventListener('stock_adjustments_updated', loadAdjustments);
  }, []);

  const pureLossItems = useMemo(() => {
    return stockAdjustments.filter((item) => item.diff < 0);
  }, [stockAdjustments]);

  const lossSummary = useMemo(() => {
    return calculateStockLossSummary(pureLossItems);
  }, [pureLossItems]);

  const lossProductOptions: DropdownOption[] = useMemo(() => {
    return products.map((p) => ({
      value: p.id,
      label: `${p.name} (ស្តុក: ${p.stock} | ថ្លៃដើម: $${(p.costPrice || 0).toFixed(2)})`,
    }));
  }, [products]);

  const selectedLossProduct = useMemo(() => {
    return products.find((p) => p.id === lossProductId);
  }, [products, lossProductId]);

  const filteredLossItems = useMemo(() => {
    return pureLossItems.filter((item) => {
      const matchReason =
        lossFilterReason === 'ALL'
          ? true
          : lossFilterReason === 'DAMAGED'
          ? item.reason === 'damaged' || item.type === 'DAMAGED'
          : lossFilterReason === 'AUDIT'
          ? item.reason === 'audit' || item.type === 'AUDIT_COUNT'
          : lossFilterReason === 'EXCHANGE'
          ? item.reason === 'exchange' || item.type === 'CUSTOMER_EXCHANGE'
          : true;

      const q = lossSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        (item.referenceNo && item.referenceNo.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      return matchReason && matchSearch;
    });
  }, [pureLossItems, lossFilterReason, lossSearch]);

  const handleLogLossSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLossProduct) {
      toast.error(isKhmer ? 'សូមជ្រើសរើសទំនិញ' : 'Please select a product');
      return;
    }
    if (lossQty <= 0) {
      toast.error(isKhmer ? 'ចំនួនខូចខាតត្រូវតែធំជាង ០' : 'Quantity must be greater than 0');
      return;
    }
    if (lossQty > selectedLossProduct.stock) {
      toast.error(
        isKhmer
          ? `ស្តុកបច្ចុប្បន្នមានត្រឹមតែ ${selectedLossProduct.stock} គ្រឿងប៉ុណ្ណោះ`
          : `Current stock is only ${selectedLossProduct.stock}`
      );
      return;
    }

    setIsSubmittingLoss(true);
    try {
      const finalStock = Math.max(0, selectedLossProduct.stock - lossQty);
      const unitCost = selectedLossProduct.costPrice || 0;
      const unitPrice = selectedLossProduct.price || 0;
      const capitalLoss = lossQty * unitCost;
      const revenueLoss = lossQty * unitPrice;

      await productApi.update(selectedLossProduct.id, { stock: finalStock });

      const resolvedCreatedAt = lossDateTime ? new Date(lossDateTime).toISOString() : new Date().toISOString();
      const newAdjustment: StockAdjustmentItem = {
        id: 'loss_' + Date.now(),
        productId: selectedLossProduct.id,
        productName: selectedLossProduct.name,
        diff: -lossQty,
        finalStock,
        reason: lossReason,
        costPrice: unitCost,
        sellingPrice: unitPrice,
        capitalLoss,
        revenueLoss,
        notes: lossNotes.trim() || undefined,
        createdAt: resolvedCreatedAt,
      };
      saveStockAdjustment(newAdjustment);

      setProducts((prev) =>
        prev.map((p) => (p.id === selectedLossProduct.id ? { ...p, stock: finalStock } : p))
      );

      toast.success(
        isKhmer
          ? `បានកត់ត្រាការខូចខាត "${selectedLossProduct.name}" ចំនួន ${lossQty} គ្រឿង (ខាតបង់ -${formatPrice(
              capitalLoss,
              language
            )}) ✅`
          : `Recorded loss for "${selectedLossProduct.name}" (${lossQty} pcs) ✅`
      );

      setLogLossModalOpen(false);
      setLossProductId('');
      setLossQty(1);
      setLossNotes('');
      setLossDateTime('');
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការកត់ត្រាការខូចខាត' : 'Failed to record stock loss');
    } finally {
      setIsSubmittingLoss(false);
    }
  };

  const handleDeleteLoss = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: isKhmer ? 'បញ្ជាក់ការលុបកំណត់ត្រា' : 'Delete Loss Record',
      message: isKhmer
        ? `តើអ្នកពិតជាចង់លុបកំណត់ត្រា «${name}» នេះចេញពីបញ្ជីមែនទេ?`
        : `Are you sure you want to delete this loss record for "${name}"?`,
      confirmText: isKhmer ? 'លុបចេញ' : 'Delete',
      cancelText: isKhmer ? 'បោះបង់' : 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    removeStockAdjustment(id);
    toast.success(isKhmer ? 'បានលុបកំណត់ត្រាជោគជ័យ' : 'Record deleted');
  };

  // Interactive Profit Simulator state
  const [simCost, setSimCost] = useState<string>('20.00');
  const [simPrice, setSimPrice] = useState<string>('45.00');
  const [simQty, setSimQty] = useState<string>('50');

  // General Purpose Digital Calculator state
  interface CalcHistoryItem {
    id: string;
    expression: string;
    result: string;
    timestamp: number;
  }

  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const [calcPrev, setCalcPrev] = useState<string>('');
  const [calcOp, setCalcOp] = useState<string>('');
  const [calcExpression, setCalcExpression] = useState<string>('');
  const [calcWaitingForOperand, setCalcWaitingForOperand] = useState<boolean>(false);
  const [calcJustEvaled, setCalcJustEvaled] = useState<boolean>(false);
  const [calcHistory, setCalcHistory] = useState<CalcHistoryItem[]>([]);
  const [calcRightTab, setCalcRightTab] = useState<'formulas' | 'history'>('formulas');

  // Load calculator history from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sh_admin_calc_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCalcHistory(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to parse calc history:', e);
      }
    }
  }, []);

  // Digit input (0-9)
  const handleCalcDigit = (digit: string) => {
    if (calcWaitingForOperand || calcJustEvaled) {
      setCalcDisplay(digit);
      setCalcWaitingForOperand(false);
      setCalcJustEvaled(false);
    } else {
      setCalcDisplay((prev) => (prev === '0' ? digit : prev + digit));
    }
  };

  // Decimal point (.)
  const handleCalcDot = () => {
    if (calcWaitingForOperand || calcJustEvaled) {
      setCalcDisplay('0.');
      setCalcWaitingForOperand(false);
      setCalcJustEvaled(false);
    } else if (!calcDisplay.includes('.')) {
      setCalcDisplay((prev) => prev + '.');
    }
  };

  // Operator input (+, -, *, /) with support for chaining
  const handleCalcOperator = (nextOp: string) => {
    const opSymbol = nextOp === '*' ? '×' : nextOp === '/' ? '÷' : nextOp;

    if (calcWaitingForOperand) {
      setCalcOp(nextOp);
      setCalcExpression(`${calcPrev} ${opSymbol} `);
      return;
    }

    if (calcOp && calcPrev) {
      const a = parseFloat(calcPrev);
      const b = parseFloat(calcDisplay);
      if (!isNaN(a) && !isNaN(b)) {
        let res = 0;
        if (calcOp === '+') res = a + b;
        else if (calcOp === '-') res = a - b;
        else if (calcOp === '*') res = a * b;
        else if (calcOp === '/') res = b !== 0 ? a / b : 0;
        const rounded = Math.round(res * 1e10) / 1e10;
        const resStr = String(rounded);
        setCalcPrev(resStr);
        setCalcDisplay(resStr);
        setCalcExpression(`${resStr} ${opSymbol} `);
        setCalcOp(nextOp);
        setCalcWaitingForOperand(true);
        setCalcJustEvaled(false);
        return;
      }
    }

    setCalcPrev(calcDisplay);
    setCalcOp(nextOp);
    setCalcExpression(`${calcDisplay} ${opSymbol} `);
    setCalcWaitingForOperand(true);
    setCalcJustEvaled(false);
  };

  // Toggle sign (+/-)
  const handleCalcToggleSign = () => {
    if (calcDisplay === '0') return;
    setCalcDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : '-' + prev));
  };

  // Percentage (%)
  const handleCalcPercent = () => {
    const val = parseFloat(calcDisplay);
    if (isNaN(val)) return;
    setCalcDisplay(String(val / 100));
  };

  // All Clear (AC)
  const handleCalcClearAll = () => {
    setCalcDisplay('0');
    setCalcPrev('');
    setCalcOp('');
    setCalcExpression('');
    setCalcWaitingForOperand(false);
    setCalcJustEvaled(false);
  };

  // Backspace: deletes only the last digit typed
  const handleCalcBackspace = () => {
    if (calcWaitingForOperand) return;
    if (calcJustEvaled) {
      setCalcDisplay('0');
      setCalcJustEvaled(false);
      return;
    }
    setCalcDisplay((prev) => {
      if (prev.length <= 1) return '0';
      if (prev.length === 2 && prev.startsWith('-')) return '0';
      return prev.slice(0, -1);
    });
  };

  // Evaluate & save to localStorage history
  const handleCalcEval = () => {
    const a = parseFloat(calcPrev);
    const b = parseFloat(calcDisplay);
    if (!calcOp || isNaN(a) || isNaN(b)) return;
    let res = 0;
    if (calcOp === '+') res = a + b;
    else if (calcOp === '-') res = a - b;
    else if (calcOp === '*') res = a * b;
    else if (calcOp === '/') res = b !== 0 ? a / b : 0;
    const rounded = Math.round(res * 1e10) / 1e10;
    const opSymbol = calcOp === '*' ? '×' : calcOp === '/' ? '÷' : calcOp;
    const expr = `${calcPrev} ${opSymbol} ${b} =`;
    const resStr = String(rounded);

    setCalcExpression(expr);
    setCalcDisplay(resStr);
    setCalcPrev('');
    setCalcOp('');
    setCalcWaitingForOperand(false);
    setCalcJustEvaled(true);

    const newItem: CalcHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      expression: expr,
      result: resStr,
      timestamp: Date.now(),
    };

    setCalcHistory((prev) => {
      const updated = [newItem, ...prev.filter((i) => i.expression !== expr || i.result !== resStr)].slice(0, 30);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sh_admin_calc_history', JSON.stringify(updated));
        }
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearCalcHistory = async () => {
    const confirmed = await confirm({
      title: isKhmer ? 'បញ្ជាក់ការសម្អាតប្រវត្តិគណនា' : 'Clear Calculator History',
      message: isKhmer
        ? 'តើអ្នកពិតជាចង់សម្អាតប្រវត្តិគណនាទាំងអស់ចេញពីឧបករណ៍មែនទេ?'
        : 'Are you sure you want to clear all calculation history from this device?',
      confirmText: isKhmer ? 'សម្អាតទាំងអស់' : 'Clear All',
      cancelText: isKhmer ? 'បោះបង់' : 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    setCalcHistory([]);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sh_admin_calc_history');
      }
    } catch {
      // ignore
    }
    toast.success(isKhmer ? 'បានសម្អាតប្រវត្តិគណនាជោគជ័យ' : 'Calculation history cleared');
  };

  const handleDeleteCalcHistoryItem = (id: string) => {
    setCalcHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('sh_admin_calc_history', JSON.stringify(updated));
        }
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleUseCalcHistoryResult = (val: string) => {
    setCalcDisplay(val);
    setCalcJustEvaled(true);
    toast.success(isKhmer ? `បានយកលេខ ${val} មកប្រើ` : `Loaded ${val}`);
  };

  const formatCalcTime = (ts: number) => {
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return isKhmer ? 'មុននេះបន្តិច' : 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return isKhmer ? `${diffMin} នាទីមុន` : `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return isKhmer ? `${diffHours} ម៉ោងមុន` : `${diffHours}h ago`;
    const d = new Date(ts);
    return `${d.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric' })}`;
  };

  const loadData = async (silent = false) => {
    if (!silent && products.length === 0) setLoading(true);
    try {
      const [prodRes, catRes, orderRes] = await Promise.allSettled([
        adminApi.getProducts({ limit: 500 }),
        adminApi.getCategories(),
        adminApi.getOrders({ limit: 200 }),
      ]);

      let anySuccess = false;
      let fetchedProds: Product[] = [];
      let fetchedCats: Category[] = [];
      let fetchedOrders: Order[] = [];

      if (prodRes.status === 'fulfilled' && prodRes.value.data?.data) {
        fetchedProds = prodRes.value.data.data || [];
        setProducts(fetchedProds);
        anySuccess = true;
        try {
          sessionStorage.setItem('admin_cached_products', JSON.stringify(fetchedProds));
        } catch {}
      } else {
        try {
          const { data } = await productApi.getAll({ limit: 500 });
          if (data?.data && data.data.length > 0) {
            fetchedProds = data.data;
            setProducts(fetchedProds);
            anySuccess = true;
            try {
              sessionStorage.setItem('admin_cached_products', JSON.stringify(fetchedProds));
            } catch {}
          }
        } catch {}
      }

      if (catRes.status === 'fulfilled' && catRes.value.data?.data) {
        fetchedCats = catRes.value.data.data || [];
        setCategories(fetchedCats);
        anySuccess = true;
        try {
          sessionStorage.setItem('admin_cached_categories', JSON.stringify(fetchedCats));
        } catch {}
      } else {
        try {
          const { data } = await categoryApi.getAll();
          if (data?.data && data.data.length > 0) {
            fetchedCats = data.data;
            setCategories(fetchedCats);
            anySuccess = true;
            try {
              sessionStorage.setItem('admin_cached_categories', JSON.stringify(fetchedCats));
            } catch {}
          }
        } catch {}
      }

      if (orderRes.status === 'fulfilled' && orderRes.value.data?.data) {
        fetchedOrders = orderRes.value.data.data || [];
        setOrders(fetchedOrders);
        anySuccess = true;
        try {
          sessionStorage.setItem('admin_cached_orders', JSON.stringify(fetchedOrders));
        } catch {}
      } else {
        try {
          const { data } = await orderApi.getAll({ limit: 200 });
          if (data?.data && data.data.length > 0) {
            fetchedOrders = data.data;
            setOrders(fetchedOrders);
            anySuccess = true;
            try {
              sessionStorage.setItem('admin_cached_orders', JSON.stringify(fetchedOrders));
            } catch {}
          }
        } catch {}
      }

      if (!anySuccess && !silent && products.length === 0) {
        toast.error(isKhmer ? 'មិនអាចទាញយកទិន្នន័យគណនេយ្យបានទេ' : 'Failed to load financial data');
      }
    } catch (err) {
      console.error('Failed to load accounting data:', err);
      if (!silent && products.length === 0) {
        toast.error(isKhmer ? 'មិនអាចទាញយកទិន្នន័យគណនេយ្យបានទេ' : 'Failed to load financial data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(products.length > 0);
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

  // Profit & Loss Simulator calculations
  const simResult = useMemo(() => {
    const cost = Math.max(0, Number(simCost) || 0);
    const price = Math.max(0, Number(simPrice) || 0);
    const qty = Math.max(1, Number(simQty) || 1);

    const netPerUnit = price - cost;
    const isLoss = netPerUnit < 0;
    const isProfit = netPerUnit > 0;
    const isBreakeven = netPerUnit === 0;

    const totalCost = cost * qty;
    const totalRevenue = price * qty;
    const totalProfit = netPerUnit * qty;

    // Margin: (Profit / Price) * 100
    const margin = price > 0 ? Math.round((netPerUnit / price) * 100) : (cost > 0 ? -100 : 0);
    // Markup: (Profit / Cost) * 100
    const markup = cost > 0 ? Math.round((netPerUnit / cost) * 100) : 0;

    return {
      profitPerUnit: netPerUnit,
      absProfitPerUnit: Math.abs(netPerUnit),
      totalCost,
      totalRevenue,
      totalProfit,
      absTotalProfit: Math.abs(totalProfit),
      margin,
      markup,
      isLoss,
      isProfit,
      isBreakeven,
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


  // Luxury Category Dropdown Options
  const categoryDropdownOptions: DropdownOption[] = useMemo(() => [
    {
      value: 'ALL',
      label: isKhmer ? 'គ្រប់ប្រភេទទាំងអស់' : 'All Categories',
      icon: <span className="text-sm">📁</span>,
      description: isKhmer ? 'បង្ហាញគ្រប់មុខទំនិញទាំងអស់' : 'Show all product categories',
    },
    ...categories.map((c) => ({
      value: c.id,
      label: c.parent ? `${c.parent.name} › ${c.name}` : c.name,
      icon: <span className="text-sm">🏷️</span>,
      description: c.parent ? c.parent.name : undefined,
    })),
  ], [categories, isKhmer]);

  // Luxury Sort Dropdown Options
  const sortDropdownOptions: DropdownOption[] = useMemo(() => [
    {
      value: 'profit_desc',
      label: isKhmer ? 'ចំណេញសរុបខ្ពស់បំផុត' : 'Highest Total Profit',
      icon: <span className="text-sm">💰</span>,
      description: isKhmer ? 'រៀបតាមប្រាក់ចំណេញដុល' : 'Highest gross profit',
    },
    {
      value: 'margin_desc',
      label: isKhmer ? 'Margin % ខ្ពស់បំផុត' : 'Highest Margin %',
      icon: <span className="text-sm">📈</span>,
      description: isKhmer ? 'រៀបតាមភាគរយចំណេញ' : 'Highest profit margins',
    },
    {
      value: 'stock_desc',
      label: isKhmer ? 'ចំនួនស្តុកច្រើនបំផុត' : 'Highest Stock',
      icon: <span className="text-sm">📦</span>,
      description: isKhmer ? 'រៀបតាមចំនួនទំនិញក្នុងស្តុក' : 'Largest inventory count',
    },
    {
      value: 'cost_desc',
      label: isKhmer ? 'ដើមទុនខ្ពស់បំផុត' : 'Highest Inventory Cost',
      icon: <span className="text-sm">🏷️</span>,
      description: isKhmer ? 'រៀបតាមថ្លៃដើមទុនសរុប' : 'Greatest inventory capital',
    },
    {
      value: 'name_asc',
      label: isKhmer ? 'តាមឈ្មោះ A-Z' : 'Name A-Z',
      icon: <span className="text-sm">🔤</span>,
      description: isKhmer ? 'រៀបតាមលំដាប់អក្សរ' : 'Alphabetical title order',
    },
  ], [isKhmer]);

  return (
    <div
      className="space-y-4 pb-12 w-full max-w-full min-w-0 overflow-x-hidden"
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
            onClick={() => setExcelModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs shadow-emerald-500/20 transition active:scale-95"
            title={isKhmer ? 'ទាញយករបាយការណ៍ Excel ស្តង់ដារ' : 'Export Excel Report'}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>{isKhmer ? 'ទាញយក Excel' : 'Export Excel'}</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
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

      {/* 6 Main Financial KPI Cards (Including Stock Loss & Damage and Net Profit) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-3.5 w-full min-w-0">
        {/* 1. Total Cost */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title={isKhmer ? 'ដើមទុនក្នុងស្តុកសរុប (យកមក)' : 'Total Inventory Capital'}>
                {isKhmer ? 'ដើមទុនក្នុងស្តុកសរុប (យកមក)' : 'Total Inventory Capital'}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-black text-slate-900 dark:text-white tabular-nums truncate" title={formatPrice(financials.totalInventoryCost, language)}>
              {formatPrice(financials.totalInventoryCost, language)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{financials.totalStockUnits.toLocaleString()} {isKhmer ? 'គ្រឿងសរុប' : 'units in stock'}</span>
          </div>
        </div>

        {/* 2. Retail Value */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title={isKhmer ? 'ចំណូលលក់ចេញប៉ាន់ស្មាន' : 'Estimated Retail Value'}>
                {isKhmer ? 'ចំណូលលក់ចេញប៉ាន់ស្មាន' : 'Estimated Retail Value'}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-black text-slate-900 dark:text-white tabular-nums truncate" title={formatPrice(financials.totalRetailValue, language)}>
              {formatPrice(financials.totalRetailValue, language)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className="truncate">{products.length} {isKhmer ? 'មុខទំនិញសរុប' : 'active products'}</span>
          </div>
        </div>

        {/* 3. Est Gross Profit */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:to-surface-900 border border-emerald-500/30 shadow-xs relative overflow-hidden min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider truncate" title={isKhmer ? 'ប្រាក់ចំណេញដុលប៉ាន់ស្មាន' : 'Est. Gross Profit'}>
                {isKhmer ? 'ប្រាក់ចំណេញដុលប៉ាន់ស្មាន' : 'Est. Gross Profit'}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shrink-0">
                +
              </div>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums truncate" title={`+${formatPrice(financials.totalEstGrossProfit, language)}`}>
              +{formatPrice(financials.totalEstGrossProfit, language)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs truncate">
            <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0 text-[11px]">
              Margin: {financials.overallMargin}%
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{isKhmer ? 'លើស្តុកទាំងអស់' : 'overall'}</span>
          </div>
        </div>

        {/* 4. Realized Paid Profit */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate" title={isKhmer ? 'ចំណេញជាក់ស្តែងពីការលក់' : 'Realized Gross Profit'}>
                {isKhmer ? 'ចំណេញជាក់ស្តែងពីការលក់' : 'Realized Gross Profit'}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums truncate" title={`+${formatPrice(financials.realizedProfit, language)}`}>
              +{formatPrice(financials.realizedProfit, language)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className="truncate">{isKhmer ? 'ចំណូលលក់:' : 'Rev:'} <strong>{formatPrice(financials.realizedRevenue, language)}</strong></span>
          </div>
        </div>

        {/* 5. Stock Loss & Damage */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 via-red-500/5 to-white dark:to-surface-900 border border-rose-500/30 dark:border-rose-900/50 shadow-xs relative overflow-hidden min-w-0 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider truncate" title={isKhmer ? 'ការខាតបង់ ឬខូចខាតស្តុក' : 'Stock Loss & Damage'}>
                {isKhmer ? 'ការខាតបង់ ឬខូចខាតស្តុក' : 'Stock Loss & Damage'}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums truncate" title={lossSummary.totalCapitalLoss > 0 ? `-${formatPrice(lossSummary.totalCapitalLoss, language)}` : '$0.00'}>
              {lossSummary.totalCapitalLoss > 0 ? `-${formatPrice(lossSummary.totalCapitalLoss, language)}` : '$0.00'}
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-2 text-xs min-w-0">
            <span className="px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10.5px] truncate">
              {lossSummary.totalLossUnits} {isKhmer ? 'គ្រឿងខូចខាត' : 'lost pcs'}
            </span>
            <a
              href="#stock-loss-audit-section"
              className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 shrink-0"
            >
              {isKhmer ? 'មើលតារាង' : 'Table'} ›
            </a>
          </div>
        </div>

        {/* 6. Net Profit (Actual Profit - Losses) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-white dark:to-surface-900 border border-violet-500/30 shadow-xs relative overflow-hidden min-w-0 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
              <span className="text-[11px] sm:text-xs font-black text-violet-800 dark:text-violet-300 uppercase tracking-wider truncate" title={isKhmer ? 'ចំណេញសុទ្ធចុងក្រោយ' : 'Final Net Profit'}>
                {isKhmer ? 'ចំណេញសុទ្ធចុងក្រោយ' : 'Final Net Profit'}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black shrink-0">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl xl:text-2xl font-black text-violet-600 dark:text-violet-400 tabular-nums truncate" title={`${financials.realizedProfit - lossSummary.totalCapitalLoss > 0 ? '+' : ''}${formatPrice(financials.realizedProfit - lossSummary.totalCapitalLoss, language)}`}>
              {financials.realizedProfit - lossSummary.totalCapitalLoss > 0 ? '+' : ''}{formatPrice(financials.realizedProfit - lossSummary.totalCapitalLoss, language)}
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-2 text-[10px] sm:text-[11px] min-w-0 text-slate-500 dark:text-slate-400">
             <span className="truncate" title={`ចំណេញ: +${formatPrice(financials.realizedProfit, language)} | ខាតបង់: -${formatPrice(lossSummary.totalCapitalLoss, language)}`}>
               {isKhmer ? 'ចំណេញដុល' : 'Gross'}: <strong className="text-indigo-600 dark:text-indigo-400">+{formatPrice(financials.realizedProfit, language)}</strong> <br/>
               {isKhmer ? 'កាត់ខាតបង់' : 'Loss'}: <strong className="text-rose-600 dark:text-rose-400">-{formatPrice(lossSummary.totalCapitalLoss, language)}</strong>
             </span>
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

        {/* Profit & Loss Simulator */}
        <div className="h-fit bg-white dark:bg-surface-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  simResult.isLoss
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {simResult.isLoss ? <TrendingDown className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
              </div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                {isKhmer
                  ? simResult.isLoss
                    ? 'ម៉ាស៊ីនគណនាផលខាត'
                    : 'ម៉ាស៊ីនគណនាចំណេញ'
                  : simResult.isLoss
                  ? 'Loss Simulator'
                  : 'Profit Simulator'}
              </h2>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                simResult.isLoss
                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40'
                  : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40'
              }`}
            >
              {simResult.isLoss ? (isKhmer ? 'ខាតបង់' : 'Loss') : 'Live'}
            </span>
          </div>

          {/* 3 Inputs */}
          <div className="grid grid-cols-3 gap-3">
            {/* Cost */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {isKhmer ? 'ដើមទុន ($)' : 'Cost ($)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={simCost}
                onChange={(e) => setSimCost(e.target.value)}
                className={`w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 ${
                  simResult.isLoss
                    ? 'border-rose-300 dark:border-rose-700/80 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'
                }`}
              />
            </div>

            {/* Sell Price */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {isKhmer ? 'លក់ ($)' : 'Sell ($)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={simPrice}
                onChange={(e) => setSimPrice(e.target.value)}
                className={`w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 ${
                  simResult.isLoss
                    ? 'border-rose-300 dark:border-rose-700/80 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'
                }`}
              />
            </div>

            {/* Qty */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {isKhmer ? 'ចំនួន' : 'Qty'}
              </label>
              <input
                type="number"
                value={simQty}
                onChange={(e) => setSimQty(e.target.value)}
                className={`w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 ${
                  simResult.isLoss
                    ? 'border-rose-300 dark:border-rose-700/80 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Live Result */}
          <div
            className={`p-4 rounded-xl space-y-2 border transition-colors ${
              simResult.isLoss
                ? 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200/90 dark:border-rose-800/50'
                : simResult.isBreakeven
                ? 'bg-slate-50/80 dark:bg-surface-850 border-slate-200 dark:border-slate-700'
                : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                {simResult.isLoss
                  ? isKhmer
                    ? 'ខាត / ១ គ្រឿង:'
                    : 'Loss / Unit:'
                  : isKhmer
                  ? 'ចំណេញ / ១ គ្រឿង:'
                  : 'Profit / Unit:'}
              </span>
              <strong
                className={`font-mono font-bold text-sm ${
                  simResult.isLoss
                    ? 'text-rose-600 dark:text-rose-400'
                    : simResult.isBreakeven
                    ? 'text-slate-600 dark:text-slate-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {simResult.isLoss
                  ? `-$${simResult.absProfitPerUnit.toFixed(2)} (${simResult.margin}%)`
                  : simResult.isBreakeven
                  ? `$0.00 (0%)`
                  : `+$${simResult.profitPerUnit.toFixed(2)} (+${simResult.margin}%)`}
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
            <div
              className={`flex justify-between items-center pt-2 border-t ${
                simResult.isLoss
                  ? 'border-rose-200/70 dark:border-rose-800/40'
                  : 'border-emerald-200/60 dark:border-emerald-800/40'
              }`}
            >
              <span
                className={`text-base font-extrabold ${
                  simResult.isLoss
                    ? 'text-rose-800 dark:text-rose-200'
                    : simResult.isBreakeven
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-emerald-800 dark:text-emerald-200'
                }`}
              >
                {simResult.isLoss
                  ? isKhmer
                    ? 'ខាតសរុប:'
                    : 'Total Loss:'
                  : isKhmer
                  ? 'ចំណេញសរុប:'
                  : 'Total Profit:'}
              </span>
              <span
                className={`font-mono text-xl font-black ${
                  simResult.isLoss
                    ? 'text-rose-600 dark:text-rose-400'
                    : simResult.isBreakeven
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {simResult.isLoss
                  ? `-$${simResult.absTotalProfit.toFixed(2)}`
                  : simResult.isBreakeven
                  ? `$0.00`
                  : `+$${simResult.totalProfit.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* General Purpose Calculator Modal */}
      {isCalculatorModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden w-full max-w-4xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCalculatorModalOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-xl bg-slate-100 dark:bg-surface-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-850">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              {isKhmer ? 'ម៉ាស៊ីនគណនាទូទៅ' : 'General Purpose Calculator'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {isKhmer ? 'គណនាទូទៅសម្រាប់ថ្លៃដើម ប្រាក់ចំណេញ និងភាគរយ' : 'Quick calculations for cost, profit and business margins'}
            </p>
          </div>
          {calcExpression && (
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-xs text-right">
              {calcExpression}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Calculator Interface */}
            <div className="w-full sm:max-w-[320px] shrink-0">
              {/* Display */}
              <div className="w-full h-16 px-4 flex flex-col justify-center items-end rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 mb-3 overflow-hidden shadow-inner">
                {calcExpression && (
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-full">
                    {calcExpression}
                  </span>
                )}
                <span className="font-mono font-black text-2xl text-slate-900 dark:text-white truncate text-right">
                  {calcDisplay}
                </span>
              </div>

              {/* Calculator Buttons Grid (4 columns x 5 rows) */}
              <div className="grid grid-cols-4 gap-1.5">
                {/* Row 1: AC, Backspace ⌫, %, ÷ */}
                <button
                  type="button"
                  onClick={handleCalcClearAll}
                  title={isKhmer ? 'លុបទាំងអស់ (All Clear)' : 'All Clear'}
                  className="h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100"
                >
                  AC
                </button>
                <button
                  type="button"
                  onClick={handleCalcBackspace}
                  title={isKhmer ? 'លុបមួយខ្ទង់ក្រោយ (Backspace)' : 'Backspace'}
                  className="h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 flex items-center justify-center"
                >
                  <DeleteIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCalcPercent}
                  title={isKhmer ? 'ភាគរយ (%)' : 'Percentage'}
                  className="h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200/70"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => handleCalcOperator('/')}
                  className={`h-10 rounded-xl text-base font-black transition-all active:scale-95 border ${
                    calcWaitingForOperand && calcOp === '/'
                      ? 'bg-indigo-700 text-white ring-2 ring-indigo-400 border-indigo-400 shadow-sm'
                      : 'bg-primary-600 text-white hover:bg-primary-700 border-transparent shadow-xs'
                  }`}
                >
                  ÷
                </button>

                {/* Row 2: 7, 8, 9, × */}
                {['7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleCalcDigit(digit)}
                    className="h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border bg-white dark:bg-surface-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-700"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleCalcOperator('*')}
                  className={`h-10 rounded-xl text-base font-black transition-all active:scale-95 border ${
                    calcWaitingForOperand && calcOp === '*'
                      ? 'bg-indigo-700 text-white ring-2 ring-indigo-400 border-indigo-400 shadow-sm'
                      : 'bg-primary-600 text-white hover:bg-primary-700 border-transparent shadow-xs'
                  }`}
                >
                  ×
                </button>

                {/* Row 3: 4, 5, 6, - */}
                {['4', '5', '6'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleCalcDigit(digit)}
                    className="h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border bg-white dark:bg-surface-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-700"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleCalcOperator('-')}
                  className={`h-10 rounded-xl text-base font-black transition-all active:scale-95 border ${
                    calcWaitingForOperand && calcOp === '-'
                      ? 'bg-indigo-700 text-white ring-2 ring-indigo-400 border-indigo-400 shadow-sm'
                      : 'bg-primary-600 text-white hover:bg-primary-700 border-transparent shadow-xs'
                  }`}
                >
                  -
                </button>

                {/* Row 4: 1, 2, 3, + */}
                {['1', '2', '3'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleCalcDigit(digit)}
                    className="h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border bg-white dark:bg-surface-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-700"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleCalcOperator('+')}
                  className={`h-10 rounded-xl text-base font-black transition-all active:scale-95 border ${
                    calcWaitingForOperand && calcOp === '+'
                      ? 'bg-indigo-700 text-white ring-2 ring-indigo-400 border-indigo-400 shadow-sm'
                      : 'bg-primary-600 text-white hover:bg-primary-700 border-transparent shadow-xs'
                  }`}
                >
                  +
                </button>

                {/* Row 5: 0, ., +/-, = */}
                <button
                  type="button"
                  onClick={() => handleCalcDigit('0')}
                  className="h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border bg-white dark:bg-surface-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-700"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleCalcDot}
                  className="h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border bg-white dark:bg-surface-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-700"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={handleCalcToggleSign}
                  title={isKhmer ? 'ប្តូរសញ្ញា (+/-)' : 'Toggle sign'}
                  className="h-10 rounded-xl text-xs font-bold transition-all active:scale-95 border bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 font-semibold"
                >
                  +/-
                </button>
                <button
                  type="button"
                  onClick={handleCalcEval}
                  title={isKhmer ? 'គណនា (=)' : 'Calculate'}
                  className="h-10 rounded-xl text-base font-black transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  =
                </button>
              </div>
            </div>

            {/* Right Column: Tabbed Formulas & Calculation History */}
            <div className="flex-1 w-full space-y-3">
              {/* Tab Selector Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-surface-800 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCalcRightTab('formulas')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      calcRightTab === 'formulas'
                        ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>💡</span>
                    <span>{isKhmer ? 'រូបមន្តជំនួយ' : 'Formulas'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcRightTab('history')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      calcRightTab === 'history'
                        ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'ប្រវត្តិគណនា' : 'History'}</span>
                    {calcHistory.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-300 text-[10px] font-bold">
                        {calcHistory.length}
                      </span>
                    )}
                  </button>
                </div>

                {calcRightTab === 'history' && calcHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCalcHistory}
                    className="text-[11px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    title={isKhmer ? 'សម្អាតប្រវត្តិគណនាទាំងអស់' : 'Clear all history'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'សម្អាតប្រវត្តិ' : 'Clear History'}</span>
                  </button>
                )}
              </div>

              {/* Tab Content 1: Formulas */}
              {calcRightTab === 'formulas' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 text-xs">
                  {[
                    { label: isKhmer ? 'ចំណេញ / ១គ្រឿង' : 'Profit / Unit', formula: 'Selling Price - Cost Price', desc: isKhmer ? 'ថ្លៃលក់ - ថ្លៃដើម' : 'Price minus cost' },
                    { label: isKhmer ? 'ភាគរយចំណេញ (Margin %)' : 'Margin %', formula: '(Profit ÷ Price) × 100', desc: isKhmer ? '(ចំណេញ ÷ ថ្លៃលក់) × 100' : 'Profit ratio over price' },
                    { label: isKhmer ? 'ដើមទុនសរុប' : 'Total Capital', formula: 'Cost Price × Stock Qty', desc: isKhmer ? 'ថ្លៃដើម × ចំនួនស្តុក' : 'Capital locked in inventory' },
                    { label: isKhmer ? 'ចំណូលលក់សរុប' : 'Total Revenue', formula: 'Selling Price × Stock Qty', desc: isKhmer ? 'ថ្លៃលក់ × ចំនួនស្តុក' : 'Total revenue potential' },
                    { label: isKhmer ? 'ប្រាក់ចំណេញសរុប' : 'Total Profit', formula: '(Profit / Unit) × Stock Qty', desc: isKhmer ? 'ចំណេញក្នុង១គ្រឿង × ស្តុក' : 'Net expected gross profit' },
                    { label: isKhmer ? 'Markup % (ចំណេញលើដើម)' : 'Markup %', formula: '(Profit ÷ Cost) × 100', desc: isKhmer ? '(ចំណេញ ÷ ថ្លៃដើម) × 100' : 'Profit ratio over cost' },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-100 dark:border-slate-800 space-y-1 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{item.label}</p>
                      <p className="font-mono text-[11px] text-primary-600 dark:text-primary-400 font-semibold">{item.formula}</p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab Content 2: History (saved to LocalStorage) */}
              {calcRightTab === 'history' && (
                <div className="space-y-2">
                  {calcHistory.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-850">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-surface-800 flex items-center justify-center text-slate-400">
                        <History className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {isKhmer ? 'មិនទាន់មានប្រវត្តិគណនានៅឡើយទេ' : 'No calculation history yet'}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        {isKhmer
                          ? 'រាល់ពេលចុច «=» ការគណនានឹងត្រូវបានរក្សាទុកក្នុង LocalStorage ដោយស្វ័យប្រវត្តិ'
                          : 'Calculations will be saved automatically to localStorage when you press "="'}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                      {calcHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-100 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/20 transition group"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate">
                              {item.expression}
                            </span>
                            <span className="text-sm font-mono font-black text-slate-900 dark:text-white truncate">
                              {item.result}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline font-mono">
                              {formatCalcTime(item.timestamp)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUseCalcHistoryResult(item.result)}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 border border-slate-200 dark:border-slate-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 shadow-2xs transition active:scale-95"
                              title={isKhmer ? 'យកមកប្រើក្នុងម៉ាស៊ីនគណនា' : 'Use in calculator'}
                            >
                              {isKhmer ? 'យកមកប្រើ' : 'Use'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCalcHistoryItem(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition active:scale-95"
                              title={isKhmer ? 'លុប' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}


      {/* ========================================================================= */}
      {/* STOCK LOSS & DAMAGED INVENTORY AUDIT SECTION */}
      {/* ========================================================================= */}
      <div id="stock-loss-audit-section" className="bg-white dark:bg-surface-900 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs overflow-hidden">
        {/* Header Strip */}
        <div className="p-4 sm:p-5 border-b border-rose-100 dark:border-rose-950/60 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/40 dark:from-rose-950/20 dark:via-surface-900 dark:to-surface-900 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-800/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {isKhmer ? 'តារាងតាមដានការខាតបង់ & ខូចខាតស្តុក' : 'Stock Loss & Damage Audit'}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                  {stockAdjustments.filter((x) => x.diff < 0).length} {isKhmer ? 'ករណីខាតបង់' : 'loss records'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isKhmer
                  ? 'កត់ត្រារាល់ទំនិញដែលបានកាត់ចេញពីស្តុកដោយសារខូចខាត បាត់បង់ ឬកែតម្រូវចុងខែ'
                  : 'Track and audit stock write-offs due to transit damage, shrinkage, or audit corrections'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLossProductId(products[0]?.id || '');
                setLossQty(1);
                setLossReason('damaged');
                setLossNotes('');
                const now = new Date();
                const pad = (n: number) => String(n).padStart(2, '0');
                setLossDateTime(
                  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
                );
                setLogLossModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold shadow-xs shadow-rose-500/25 transition active:scale-95 cursor-pointer"
            >
              <span>+</span>
              <span>{isKhmer ? 'កត់ត្រាការខូចខាតថ្មី' : 'Log New Damage / Loss'}</span>
            </button>
          </div>
        </div>

        {/* 4 Loss KPI Badges Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50/60 dark:bg-surface-850/40 border-b border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-white dark:bg-surface-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              {isKhmer ? 'ថ្លៃដើមខាតបង់សរុប (Capital Loss)' : 'Total Capital Loss'}
            </span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums mt-1 block">
              -{formatPrice(lossSummary.totalCapitalLoss, language)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-surface-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              {isKhmer ? 'បាត់ចំណូលលក់ (Revenue Loss)' : 'Lost Potential Revenue'}
            </span>
            <span className="text-lg font-black text-slate-700 dark:text-slate-300 tabular-nums mt-1 block">
              -{formatPrice(lossSummary.totalRevenueLoss, language)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-surface-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              {isKhmer ? 'ចំនួនខូចខាត / បាត់បង់' : 'Damaged / Lost Units'}
            </span>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1 flex items-baseline gap-1.5">
              <span className="tabular-nums">{lossSummary.totalLossUnits}</span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{isKhmer ? 'គ្រឿង' : 'pcs'}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-surface-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              {isKhmer ? 'ករណីខូចខាតជាក់ស្ដែង' : 'Damaged Incidents'}
            </span>
            <div className="text-lg font-black text-slate-800 dark:text-white mt-1 flex items-baseline gap-1.5">
              <span className="tabular-nums">{lossSummary.damagedCount}</span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{isKhmer ? 'គ្រឿង (ខូចខាត)' : 'damaged pcs'}</span>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: isKhmer ? 'ទាំងអស់ (ខាតបង់)' : 'All Loss', count: pureLossItems.length },
              {
                id: 'DAMAGED',
                label: isKhmer ? '⚠️ ខូចខាត' : '⚠️ Damaged',
                count: pureLossItems.filter((x) => x.reason === 'damaged' || x.type === 'DAMAGED').length,
              },
              {
                id: 'AUDIT',
                label: isKhmer ? '🔍 រាប់ស្តុកបាត់' : '🔍 Audit Loss',
                count: pureLossItems.filter((x) => x.reason === 'audit' || x.type === 'AUDIT_COUNT').length,
              },
              {
                id: 'EXCHANGE',
                label: isKhmer ? '🔄 ប្ដូរឱ្យអតិថិជន' : '🔄 Exchange',
                count: pureLossItems.filter((x) => x.reason === 'exchange' || x.type === 'CUSTOMER_EXCHANGE').length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLossFilterReason(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  lossFilterReason === tab.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-surface-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={lossSearch}
              onChange={(e) => setLossSearch(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកឈ្មោះទំនិញ ឬចំណាំ...' : 'Search product or note...'}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-surface-850/80 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5 whitespace-nowrap">{isKhmer ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                <th className="py-3 px-3.5">{isKhmer ? 'ឈ្មោះទំនិញ' : 'Product Name'}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{isKhmer ? 'មូលហេតុ' : 'Reason'}</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">{isKhmer ? 'ចំនួនកាត់ចេញ' : 'Deducted'}</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">{isKhmer ? 'ថ្លៃដើម' : 'Cost'}</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">{isKhmer ? 'តម្លៃលក់' : 'Price'}</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">{isKhmer ? 'ខាតដើមទុន' : 'Capital Loss'}</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">{isKhmer ? 'បាត់ចំណូល' : 'Revenue Loss'}</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">{isKhmer ? 'ស្តុកនៅសល់' : 'Stock Left'}</th>
                <th className="py-3 px-3.5">{isKhmer ? 'ចំណាំ / ការពិពណ៌នា' : 'Notes'}</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">{isKhmer ? 'សកម្មភាព' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredLossItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-xs">
                      {isKhmer ? 'ពុំមានកំណត់ត្រាខាតបង់ ឬខូចខាតត្រូវនឹងការស្វែងរកនេះឡើយ' : 'No loss or damage records found'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLossItems.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-colors group"
                    >
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white max-w-[220px] truncate">
                        <div>{item.productName}</div>
                        {item.productSku && <div className="text-[10px] font-mono text-slate-400 font-normal">{item.productSku}</div>}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {item.reason === 'damaged' || item.type === 'DAMAGED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                            ⚠️ {isKhmer ? 'ខូចខាត/បាត់បង់' : 'Damaged / Loss'}
                          </span>
                        ) : item.reason === 'audit' || item.type === 'AUDIT_COUNT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            🔍 {isKhmer ? 'រាប់ស្តុកបាត់' : 'Audit Shrinkage'}
                          </span>
                        ) : item.reason === 'exchange' || item.type === 'CUSTOMER_EXCHANGE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                            🔄 {isKhmer ? 'ប្ដូរឱ្យអតិថិជន' : 'Replacement'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                            ⚠️ {isKhmer ? 'កាត់ខាតបង់' : 'Loss Write-off'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-mono font-bold">
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          {item.diff}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatPrice(item.costPrice || 0, language)}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatPrice(item.sellingPrice || 0, language)}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {item.capitalLoss > 0 ? `-${formatPrice(item.capitalLoss, language)}` : '$0.00'}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.revenueLoss > 0 ? `-${formatPrice(item.revenueLoss, language)}` : '$0.00'}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap font-semibold">
                        {item.finalStock}
                      </td>

                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 text-xs max-w-[240px]" title={item.notes || ''}>
                        {item.notes ? (
                          <span className="inline-block max-w-full truncate font-medium text-slate-700 dark:text-slate-200" title={item.notes}>
                            {item.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">{isKhmer ? 'គ្មានចំណាំ' : 'No notes'}</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLossDetail(item);
                              setViewLossModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition active:scale-95 cursor-pointer"
                            title={isKhmer ? 'មើលព័ត៌មានលម្អិត' : 'View Loss Details'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLoss(item.id, item.productName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95 cursor-pointer"
                            title={isKhmer ? 'លុបកំណត់ត្រានេះ' : 'Delete record'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* ========================================================================= */}
      {/* LOG STOCK LOSS & DAMAGE MODAL */}
      {/* ========================================================================= */}
      {logLossModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-surface-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-50/60 to-white dark:from-rose-950/30 dark:to-surface-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isKhmer ? 'កត់ត្រាការខូចខាត / បាត់បង់ទំនិញ' : 'Log Stock Damage & Loss'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKhmer ? 'កាត់ស្តុកទំនិញដោយស្វ័យប្រវត្តិ និងកត់ត្រាការខាតបង់' : 'Deduct stock and register accounting capital loss'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogLossModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleLogLossSubmit} className="p-4 sm:p-5 space-y-4">
              {/* Select Product */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'ជ្រើសរើសមុខទំនិញ *' : 'Select Product *'}
                </label>
                <CustomDropdown
                  value={lossProductId}
                  onChange={(val) => setLossProductId(val)}
                  options={lossProductOptions}
                  placeholder={isKhmer ? 'ជ្រើសរើសទំនិញ...' : 'Choose product...'}
                  searchable
                  searchPlaceholder={isKhmer ? 'ស្វែងរកឈ្មោះទំនិញ...' : 'Search product...'}
                  size="md"
                  variant="luxury"
                  className="w-full"
                />
              </div>

              {/* Product Info Strip if selected */}
              {selectedLossProduct && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block">{isKhmer ? 'ស្តុកបច្ចុប្បន្ន' : 'Current Stock'}</span>
                    <strong className="text-slate-800 dark:text-white font-mono font-bold text-sm">
                      {selectedLossProduct.stock} {isKhmer ? 'គ្រឿង' : 'pcs'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isKhmer ? 'ថ្លៃដើមនាំចូល' : 'Cost Price'}</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">
                      {formatPrice(selectedLossProduct.costPrice || 0, language)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isKhmer ? 'តម្លៃលក់' : 'Selling Price'}</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm">
                      {formatPrice(selectedLossProduct.price || 0, language)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Quantity & Reason in 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'ចំនួនខូចខាត (គ្រឿង) *' : 'Deduction Qty (pcs) *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedLossProduct ? selectedLossProduct.stock : 9999}
                    value={lossQty}
                    onChange={(e) => setLossQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'មូលហេតុខូចខាត *' : 'Reason for Loss *'}
                  </label>
                  <select
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="damaged">⚠️ {isKhmer ? 'ខូចខាត/បែកបាក់ (Damaged)' : 'Damaged Goods'}</option>
                    <option value="audit">🔍 {isKhmer ? 'រាប់ស្តុកបាត់ (Inventory Count Loss)' : 'Stock Audit Discrepancy'}</option>
                    <option value="expired">⌛ {isKhmer ? 'ផុតកំណត់/ខូចគុណភាព (Expired)' : 'Expired / Degraded'}</option>
                    <option value="transit">🚚 {isKhmer ? 'ខូចពេលដឹកជញ្ជូន (Transit Accident)' : 'Transit Damage'}</option>
                  </select>
                </div>
              </div>

              {/* Date & Time Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    {isKhmer ? 'កាលបរិច្ឆេទ & ម៉ោងកត់ត្រា' : 'Date & Time'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setLossDateTime(
                        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
                      );
                    }}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    {isKhmer ? 'កំណត់ពេលឥឡូវនេះ (Now)' : 'Set to Now'}
                  </button>
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={lossDateTime}
                    onChange={(e) => setLossDateTime(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'ចំណាំ / ការបរិយាយលម្អិត' : 'Incident Details / Notes'}
                </label>
                <textarea
                  rows={2}
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                  placeholder={isKhmer ? 'ឧ. បែកអេក្រង់ពេលដឹកជញ្ជូន ឬប្រអប់សើមទឹក...' : 'e.g. Broken screen during transport...'}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>

              {/* Real-time Loss Summary Preview */}
              {selectedLossProduct && (
                <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-800/40 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>{isKhmer ? 'ដើមទុនខាតបង់ជាក់ស្ដែង (Capital Loss):' : 'Capital Cost Loss:'}</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-mono font-bold text-sm">
                      -{formatPrice(lossQty * (selectedLossProduct.costPrice || 0), language)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>{isKhmer ? 'បាត់បង់ចំណូលលក់ (Lost Revenue):' : 'Lost Potential Revenue:'}</span>
                    <span className="font-mono">
                      -{formatPrice(lossQty * (selectedLossProduct.price || 0), language)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-[11px] pt-1 border-t border-rose-200/60 dark:border-rose-800/30">
                    <span>{isKhmer ? 'ស្តុកនៅសល់ក្រោយកាត់ចេញ:' : 'Stock Remaining after deduction:'}</span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {Math.max(0, selectedLossProduct.stock - lossQty)} {isKhmer ? 'គ្រឿង' : 'pcs'}
                    </strong>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setLogLossModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLoss || !selectedLossProduct}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-500/25 transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingLoss && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isKhmer ? 'កាត់ស្តុក & កត់ត្រាខាតបង់' : 'Confirm Loss Deduction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW STOCK LOSS DETAIL MODAL */}
      {/* ========================================================================= */}
      {viewLossModalOpen && selectedLossDetail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-surface-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-rose-100 dark:border-rose-950/60 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-white to-amber-50/40 dark:from-rose-950/30 dark:to-surface-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-800/40">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {isKhmer ? 'ព័ត៌មានលម្អិតនៃការខាតបង់' : 'Stock Loss Record Details'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold">
                      {selectedLossDetail.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(selectedLossDetail.createdAt).toLocaleString(isKhmer ? 'km-KH' : 'en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewLossModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Product Info Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isKhmer ? 'ទំនិញដែលបានកាត់ចេញ' : 'Deducted Product'}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                      {selectedLossDetail.productName}
                    </h4>
                    {selectedLossDetail.productSku && (
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 block">
                        SKU: {selectedLossDetail.productSku}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isKhmer ? 'ចំនួនកាត់ចេញ' : 'Deducted Qty'}
                    </span>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-mono font-black text-sm mt-0.5">
                      {selectedLossDetail.diff} {isKhmer ? 'គ្រឿង' : 'pcs'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Impact 2-Card Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
                    {isKhmer ? 'ខាតបង់ថ្លៃដើមផ្ទាល់ (Capital Loss)' : 'Direct Capital Loss'}
                  </span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-1 block">
                    -{formatPrice(selectedLossDetail.capitalLoss, language)}
                  </span>
                  <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-mono font-medium">
                    (ថ្លៃដើម: {formatPrice(selectedLossDetail.costPrice || 0, language)} / គ្រឿង)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {isKhmer ? 'បាត់បង់ចំណូលលក់ (Revenue Loss)' : 'Lost Potential Revenue'}
                  </span>
                  <span className="text-lg font-black text-slate-800 dark:text-white font-mono mt-1 block">
                    -{formatPrice(selectedLossDetail.revenueLoss, language)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono font-medium">
                    (តម្លៃលក់: {formatPrice(selectedLossDetail.sellingPrice || 0, language)} / គ្រឿង)
                  </span>
                </div>
              </div>

              {/* Status & Warehouse Impact Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                    {isKhmer ? 'ប្រភេទនៃបញ្ហា / មូលហេតុ' : 'Incident Type'}
                  </span>
                  {selectedLossDetail.reason === 'damaged' || selectedLossDetail.type === 'DAMAGED' ? (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                      ⚠️ {isKhmer ? 'ខូចខាត / បាក់បែក / បាត់បង់' : 'Damaged / Broken in Transit'}
                    </span>
                  ) : selectedLossDetail.reason === 'audit' || selectedLossDetail.type === 'AUDIT_COUNT' ? (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                      🔍 {isKhmer ? 'រាប់ស្តុកចុងខែបាត់បង់' : 'Audit Shrinkage'}
                    </span>
                  ) : selectedLossDetail.reason === 'exchange' || selectedLossDetail.type === 'CUSTOMER_EXCHANGE' ? (
                    <span className="inline-flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
                      🔄 {isKhmer ? 'ប្ដូរទំនិញថ្មីជូនអតិថិជន' : 'Customer Warranty Exchange'}
                    </span>
                  ) : (
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {selectedLossDetail.reason}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                    {isKhmer ? 'ស្តុកនៅសល់ក្នុងឃ្លាំង' : 'Stock Remaining'}
                  </span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                    {selectedLossDetail.finalStock} {isKhmer ? 'គ្រឿង' : 'pcs'}
                  </span>
                </div>
              </div>

              {/* Reference & Operator */}
              {(selectedLossDetail.referenceNo || selectedLossDetail.operatorName) && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedLossDetail.referenceNo && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{isKhmer ? 'លេខយោង (Ref No):' : 'Reference:'}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedLossDetail.referenceNo}</span>
                    </div>
                  )}
                  {selectedLossDetail.operatorName && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{isKhmer ? 'អ្នកកត់ត្រា:' : 'Logged By:'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedLossDetail.operatorName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Incident Notes */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block mb-1">
                  {isKhmer ? 'កំណត់ត្រា & មូលហេតុនៃការខូចខាត' : 'Incident Notes & Observations'}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedLossDetail.notes || (isKhmer ? 'មិនមានកំណត់ចំណាំបន្ថែម' : 'No additional notes provided.')}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-850 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const id = selectedLossDetail.id;
                  const name = selectedLossDetail.productName;
                  setViewLossModalOpen(false);
                  handleDeleteLoss(id, name);
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'លុបកំណត់ត្រា' : 'Delete Record'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewLossModalOpen(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition cursor-pointer"
              >
                {isKhmer ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Section: Full Product Valuation & Profit Table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div>
            <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              {isKhmer ? 'តារាងគណនេយ្យ និងប្រាក់ចំណេញទំនិញ' : 'Product Valuation & Profit Matrix'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isKhmer ? 'បង្ហាញថ្លៃដើម តម្លៃលក់ និងការគណនាប្រាក់ចំណេញក្នុងទំនិញនីមួយៗ' : 'Full financial overview per individual catalog item'}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Search Input with generous padding */}
            <div className="relative flex-1 sm:w-64 sm:flex-initial">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isKhmer ? 'ស្វែងរកឈ្មោះ ឬ Brand...' : 'Search product or brand...'}
                className="w-full h-10 pl-10 pr-8 text-xs sm:text-sm rounded-xl bg-slate-50/90 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-2xs transition font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 dark:bg-surface-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center text-[10px] transition"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Dropdown */}
            <CustomDropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryDropdownOptions}
              size="md"
              searchable={categories.length > 5}
              searchPlaceholder={isKhmer ? 'ស្វែងរកប្រភេទ...' : 'Filter categories...'}
              className="w-full sm:w-auto min-w-[170px]"
            />

            {/* Sort Filter Dropdown */}
            <CustomDropdown
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={sortDropdownOptions}
              size="md"
              className="w-full sm:w-auto min-w-[185px]"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-surface-850 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4 w-[28%] min-w-[200px]">{isKhmer ? 'ទំនិញ' : 'Product'}</th>
                <th className="py-3.5 px-3 text-center w-[9%] min-w-[70px]">{isKhmer ? 'ស្តុក' : 'Stock'}</th>
                <th className="py-3.5 px-3 text-right w-[12%] min-w-[95px]">{isKhmer ? 'ថ្លៃដើមយកមក' : 'Cost Price'}</th>
                <th className="py-3.5 px-3 text-right w-[12%] min-w-[95px]">{isKhmer ? 'តម្លៃលក់ចេញ' : 'Selling Price'}</th>
                <th className="py-3.5 px-3 text-right w-[13%] min-w-[105px]">{isKhmer ? 'ចំណេញ / ១គ្រឿង' : 'Profit / Unit'}</th>
                <th className="py-3.5 px-3 text-right w-[13%] min-w-[110px]">{isKhmer ? 'ដើមទុនសរុប' : 'Total Cost'}</th>
                <th className="py-3.5 px-4 text-right w-[13%] min-w-[115px]">{isKhmer ? 'ប្រាក់ចំណេញសរុប' : 'Total Est. Profit'}</th>
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
                  const profitUnit = price - cost;
                  const isItemLoss = cost > 0 && profitUnit < 0;
                  const margin = price > 0 ? Math.round((profitUnit / price) * 100) : (cost > 0 ? -100 : 0);
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
                          <div className="min-w-0 flex-1">
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
                          isItemLoss ? (
                            <div className="inline-flex items-center gap-1.5 font-mono font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-300/80 dark:border-rose-700/80 px-2 py-1 rounded-lg text-xs shadow-2xs">
                              <span>-{formatPrice(Math.abs(profitUnit), language)}</span>
                              <span className="text-[10px] px-1 py-0.2 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-black">
                                {margin}%
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300/80 dark:border-emerald-700/80 px-2 py-1 rounded-lg text-xs shadow-2xs">
                              <span>+{formatPrice(profitUnit, language)}</span>
                              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-black">
                                {margin}%
                              </span>
                            </div>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Total Cost */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300 font-bold text-xs">
                        {formatPrice(totalCost, language)}
                      </td>

                      {/* Total Est Profit */}
                      <td className={`py-3 px-4 text-right font-mono font-black text-sm ${totalProfit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {totalProfit < 0 ? `-${formatPrice(Math.abs(totalProfit), language)}` : `+${formatPrice(totalProfit, language)}`}
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
                  <td className="py-3.5 px-4 text-right font-mono font-black text-base">
                    {(() => {
                      const netGrand = processedProducts.reduce((sum, p) => {
                        const cost = Number(p.costPrice) || 0;
                        const price = Number(p.price) || 0;
                        const stock = Number(p.stock) || 0;
                        return sum + stock * (price - cost);
                      }, 0);
                      return (
                        <span className={netGrand < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {netGrand < 0 ? `-${formatPrice(Math.abs(netGrand), language)}` : `+${formatPrice(netGrand, language)}`}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Enterprise Excel Export Hub */}
      <ExcelExportModal
        isOpen={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        orders={orders}
        products={products}
        categories={categories}
        language={language}
      />

      {/* Floating Calculator Button (Message-like design) */}
      <button
        onClick={() => setIsCalculatorModalOpen(true)}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[90] w-[60px] h-[60px] rounded-[24px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 group"
        title={isKhmer ? 'ម៉ាស៊ីនគណនា' : 'Calculator'}
      >
        <Calculator className="w-7 h-7 text-white" />
      </button>
    </div>
  );
}
