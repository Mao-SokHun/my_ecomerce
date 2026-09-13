'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { adminApi, productApi } from '@/lib/api';
import { formatPrice, formatKhrPrice } from '@/lib/utils';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import {
  Boxes,
  Package,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Trash2,
  X,
  Truck,
  UserCheck,
  ClipboardList,
  SlidersHorizontal,
  ChevronRight,
  Barcode,
} from 'lucide-react';
import type { Product } from '@/types';
import toast from 'react-hot-toast';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';
import { ExcelExportModal } from '@/components/admin/ExcelExportModal';
import {
  StockAdjustmentItem,
  getStockAdjustments,
  saveStockAdjustment,
  removeStockAdjustment,
  calculateInventoryMovementSummary,
} from '@/lib/stockLossStorage';

export default function AdminInventoryPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';

  // Products and movement logs
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_products');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [adjustments, setAdjustments] = useState<StockAdjustmentItem[]>([]);
  const [loading, setLoading] = useState(products.length === 0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Modals state
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [viewDetailModalOpen, setViewDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<StockAdjustmentItem | null>(null);

  // Common Form States
  const [formProductId, setFormProductId] = useState<string>('');
  const [formQty, setFormQty] = useState<number>(1);
  const [formCost, setFormCost] = useState<number>(0);
  const [formSupplier, setFormSupplier] = useState<string>('');
  const [formCustomerName, setFormCustomerName] = useState<string>('');
  const [formCustomerPhone, setFormCustomerPhone] = useState<string>('');
  const [formOrderNumber, setFormOrderNumber] = useState<string>('');
  const [formReason, setFormReason] = useState<string>('damaged');
  const [formRefNo, setFormRefNo] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formActualCount, setFormActualCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Products & Movement history
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await adminApi.getProducts({ page: 1, limit: 300 });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setProducts(res.data.data);
        sessionStorage.setItem('admin_cached_products', JSON.stringify(res.data.data));
      }
    } catch {
      if (!silent) toast.error(isKhmer ? 'បរាជ័យក្នុងការទាញទិន្នន័យទំនិញ' : 'Failed to load products');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(products.length > 0);
    const syncLogs = () => setAdjustments(getStockAdjustments());
    syncLogs();
    window.addEventListener('stock_adjustments_updated', syncLogs);
    return () => window.removeEventListener('stock_adjustments_updated', syncLogs);
  }, []);

  // Summary Metrics calculation across all 4 pillars
  const summary = useMemo(() => {
    return calculateInventoryMovementSummary(adjustments);
  }, [adjustments]);

  // Product options dropdown
  const productOptions: DropdownOption[] = useMemo(() => {
    return products.map((p) => ({
      value: p.id,
      label: `${p.name} (ស្តុក: ${p.stock} | ថ្លៃដើម: $${(p.costPrice || 0).toFixed(2)})`,
    }));
  }, [products]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === formProductId);
  }, [products, formProductId]);

  // When selected product changes in forms, auto-populate cost
  useEffect(() => {
    if (selectedProduct) {
      setFormCost(selectedProduct.costPrice || 0);
      setFormActualCount(selectedProduct.stock);
    }
  }, [selectedProduct]);

  // Filtered Activity List
  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((item) => {
      const matchType =
        filterType === 'ALL'
          ? true
          : filterType === 'RESTOCK'
          ? item.type === 'RESTOCK' || item.reason === 'restock' || (item.diff > 0 && item.reason !== 'audit')
          : filterType === 'DAMAGED'
          ? item.type === 'DAMAGED' || item.reason === 'damaged' || item.reason === 'broken' || item.reason === 'expired'
          : filterType === 'CUSTOMER_EXCHANGE'
          ? item.type === 'CUSTOMER_EXCHANGE' || item.reason === 'exchange' || item.reason === 'return'
          : filterType === 'AUDIT_COUNT'
          ? item.type === 'AUDIT_COUNT' || item.reason === 'audit'
          : true;

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        (item.productSku && item.productSku.toLowerCase().includes(q)) ||
        (item.referenceNo && item.referenceNo.toLowerCase().includes(q)) ||
        (item.supplier && item.supplier.toLowerCase().includes(q)) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.orderNumber && item.orderNumber.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      return matchType && matchSearch;
    });
  }, [adjustments, filterType, search]);

  // =========================================================================
  // SUBMIT ACTIONS
  // =========================================================================

  // 1. INBOUND RESTOCK SUBMIT
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error(isKhmer ? 'សូមជ្រើសរើសទំនិញ' : 'Please select a product');
      return;
    }
    if (formQty <= 0) {
      toast.error(isKhmer ? 'ចំនួននាំចូលត្រូវតែធំជាង ០' : 'Quantity must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const newStock = selectedProduct.stock + formQty;
      const unitCost = formCost > 0 ? formCost : selectedProduct.costPrice || 0;

      // Update product in DB
      await productApi.update(selectedProduct.id, {
        stock: newStock,
        costPrice: unitCost,
      });

      // Save Log
      const now = new Date();
      const ref = formRefNo.trim() || `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      saveStockAdjustment({
        id: `adj_restock_${Date.now()}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku || undefined,
        type: 'RESTOCK',
        diff: formQty,
        beforeStock: selectedProduct.stock,
        finalStock: newStock,
        reason: 'restock',
        costPrice: unitCost,
        sellingPrice: selectedProduct.price || 0,
        capitalLoss: 0,
        revenueLoss: 0,
        referenceNo: ref,
        supplier: formSupplier.trim() || undefined,
        operatorName: 'Mao Sokhun (Admin)',
        notes: formNotes.trim() || (isKhmer ? 'នាំចូលស្តុកបន្ថែមថ្មី' : 'Inbound batch restock'),
        createdAt: new Date().toISOString(),
      });

      // Update local product state
      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...p, stock: newStock, costPrice: unitCost } : p))
      );

      toast.success(
        isKhmer
          ? `🎉 បានបន្ថែមស្តុក ${formQty} គ្រឿងលើ ${selectedProduct.name} ដោយជោគជ័យ!`
          : `🎉 Successfully restocked +${formQty} units to ${selectedProduct.name}!`
      );
      setRestockModalOpen(false);
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការនាំចូលស្តុក' : 'Failed to update inbound restock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. DAMAGED STOCK SUBMIT
  const handleDamageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error(isKhmer ? 'សូមជ្រើសរើសទំនិញ' : 'Please select a product');
      return;
    }
    if (formQty <= 0) {
      toast.error(isKhmer ? 'ចំនួនខូចខាតត្រូវតែធំជាង ០' : 'Quantity must be greater than 0');
      return;
    }
    if (formQty > selectedProduct.stock) {
      toast.error(
        isKhmer
          ? `ស្តុកបច្ចុប្បន្នមានត្រឹមតែ ${selectedProduct.stock} គ្រឿងប៉ុណ្ណោះ`
          : `Current stock is only ${selectedProduct.stock}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const finalStock = Math.max(0, selectedProduct.stock - formQty);
      const unitCost = selectedProduct.costPrice || 0;
      const unitPrice = selectedProduct.price || 0;

      await productApi.update(selectedProduct.id, { stock: finalStock });

      const now = new Date();
      const ref = formRefNo.trim() || `INC-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      saveStockAdjustment({
        id: `adj_dmg_${Date.now()}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku || undefined,
        type: 'DAMAGED',
        diff: -formQty,
        beforeStock: selectedProduct.stock,
        finalStock: finalStock,
        reason: formReason || 'damaged',
        costPrice: unitCost,
        sellingPrice: unitPrice,
        capitalLoss: formQty * unitCost,
        revenueLoss: formQty * unitPrice,
        referenceNo: ref,
        operatorName: 'Mao Sokhun (Admin)',
        notes: formNotes.trim() || (isKhmer ? 'កាត់ស្តុកខូចខាតចេញពីឃ្លាំង' : 'Damaged stock write-off'),
        createdAt: new Date().toISOString(),
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...p, stock: finalStock } : p))
      );

      toast.success(
        isKhmer
          ? `⚠️ បានកាត់ស្តុកខូចខាត -${formQty} គ្រឿងរួចរាល់!`
          : `⚠️ Successfully deducted -${formQty} damaged units!`
      );
      setDamageModalOpen(false);
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការកាត់ស្តុក' : 'Failed to deduct damaged stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. CUSTOMER REPLACEMENT SUBMIT
  const handleExchangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error(isKhmer ? 'សូមជ្រើសរើសទំនិញ' : 'Please select a product');
      return;
    }
    if (formQty <= 0) {
      toast.error(isKhmer ? 'ចំនួនប្ដូរត្រូវតែធំជាង ០' : 'Quantity must be greater than 0');
      return;
    }
    if (formQty > selectedProduct.stock) {
      toast.error(
        isKhmer
          ? `ស្តុកបច្ចុប្បន្នមានត្រឹមតែ ${selectedProduct.stock} គ្រឿងប៉ុណ្ណោះ`
          : `Current stock is only ${selectedProduct.stock}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const finalStock = Math.max(0, selectedProduct.stock - formQty);
      const unitCost = selectedProduct.costPrice || 0;
      const unitPrice = selectedProduct.price || 0;

      await productApi.update(selectedProduct.id, { stock: finalStock });

      const now = new Date();
      const ref = formRefNo.trim() || `RMA-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      saveStockAdjustment({
        id: `adj_exc_${Date.now()}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku || undefined,
        type: 'CUSTOMER_EXCHANGE',
        diff: -formQty,
        beforeStock: selectedProduct.stock,
        finalStock: finalStock,
        reason: 'exchange',
        costPrice: unitCost,
        sellingPrice: unitPrice,
        capitalLoss: formQty * unitCost,
        revenueLoss: formQty * unitPrice,
        referenceNo: ref,
        customerName: formCustomerName.trim() || undefined,
        customerPhone: formCustomerPhone.trim() || undefined,
        orderNumber: formOrderNumber.trim() || undefined,
        operatorName: 'Mao Sokhun (Admin)',
        notes: formNotes.trim() || (isKhmer ? 'ដូរទំនិញថ្មីជូនអតិថិជនក្រោមកាតព្វកិច្ចធានា' : 'Customer replacement under warranty'),
        createdAt: new Date().toISOString(),
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...p, stock: finalStock } : p))
      );

      toast.success(
        isKhmer
          ? `🔄 បានកត់ត្រាការប្ដូរទំនិញថ្មីជូនអតិថិជន ${formCustomerName || ''} ដោយជោគជ័យ!`
          : `🔄 Customer warranty exchange logged successfully!`
      );
      setExchangeModalOpen(false);
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការកត់ត្រាការប្ដូរទំនិញ' : 'Failed to log customer exchange');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. STOCK AUDIT RECONCILIATION SUBMIT
  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error(isKhmer ? 'សូមជ្រើសរើសទំនិញ' : 'Please select a product');
      return;
    }
    if (formActualCount < 0) {
      toast.error(isKhmer ? 'ចំនួនស្តុករាប់ជាក់ស្តែងមិនអាចតិចជាង ០ ឡើយ' : 'Actual count cannot be negative');
      return;
    }

    const variance = formActualCount - selectedProduct.stock;
    if (variance === 0) {
      toast(isKhmer ? 'ចំនួនស្តុករាប់ជាក់ស្តែងស្មើនឹងស្តុកក្នុងប្រព័ន្ធរួចហើយ' : 'Counted stock matches system stock exactly', {
        icon: 'ℹ️',
      });
    }

    setIsSubmitting(true);
    try {
      await productApi.update(selectedProduct.id, { stock: formActualCount });

      const unitCost = selectedProduct.costPrice || 0;
      const unitPrice = selectedProduct.price || 0;
      const now = new Date();
      const ref = formRefNo.trim() || `AUD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

      saveStockAdjustment({
        id: `adj_aud_${Date.now()}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku || undefined,
        type: 'AUDIT_COUNT',
        diff: variance,
        beforeStock: selectedProduct.stock,
        finalStock: formActualCount,
        reason: 'audit',
        costPrice: unitCost,
        sellingPrice: unitPrice,
        capitalLoss: variance < 0 ? Math.abs(variance) * unitCost : 0,
        revenueLoss: variance < 0 ? Math.abs(variance) * unitPrice : 0,
        referenceNo: ref,
        operatorName: 'Mao Sokhun (Admin)',
        notes: formNotes.trim() || (isKhmer ? `រាប់ស្តុកកែតម្រូវចុងខែ (គម្លាត: ${variance > 0 ? `+${variance}` : variance})` : `Physical cycle count reconciliation (variance: ${variance})`),
        createdAt: new Date().toISOString(),
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? { ...p, stock: formActualCount } : p))
      );

      toast.success(
        isKhmer
          ? `🔍 បានកែតម្រូវស្តុក ${selectedProduct.name} ទៅជា ${formActualCount} គ្រឿងរួចរាល់!`
          : `🔍 Stock reconciled to ${formActualCount} units!`
      );
      setAuditModalOpen(false);
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការកែតម្រូវស្តុក' : 'Failed to reconcile inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdjustment = (id: string, name: string) => {
    if (confirm(isKhmer ? `តើអ្នកចង់លុបកំណត់ត្រា «${name}» មែនទេ?` : `Delete record for "${name}"?`)) {
      removeStockAdjustment(id);
      toast.success(isKhmer ? 'បានលុបកំណត់ត្រាជោគជ័យ' : 'Record deleted');
    }
  };

  const resetFormFields = (pId?: string) => {
    const defaultPid = pId || products[0]?.id || '';
    setFormProductId(defaultPid);
    setFormQty(1);
    const sel = products.find((p) => p.id === defaultPid);
    setFormCost(sel?.costPrice || 0);
    setFormActualCount(sel?.stock || 0);
    setFormSupplier('');
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormOrderNumber('');
    setFormReason('damaged');
    setFormRefNo('');
    setFormNotes('');
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* PAGE HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'សារពើភ័ណ្ឌ & ស្តុក' : 'Inventory & Stock'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Boxes className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <span>{isKhmer ? 'គ្រប់គ្រងចលនាស្តុក & សារពើភ័ណ្ឌ' : 'Inventory & Stock Movements Control'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isKhmer
              ? 'តាមដានគ្រប់ជ្រុងជ្រោយ៖ ចំនួនស្តុកទើបនាំចូល, ស្តុកខូចខាត, ស្តុកប្ដូរឱ្យអតិថិជន និងការរាប់ស្តុកចុងខែ'
              : 'Complete warehouse tracking: Inbound restocks, damaged write-offs, customer warranty swaps, and physical cycle audits'}
          </p>
        </div>

        {/* Action Buttons Hub */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Restock Button */}
          <button
            type="button"
            onClick={() => {
              resetFormFields();
              setRestockModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isKhmer ? 'នាំចូលស្តុកថ្មី' : 'Inbound Restock'}</span>
          </button>

          {/* Damaged Button */}
          <button
            type="button"
            onClick={() => {
              resetFormFields();
              setDamageModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold shadow-xs shadow-rose-500/25 transition active:scale-95 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{isKhmer ? 'កត់ត្រាស្តុកខូច' : 'Log Damaged'}</span>
          </button>

          {/* Exchange Button */}
          <button
            type="button"
            onClick={() => {
              resetFormFields();
              setExchangeModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs shadow-purple-500/25 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isKhmer ? 'ប្ដូរជូនអតិថិជន' : 'Customer Swap'}</span>
          </button>

          {/* Audit Count Button */}
          <button
            type="button"
            onClick={() => {
              resetFormFields();
              setAuditModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold shadow-xs shadow-amber-500/25 transition active:scale-95 cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            <span>{isKhmer ? 'រាប់ស្តុកឡើងវិញ' : 'Stock Audit'}</span>
          </button>

          {/* Excel Export Button */}
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{isKhmer ? 'Export Excel' : 'Excel Report'}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-surface-700 text-slate-600 dark:text-slate-300 transition active:scale-95 cursor-pointer"
            title="Refresh catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 CORE PILLAR HERO KPI CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: Inbound Restock */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-surface-900 border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              {isKhmer ? 'ស្តុកទើបនាំចូលសរុប' : 'Total Inbound Restocked'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              +{summary.totalRestockUnits}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isKhmer ? 'គ្រឿង' : 'units'} ({summary.restockBatches} {isKhmer ? 'ជើង' : 'batches'})
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{isKhmer ? 'ទុនវិនិយោគសរុប:' : 'Investment:'} </span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              ${summary.totalRestockCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Pillar 2: Damaged & Loss */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-surface-900 border border-rose-200/80 dark:border-rose-900/40 shadow-xs relative overflow-hidden group hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              {isKhmer ? 'ស្តុកខូចខាត / បាត់បង់' : 'Damaged & Written Off'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              -{summary.totalDamagedUnits}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isKhmer ? 'គ្រឿង' : 'units'} ({summary.damageIncidents} {isKhmer ? 'ករណី' : 'incidents'})
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{isKhmer ? 'ខាតថ្លៃដើមផ្ទាល់:' : 'Direct Capital Loss:'} </span>
            <strong className="text-rose-600 dark:text-rose-400 font-mono">
              -${summary.totalDamagedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Pillar 3: Customer Exchanges */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-surface-900 border border-purple-200/80 dark:border-purple-900/40 shadow-xs relative overflow-hidden group hover:border-purple-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              {isKhmer ? 'ស្តុកប្ដូរឱ្យអតិថិជន' : 'Customer Replacements'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
              {summary.totalExchangedUnits}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isKhmer ? 'គ្រឿង' : 'units'} ({summary.exchangeIncidents} {isKhmer ? 'ករណី' : 'warranty swaps'})
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{isKhmer ? 'តម្លៃទំនិញប្ដូរជូន:' : 'Exchange Value:'} </span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              ${summary.totalExchangedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Pillar 4: Stock Count & Reconciliations */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-surface-900 border border-amber-200/80 dark:border-amber-900/40 shadow-xs relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              {isKhmer ? 'រាប់ស្តុកចុងខែ (Audit)' : 'Stock Audits & Counts'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              {summary.totalAuditedItems}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isKhmer ? 'មុខទំនិញបានរាប់' : 'items audited'}
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{isKhmer ? 'គម្លាតខ្វះ/លើសសរុប:' : 'Variance Impact:'} </span>
            <strong className="text-amber-700 dark:text-amber-300 font-mono">
              ±{summary.auditDiscrepancyUnits} {isKhmer ? 'គ្រឿង' : 'pcs'}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INVENTORY MOVEMENTS LOG TABLE & TABS */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Toolbar & Filter Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'ALL', label: isKhmer ? 'ទាំងអស់' : 'All Activity', count: adjustments.length },
              {
                id: 'RESTOCK',
                label: isKhmer ? '📦 នាំចូលថ្មី' : '📦 Inbound Restock',
                count: adjustments.filter((x) => x.type === 'RESTOCK' || x.reason === 'restock' || (x.diff > 0 && x.reason !== 'audit')).length,
              },
              {
                id: 'DAMAGED',
                label: isKhmer ? '⚠️ ស្តុកខូច' : '⚠️ Damaged Goods',
                count: adjustments.filter((x) => x.type === 'DAMAGED' || x.reason === 'damaged' || x.reason === 'broken' || x.reason === 'expired').length,
              },
              {
                id: 'CUSTOMER_EXCHANGE',
                label: isKhmer ? '🔄 ប្ដូរជូនអតិថិជន' : '🔄 Customer Swaps',
                count: adjustments.filter((x) => x.type === 'CUSTOMER_EXCHANGE' || x.reason === 'exchange' || x.reason === 'return').length,
              },
              {
                id: 'AUDIT_COUNT',
                label: isKhmer ? '🔍 រាប់ស្តុកឡើងវិញ' : '🔍 Stock Audit',
                count: adjustments.filter((x) => x.type === 'AUDIT_COUNT' || x.reason === 'audit').length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-surface-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកទំនិញ, លេខយោង, អតិថិជន, អ្នកផ្គត់ផ្គង់...' : 'Search product, ref#, customer, supplier...'}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Movements Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-surface-850/80 font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5 whitespace-nowrap">{isKhmer ? 'កាលបរិច្ឆេទ' : 'Date & Time'}</th>
                <th className="py-3 px-3.5">{isKhmer ? 'ឈ្មោះទំនិញ & SKU' : 'Product & SKU'}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{isKhmer ? 'ប្រភេទប្រតិបត្តិការ' : 'Type / Reason'}</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">{isKhmer ? 'ចំនួនកែប្រែ' : 'Qty Change'}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{isKhmer ? 'ដៃគូ / លេខយោង' : 'Partner / Ref'}</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">{isKhmer ? 'ថ្លៃដើម' : 'Cost'}</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">{isKhmer ? 'តម្លៃសរុប' : 'Total Impact'}</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">{isKhmer ? 'ស្តុកនៅសល់' : 'Final Stock'}</th>
                <th className="py-3 px-3.5">{isKhmer ? 'កំណត់ត្រា & ចំណាំ' : 'Notes'}</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">{isKhmer ? 'សកម្មភាព' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400 dark:text-slate-500">
                    <Boxes className="w-10 h-10 mx-auto mb-2.5 text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-xs">
                      {isKhmer ? 'ពុំមានកំណត់ត្រាចលនាស្តុកត្រូវនឹងការស្វែងរកនេះឡើយ' : 'No inventory movement records found'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((item) => {
                  const isRestock = item.type === 'RESTOCK' || item.diff > 0;
                  const isDamage = item.type === 'DAMAGED' || item.reason === 'damaged' || item.reason === 'broken' || item.reason === 'expired';
                  const isExchange = item.type === 'CUSTOMER_EXCHANGE' || item.reason === 'exchange' || item.reason === 'return';
                  const isAudit = item.type === 'AUDIT_COUNT' || item.reason === 'audit';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-surface-800/40 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white max-w-[220px]">
                        <div className="truncate">{item.productName}</div>
                        {item.productSku && (
                          <div className="text-[10px] font-mono text-slate-400 font-normal">
                            SKU: {item.productSku}
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isRestock ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            📦 {isKhmer ? 'នាំចូលស្តុកថ្មី' : 'Inbound Restock'}
                          </span>
                        ) : isDamage ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                            ⚠️ {isKhmer ? 'ស្តុកខូចខាត' : 'Damaged Goods'}
                          </span>
                        ) : isExchange ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                            🔄 {isKhmer ? 'ប្ដូរឱ្យអតិថិជន' : 'Customer Swap'}
                          </span>
                        ) : isAudit ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            🔍 {isKhmer ? 'រាប់ស្តុកកែតម្រូវ' : 'Stock Audit'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-surface-800 dark:text-slate-300">
                            {item.reason}
                          </span>
                        )}
                      </td>

                      {/* Qty Adjustment */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-mono font-bold">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] ${
                            isRestock
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : isDamage
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : isExchange
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {item.diff > 0 ? `+${item.diff}` : item.diff}
                        </span>
                      </td>

                      {/* Partner / Reference */}
                      <td className="py-3 px-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.supplier && (
                          <div className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{item.supplier}</span>
                          </div>
                        )}
                        {item.customerName && (
                          <div className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{item.customerName}</span>
                          </div>
                        )}
                        {item.referenceNo && (
                          <div className="text-[10px] font-mono text-slate-400">
                            Ref: {item.referenceNo}
                          </div>
                        )}
                        {!item.supplier && !item.customerName && !item.referenceNo && (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3.5 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatPrice(item.costPrice || 0, language)}
                      </td>

                      {/* Total Impact */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        {isRestock ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +${(Math.abs(item.diff) * (item.costPrice || 0)).toFixed(2)}
                          </span>
                        ) : isDamage ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            -${(item.capitalLoss || Math.abs(item.diff) * (item.costPrice || 0)).toFixed(2)}
                          </span>
                        ) : isExchange ? (
                          <span className="text-purple-600 dark:text-purple-400">
                            -${(Math.abs(item.diff) * (item.costPrice || 0)).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            ±${(Math.abs(item.diff) * (item.costPrice || 0)).toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Final Stock */}
                      <td className="py-3 px-3.5 text-center font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap font-bold">
                        {item.finalStock}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 text-xs max-w-[220px]" title={item.notes || ''}>
                        {item.notes ? (
                          <span className="inline-block max-w-full truncate font-medium text-slate-700 dark:text-slate-200" title={item.notes}>
                            {item.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">{isKhmer ? 'គ្មានចំណាំ' : 'No notes'}</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDetail(item);
                              setViewDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition active:scale-95 cursor-pointer"
                            title={isKhmer ? 'មើលព័ត៌មានលម្អិត' : 'View Details'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAdjustment(item.id, item.productName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95 cursor-pointer"
                            title={isKhmer ? 'លុបកំណត់ត្រានេះ' : 'Delete Record'}
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
      {/* MODAL 1: ADD INBOUND RESTOCK (នាំចូលស្តុកថ្មី) */}
      {/* ========================================================================= */}
      {restockModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-surface-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-emerald-100 dark:border-emerald-950/60 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 dark:from-emerald-950/30 dark:to-surface-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isKhmer ? 'នាំចូលស្តុកទំនិញថ្មី (Inbound Restock)' : 'Add Inbound Restock'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKhmer ? 'បន្ថែមចំនួនស្តុក និងកត់ត្រាថ្លៃដើមទុនទិញចូល' : 'Add inventory units and record supplier purchase cost'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'ជ្រើសរើសទំនិញនាំចូល *' : 'Select Product *'}
                </label>
                <CustomDropdown
                  options={productOptions}
                  value={formProductId}
                  onChange={(val) => setFormProductId(val)}
                  placeholder={isKhmer ? 'ស្វែងរក និងជ្រើសរើសទំនិញ...' : 'Select product...'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'ចំនួននាំចូល (Qty) *' : 'Inbound Quantity *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQty}
                    onChange={(e) => setFormQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'ថ្លៃដើមទិញចូល ($) *' : 'Unit Purchase Cost ($) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'អ្នកផ្គត់ផ្គង់ (Supplier)' : 'Supplier Name'}
                  </label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="e.g. Apple Distributor KH"
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'លេខប័ណ្ណ / PO Ref' : 'Shipment / PO Ref'}
                  </label>
                  <input
                    type="text"
                    value={formRefNo}
                    onChange={(e) => setFormRefNo(e.target.value)}
                    placeholder="e.g. PO-2026-0901"
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'កំណត់សម្គាល់ & ចំណាំ' : 'Inbound Notes'}
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={isKhmer ? 'ឧ. ទំនិញនាំចូលតាមជើងហោះហើរ គុណភាពល្អ...' : 'e.g. Received shipment in good condition...'}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {selectedProduct && (
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 text-[11px]">
                    <span>{isKhmer ? 'ស្តុកបច្ចុប្បន្ន:' : 'Current Stock:'}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedProduct.stock} pcs</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                    <span>{isKhmer ? 'ស្តុកថ្មីក្រោយនាំចូល:' : 'New Stock after restock:'}</span>
                    <span className="font-mono">{selectedProduct.stock + formQty} pcs</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 text-[11px] pt-1 border-t border-emerald-200/50">
                    <span>{isKhmer ? 'ទឹកប្រាក់វិនិយោគសរុប:' : 'Total Inbound Value:'}</span>
                    <strong className="font-mono text-emerald-700 dark:text-emerald-300">${(formQty * formCost).toFixed(2)}</strong>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProduct}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-500/25 transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isKhmer ? 'បញ្ជាក់ការនាំចូលស្តុក' : 'Confirm Inbound Restock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LOG DAMAGED STOCK (កត់ត្រាស្តុកខូច) */}
      {/* ========================================================================= */}
      {damageModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-surface-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-rose-100 dark:border-rose-950/60 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-white to-red-50/40 dark:from-rose-950/30 dark:to-surface-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isKhmer ? 'កត់ត្រាស្តុកខូចខាត & បាត់បង់ (Damaged Goods)' : 'Log Damaged Goods'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKhmer ? 'កាត់ស្តុកចេញ និងកត់ត្រាការខាតបង់ថ្លៃដើមគណនេយ្យ' : 'Write off damaged units and log financial capital loss'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDamageModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDamageSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'ជ្រើសរើសទំនិញខូចខាត *' : 'Select Damaged Product *'}
                </label>
                <CustomDropdown
                  options={productOptions}
                  value={formProductId}
                  onChange={(val) => setFormProductId(val)}
                  placeholder={isKhmer ? 'ស្វែងរក និងជ្រើសរើសទំនិញ...' : 'Select product...'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'ចំនួនកាត់ចេញ (Qty) *' : 'Deducted Quantity *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct ? selectedProduct.stock : 999}
                    required
                    value={formQty}
                    onChange={(e) => setFormQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'ប្រភេទនៃបញ្ហា' : 'Incident Type'}
                  </label>
                  <select
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="damaged">⚠️ {isKhmer ? 'បែកបាក់ / ខូចខាតក្នុងឃ្លាំង' : 'Damaged / Broken'}</option>
                    <option value="expired">💔 {isKhmer ? 'ផុតកំណត់ / ខូចគុណភាព' : 'Expired / Defective'}</option>
                    <option value="loss">🔍 {isKhmer ? 'បាត់បង់ពេលដឹកជញ្ជូន' : 'Lost in Transit'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'មូលហេតុ & ការពិពណ៌នាការខូចខាត' : 'Incident Notes & Details'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={isKhmer ? 'ឧ. បែកអេក្រង់ពេលលើកដាក់ក្នុងឃ្លាំង...' : 'e.g. Screen shattered during warehouse handling...'}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {selectedProduct && (
                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-rose-800 dark:text-rose-300 font-bold text-[11px]">
                    <span>{isKhmer ? 'ខាតបង់ថ្លៃដើមផ្ទាល់ (Capital Loss):' : 'Direct Capital Loss:'}</span>
                    <span className="font-mono">-${(formQty * (selectedProduct.costPrice || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 text-[11px]">
                    <span>{isKhmer ? 'ស្តុកនៅសល់ក្រោយកាត់ចេញ:' : 'Stock Remaining:'}</span>
                    <strong className="font-mono text-slate-900 dark:text-white">
                      {Math.max(0, selectedProduct.stock - formQty)} pcs
                    </strong>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDamageModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProduct}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-500/25 transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isKhmer ? 'កាត់ស្តុកខូចខាត' : 'Confirm Damage Deduction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LOG CUSTOMER REPLACEMENT (ប្ដូរជូនអតិថិជន) */}
      {/* ========================================================================= */}
      {exchangeModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-surface-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-purple-100 dark:border-purple-950/60 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 dark:from-purple-950/30 dark:to-surface-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isKhmer ? 'ប្ដូរទំនិញថ្មីជូនអតិថិជន (Customer Exchange)' : 'Log Customer Replacement'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKhmer ? 'កាត់ស្តុកចេញដើម្បីដូរទំនិញថ្មីជូនអតិថិជនក្រោមកាតព្វកិច្ចធានា (RMA)' : 'Deduct inventory to replace defective item under warranty'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExchangeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExchangeSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'ជ្រើសរើសទំនិញប្ដូរជូន *' : 'Select Replacement Product *'}
                </label>
                <CustomDropdown
                  options={productOptions}
                  value={formProductId}
                  onChange={(val) => setFormProductId(val)}
                  placeholder={isKhmer ? 'ស្វែងរក និងជ្រើសរើសទំនិញ...' : 'Select product...'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'ចំនួនប្ដូរជូន (Qty) *' : 'Replacement Qty *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct ? selectedProduct.stock : 999}
                    required
                    value={formQty}
                    onChange={(e) => setFormQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'លេខកូដកម្មង់ចាស់ (Order #)' : 'Original Order #'}
                  </label>
                  <input
                    type="text"
                    value={formOrderNumber}
                    onChange={(e) => setFormOrderNumber(e.target.value)}
                    placeholder="e.g. ORD-MTV3IQB1"
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'ឈ្មោះអតិថិជន *' : 'Customer Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="e.g. Chea Vichea"
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKhmer ? 'លេខទូរស័ព្ទអតិថិជន' : 'Customer Phone'}
                  </label>
                  <input
                    type="text"
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    placeholder="e.g. 012 889 900"
                    className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'មូលហេតុនៃការប្ដូរទំនិញ *' : 'Reason for Exchange *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={isKhmer ? 'ឧ. កាសសាកថ្មមិនចូល ពិនិត្យឃើញខូច Battery ត្រូវដូរថ្មីជូន...' : 'e.g. Battery charging defect verified, swap with new unit...'}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {selectedProduct && (
                <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-purple-800 dark:text-purple-300 font-bold text-[11px]">
                    <span>{isKhmer ? 'តម្លៃថ្លៃដើមទំនិញប្ដូរជូន:' : 'Exchange Capital Value:'}</span>
                    <span className="font-mono">${(formQty * (selectedProduct.costPrice || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 text-[11px]">
                    <span>{isKhmer ? 'ស្តុកនៅសល់ក្រោយប្ដូរជូន:' : 'Stock Remaining:'}</span>
                    <strong className="font-mono text-slate-900 dark:text-white">
                      {Math.max(0, selectedProduct.stock - formQty)} pcs
                    </strong>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setExchangeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProduct}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs shadow-purple-500/25 transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isKhmer ? 'បញ្ជាក់ការប្ដូរទំនិញ' : 'Confirm Customer Swap'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: STOCK AUDIT & RECONCILIATION (រាប់ស្តុកឡើងវិញ) */}
      {/* ========================================================================= */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-surface-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-amber-100 dark:border-amber-950/60 flex items-center justify-between bg-gradient-to-r from-amber-50/70 via-white to-orange-50/40 dark:from-amber-950/30 dark:to-surface-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isKhmer ? 'រាប់ស្តុកចុងខែ & កែតម្រូវ (Stock Audit Count)' : 'Physical Inventory Cycle Count'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKhmer ? 'ប្រៀបធៀបចំនួនស្តុកជាក់ស្តែងក្នុងឃ្លាំង និងកែតម្រូវគម្លាត' : 'Reconcile actual physical warehouse count with system stock'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'ជ្រើសរើសទំនិញដែលបានរាប់ *' : 'Select Audited Product *'}
                </label>
                <CustomDropdown
                  options={productOptions}
                  value={formProductId}
                  onChange={(val) => setFormProductId(val)}
                  placeholder={isKhmer ? 'ស្វែងរក និងជ្រើសរើសទំនិញ...' : 'Select product...'}
                />
              </div>

              {selectedProduct && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isKhmer ? 'ស្តុកក្នុងប្រព័ន្ធបច្ចុប្បន្ន' : 'System Stock'}
                    </span>
                    <span className="text-xl font-mono font-black text-slate-800 dark:text-white mt-1 block">
                      {selectedProduct.stock} {isKhmer ? 'គ្រឿង' : 'pcs'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isKhmer ? 'ស្តុករាប់ជាក់ស្តែងក្នុងឃ្លាំង *' : 'Actual Counted Stock *'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formActualCount}
                      onChange={(e) => setFormActualCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full h-11 px-3 text-sm rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white font-mono font-black focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isKhmer ? 'មូលហេតុ & កំណត់សម្គាល់ការរាប់' : 'Audit Variance Explanation'}
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={isKhmer ? 'ឧ. រាប់ស្តុកចុងខែកញ្ញា រកឃើញខ្វះ ១ គ្រឿង...' : 'e.g. Month-end physical count verified...'}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {selectedProduct && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">{isKhmer ? 'គម្លាតស្តុក (Variance):' : 'Stock Variance:'}</span>
                    <strong
                      className={`font-mono font-bold ${
                        formActualCount - selectedProduct.stock < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : formActualCount - selectedProduct.stock > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-600'
                      }`}
                    >
                      {formActualCount - selectedProduct.stock > 0
                        ? `+${formActualCount - selectedProduct.stock}`
                        : formActualCount - selectedProduct.stock}{' '}
                      pcs
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500">{isKhmer ? 'ផលប៉ះពាល់ហិរញ្ញវត្ថុ:' : 'Cost Impact:'}</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      ${(Math.abs(formActualCount - selectedProduct.stock) * (selectedProduct.costPrice || 0)).toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAuditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProduct}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs shadow-amber-500/25 transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isKhmer ? 'កែតម្រូវស្តុកឡើងវិញ' : 'Confirm Stock Reconciliation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: VIEW DETAIL MODAL (មើលព័ត៌មានលម្អិតពេញលេញ) */}
      {/* ========================================================================= */}
      {viewDetailModalOpen && selectedDetail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-surface-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-surface-850 dark:to-surface-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {isKhmer ? 'ព័ត៌មានលម្អិតនៃចលនាស្តុក' : 'Inventory Movement Details'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 font-bold">
                      {selectedDetail.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(selectedDetail.createdAt).toLocaleString(isKhmer ? 'km-KH' : 'en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Product Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isKhmer ? 'មុខទំនិញ' : 'Product'}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                      {selectedDetail.productName}
                    </h4>
                    {selectedDetail.productSku && (
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 block">
                        SKU: {selectedDetail.productSku}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isKhmer ? 'ចំនួនប្រែប្រួល' : 'Qty Adjusted'}
                    </span>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg font-mono font-black text-sm mt-0.5 ${
                        selectedDetail.diff > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}
                    >
                      {selectedDetail.diff > 0 ? `+${selectedDetail.diff}` : selectedDetail.diff} {isKhmer ? 'គ្រឿង' : 'pcs'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial & Warehouse Impact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isKhmer ? 'ថ្លៃដើមឯកតា (Unit Cost)' : 'Unit Cost'}
                  </span>
                  <span className="text-base font-black text-slate-800 dark:text-white font-mono mt-0.5 block">
                    {formatPrice(selectedDetail.costPrice || 0, language)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isKhmer ? 'ស្តុកនៅសល់ចុងក្រោយ' : 'Final Remaining Stock'}
                  </span>
                  <span className="text-base font-black text-slate-800 dark:text-white font-mono mt-0.5 block">
                    {selectedDetail.finalStock} {isKhmer ? 'គ្រឿង' : 'pcs'}
                  </span>
                </div>
              </div>

              {/* Partner Details (Supplier / Customer / Ref) */}
              {(selectedDetail.supplier || selectedDetail.customerName || selectedDetail.referenceNo || selectedDetail.orderNumber) && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isKhmer ? 'ព័ត៌មានយោង & ដៃគូពាក់ព័ន្ធ' : 'Reference & Partner Information'}
                  </span>
                  {selectedDetail.supplier && (
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>{isKhmer ? 'អ្នកផ្គត់ផ្គង់ (Supplier):' : 'Supplier:'}</span>
                      <strong className="text-emerald-700 dark:text-emerald-300">{selectedDetail.supplier}</strong>
                    </div>
                  )}
                  {selectedDetail.customerName && (
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>{isKhmer ? 'អតិថិជន (Customer):' : 'Customer:'}</span>
                      <strong className="text-purple-700 dark:text-purple-300">
                        {selectedDetail.customerName} {selectedDetail.customerPhone ? `(${selectedDetail.customerPhone})` : ''}
                      </strong>
                    </div>
                  )}
                  {selectedDetail.orderNumber && (
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>{isKhmer ? 'លេខ Order ចាស់:' : 'Related Order #:'}</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedDetail.orderNumber}</strong>
                    </div>
                  )}
                  {selectedDetail.referenceNo && (
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>{isKhmer ? 'លេខយោង (Ref No):' : 'Reference No:'}</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedDetail.referenceNo}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-850 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {isKhmer ? 'កំណត់សម្គាល់ & ហេតុផល' : 'Notes & Reason'}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedDetail.notes || (isKhmer ? 'មិនមានកំណត់ចំណាំបន្ថែម' : 'No additional notes.')}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-surface-850 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const id = selectedDetail.id;
                  const name = selectedDetail.productName;
                  setViewDetailModalOpen(false);
                  handleDeleteAdjustment(id, name);
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'លុបកំណត់ត្រា' : 'Delete'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewDetailModalOpen(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition cursor-pointer"
              >
                {isKhmer ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXCEL EXPORT MODAL */}
      {/* ========================================================================= */}
      <ExcelExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        products={products}
        orders={[]}
        language={language}
      />
    </div>
  );
}
