'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import {
  Tag,
  Plus,
  Loader2,
  Percent,
  DollarSign,
  Info,
  Sparkles,
  Calculator,
  ShieldCheck,
  ShoppingBag,
  Clock,
  Users,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Pencil,
  Trash2,
  Calendar,
  Ticket,
  AlertCircle,
} from 'lucide-react';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { adminT } from '@/lib/admin-i18n';

type Coupon = {
  id: string;
  code: string;
  description?: string | null;
  discountType: string;
  discount: number;
  minOrder?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
};

export default function AdminCouponsPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const isZh = language === 'zh';
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_coupons');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_coupons');
        if (cached) return false;
      } catch {}
    }
    return true;
  });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discount: '10',
    minOrder: '',
    maxDiscount: '',
    usageLimit: '',
    expiresAt: '',
  });
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(isKhmer ? `បានចម្លងកូដ: ${code}` : `Copied: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    adminApi
      .getCoupons()
      .then(({ data }) => {
        const list = data.data || [];
        setCoupons(list);
        try {
          sessionStorage.setItem('admin_cached_coupons', JSON.stringify(list));
        } catch {}
      })
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(coupons.length > 0);
  }, [load]);

  // Live Calculator Simulation
  const discountVal = Number(form.discount) || 0;
  const maxDiscountVal = form.maxDiscount ? Number(form.maxDiscount) : null;
  const minOrderVal = form.minOrder ? Number(form.minOrder) : null;

  const simulationExamples = useMemo(() => {
    const testPrices = [30, 80, 200];
    return testPrices.map((cartTotal) => {
      let discountAmount = 0;
      let isEligible = true;
      let isCapped = false;

      if (minOrderVal && cartTotal < minOrderVal) {
        isEligible = false;
      } else {
        if (form.discountType === 'PERCENTAGE') {
          discountAmount = (cartTotal * discountVal) / 100;
          if (maxDiscountVal && discountAmount > maxDiscountVal) {
            discountAmount = maxDiscountVal;
            isCapped = true;
          }
        } else {
          discountAmount = Math.min(discountVal, cartTotal);
        }
      }

      const finalPrice = Math.max(0, cartTotal - discountAmount);

      return {
        cartTotal,
        discountAmount,
        finalPrice,
        isEligible,
        isCapped,
      };
    });
  }, [form.discountType, discountVal, maxDiscountVal, minOrderVal]);

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const q = tableSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.code.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q));

      const isExpired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'EXPIRED'
          ? isExpired
          : !isExpired;

      return matchSearch && matchStatus;
    });
  }, [coupons, tableSearch, statusFilter]);

  const applyPreset = (preset: {
    code: string;
    description: string;
    discountType: string;
    discount: string;
    minOrder: string;
    maxDiscount: string;
  }) => {
    setForm((prev) => ({
      ...prev,
      ...preset,
    }));
    toast.success(
      isKhmer
        ? `បានជ្រើសរើសគំរូ: ${preset.description}`
        : isZh
        ? `已应用模板: ${preset.description}`
        : `Applied preset: ${preset.description}`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error(adminT(language, 'codeRequired'));
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim(),
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discount: Number(form.discount),
      minOrder: form.minOrder ? Number(form.minOrder) : undefined,
      maxDiscount: form.discountType === 'PERCENTAGE' && form.maxDiscount ? Number(form.maxDiscount) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    };
    try {
      if (editingCouponId) {
        await adminApi.updateCoupon(editingCouponId, payload);
        toast.success(adminT(language, 'couponUpdated'));
      } else {
        await adminApi.createCoupon(payload);
        toast.success(adminT(language, 'couponCreated'));
      }
      setForm({
        code: '',
        description: '',
        discountType: 'PERCENTAGE',
        discount: '10',
        minOrder: '',
        maxDiscount: '',
        usageLimit: '',
        expiresAt: '',
      });
      setEditingCouponId(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discount: String(coupon.discount),
      minOrder: coupon.minOrder != null ? String(coupon.minOrder) : '',
      maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : '',
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
      expiresAt: coupon.expiresAt
        ? (() => {
            const d = new Date(coupon.expiresAt);
            return (
              d.getFullYear() +
              '-' +
              String(d.getMonth() + 1).padStart(2, '0') +
              '-' +
              String(d.getDate()).padStart(2, '0') +
              'T' +
              String(d.getHours()).padStart(2, '0') +
              ':' +
              String(d.getMinutes()).padStart(2, '0')
            );
          })()
        : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeCoupon = async (id: string) => {
    if (!window.confirm(adminT(language, 'deleteCouponConfirm'))) return;
    try {
      await adminApi.deleteCoupon(id);
      toast.success(adminT(language, 'couponDeleted'));
      if (editingCouponId === id) {
        setEditingCouponId(null);
      }
      load();
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  const formatDiscount = (c: Coupon) => {
    if (c.discountType === 'PERCENTAGE') return `${c.discount}%`;
    return formatPrice(c.discount);
  };

  return (
    <div
      className="max-w-6xl mx-auto space-y-8"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {adminT(language, 'couponsTitle')}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isKhmer
                ? 'បង្កើត និងគ្រប់គ្រងកូដបញ្ចុះតម្លៃសម្រាប់អតិថិជន'
                : isZh
                ? '创建并管理客户折扣优惠券'
                : 'Create and manage discount coupon codes for shoppers'}
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="card p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-600" />
            {editingCouponId
              ? adminT(language, 'updateCoupon')
              : adminT(language, 'createCoupon')}
          </h2>

          {/* Quick Presets */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {isKhmer ? 'គំរូរហ័ស:' : isZh ? '快速模板:' : 'Presets:'}
            </span>
            <button
              type="button"
              onClick={() =>
                applyPreset({
                  code: 'OFF10',
                  description: isKhmer ? 'បញ្ចុះ 10% គ្រប់ការទិញ' : '10% Discount',
                  discountType: 'PERCENTAGE',
                  discount: '10',
                  minOrder: '',
                  maxDiscount: '',
                })
              }
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-all font-medium"
            >
              🏷️ 10% Off
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset({
                  code: 'SAVE20MAX30',
                  description: isKhmer ? 'បញ្ចុះ 20% (ច្រើនបំផុត $30)' : '20% Off capped $30',
                  discountType: 'PERCENTAGE',
                  discount: '20',
                  minOrder: '50',
                  maxDiscount: '30',
                })
              }
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 rounded-lg transition-all font-medium"
            >
              🛡️ 20% (Max $30)
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset({
                  code: 'SAVE5',
                  description: isKhmer ? 'បញ្ចុះតម្លៃ $5 ថេរ' : '$5 Fixed Discount',
                  discountType: 'FIXED',
                  discount: '5',
                  minOrder: '20',
                  maxDiscount: '',
                })
              }
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 rounded-lg transition-all font-medium"
            >
              💵 $5 Fixed
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Discount Type Selector (Visual Buttons) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              {isKhmer ? '១. ជ្រើសរើសប្រភេទបញ្ចុះតម្លៃ (Discount Type)' : isZh ? '1. 选择折扣类型 (Discount Type)' : '1. Select Discount Type'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, discountType: 'PERCENTAGE' }))}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  form.discountType === 'PERCENTAGE'
                    ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    form.discountType === 'PERCENTAGE'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {isKhmer ? 'បញ្ចុះតាមភាគរយ (%)' : isZh ? '百分比折扣 (%)' : 'Percentage Discount (%)'}
                    </span>
                    {form.discountType === 'PERCENTAGE' && (
                      <CheckCircle2 className="w-4 h-4 text-primary-600 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isKhmer
                      ? 'បញ្ចុះតាម % នៃតម្លៃទំនិញ (ឧ. បញ្ចុះ 10%, 20%) អាចកំណត់ពិដាន Max Discount បាន'
                      : isZh
                      ? '按商品总额百分比打折 (如 10%, 20%)，可设最大封顶金额'
                      : 'Calculates discount as a percentage of total price. Supports max discount cap.'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, discountType: 'FIXED', maxDiscount: '' }))}
                className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                  form.discountType === 'FIXED'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    form.discountType === 'FIXED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {isKhmer ? 'បញ្ចុះជាទឹកប្រាក់សុទ្ធ ($ USD)' : isZh ? '固定金额减免 ($ USD)' : 'Fixed Amount ($ USD)'}
                    </span>
                    {form.discountType === 'FIXED' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isKhmer
                      ? 'កាត់ចំនួនប្រាក់ដុល្លារថេរពីវិក្កយបត្រផ្ទាល់ (ឧ. បញ្ចុះ $5 ឬ $10 ថេរ)'
                      : isZh
                      ? '直接从订单中减免固定美元金额 (如立减 $5 或 $10)'
                      : 'Direct dollar reduction from the order (e.g. $5 or $10 off directly).'}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Main Values Form Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
            {/* Coupon Code */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {adminT(language, 'couponCode')}{' '}
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  className="input uppercase font-mono font-bold tracking-wider pl-9"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
                  placeholder="SAVE20"
                  required
                />
                <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {isKhmer ? 'កូដដែលអតិថិជនត្រូវវាយបញ្ចូល (អក្សរធំ គ្មានដកឃ្លា)' : 'Uppercase code used at checkout'}
              </p>
            </div>

            {/* Discount Value (Primary Value) */}
            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1.5 flex items-center justify-between">
                <span>
                  {form.discountType === 'PERCENTAGE'
                    ? isKhmer
                      ? '🏷️ ភាគរយបញ្ចុះ (% Value)'
                      : isZh
                      ? '🏷️ 折扣百分比 (% Value)'
                      : '🏷️ Discount Percentage (%)'
                    : isKhmer
                    ? '💵 ទឹកប្រាក់បញ្ចុះសុទ្ធ ($ Value)'
                    : isZh
                    ? '💵 减免金额 ($ Value)'
                    : '💵 Discount Amount ($ USD)'}
                </span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={form.discountType === 'PERCENTAGE' ? 1 : 0.01}
                  max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                  className="input font-bold text-base pr-8"
                  value={form.discount}
                  onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
                  required
                  placeholder={form.discountType === 'PERCENTAGE' ? '20' : '5.00'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                  {form.discountType === 'PERCENTAGE' ? '%' : '$'}
                </span>
              </div>
              <p className="text-[11px] text-primary-600 dark:text-primary-400 font-medium mt-1">
                {form.discountType === 'PERCENTAGE'
                  ? isKhmer
                    ? `👉 បញ្ចុះ ${form.discount || 0}% នៃតម្លៃទំនិញសរុប`
                    : `👉 ${form.discount || 0}% off total price`
                  : isKhmer
                  ? `👉 កាត់ចេញ $${form.discount || 0} ពីវិក្កយបត្រផ្ទាល់`
                  : `👉 $${form.discount || 0} off directly`}
              </p>
            </div>

            {/* Max Discount Cap (Only relevant for Percentage) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {isKhmer
                    ? 'ពិដានបញ្ចុះច្រើនបំផុត ($ Max Cap)'
                    : isZh
                    ? '最大减免封顶 ($ Max Cap)'
                    : 'Max Discount Cap ($)'}
                </span>
              </label>
              {form.discountType === 'PERCENTAGE' ? (
                <>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="input pl-8"
                      value={form.maxDiscount}
                      onChange={(e) => setForm((p) => ({ ...p, maxDiscount: e.target.value }))}
                      placeholder={isKhmer ? 'ឧ. 50 (ទុកទំនេរបើមិនកំណត់)' : 'e.g. 50 (Optional)'}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {isKhmer
                      ? '(ស្រេចចិត្ត) ទប់កុំឱ្យបញ្ចុះលើសពី $... ពេលទិញច្រើន'
                      : '(Optional) Cap maximum discount for large orders'}
                  </p>
                </>
              ) : (
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-200 dark:border-gray-700 text-[11px] text-gray-500">
                  {isKhmer
                    ? '✅ មិនចាំបាច់កំណត់ (ព្រោះបានបញ្ចុះតម្លៃ $ ថេរខាងលើរួចហើយ)'
                    : isZh
                    ? '✅ 固定金额无需设置封顶'
                    : '✅ Not needed for fixed dollar discount'}
                </div>
              )}
            </div>

            {/* Minimum Order Required */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-gray-500" />
                <span>
                  {isKhmer
                    ? 'ទិញចាប់ពីទឹកប្រាក់ ($ Min Order)'
                    : isZh
                    ? '最低消费门槛 ($ Min Order)'
                    : 'Minimum Order ($)'}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input pl-8"
                  value={form.minOrder}
                  onChange={(e) => setForm((p) => ({ ...p, minOrder: e.target.value }))}
                  placeholder={isKhmer ? 'ឧ. 20 (ទុកទំនេរបើមិនកំណត់)' : 'e.g. 20 (Optional)'}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {isKhmer
                  ? '(ស្រេចចិត្ត) ទិញដល់ចំនួននេះទើបប្រើកូដបាន'
                  : '(Optional) Cart must reach this amount to use coupon'}
              </p>
            </div>

            {/* Usage Limit */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span>{adminT(language, 'usageLimit')}</span>
              </label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.usageLimit}
                onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))}
                placeholder={isKhmer ? 'ឧ. 100 នាក់ (ទុកទំនេរបើគ្មានកំណត់)' : 'Unlimited if blank'}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {isKhmer ? '(ស្រេចចិត្ត) ចំនួនដងអតិថិជនអាចប្រើបាន' : '(Optional) Maximum total redemptions'}
              </p>
            </div>

            {/* Expires At */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>{adminT(language, 'expiresOptional')}</span>
              </label>
              <input
                type="datetime-local"
                className="input"
                value={form.expiresAt}
                onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {isKhmer ? '(ស្រេចចិត្ត) ថ្ងៃខែម៉ោងផុតកំណត់' : '(Optional) Expiration date'}
              </p>
            </div>

            {/* Description */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                <span>{adminT(language, 'description')}</span>
              </label>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={
                  isKhmer
                    ? 'ឧ. បញ្ចុះតម្លៃ 20% សម្រាប់ឱកាសបុណ្យចូលឆ្នាំថ្មី'
                    : isZh
                    ? '例如：新年特惠折扣 20%'
                    : 'e.g. Special New Year 20% discount'
                }
              />
            </div>
          </div>

          {/* Live Calculation Simulator */}
          <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-primary-50/60 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-primary-950/20 p-4 rounded-xl border border-blue-200/70 dark:border-blue-900/40">
            <div className="flex items-center gap-2 mb-2.5">
              <Calculator className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                {isKhmer
                  ? '🔍 ឧទាហរណ៍ជាក់ស្ដែងនៃការគណនា (Live Discount Preview)'
                  : isZh
                  ? '🔍 实时折扣试算示例 (Live Discount Preview)'
                  : '🔍 Live Discount Simulation'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {simulationExamples.map((sim) => (
                <div
                  key={sim.cartTotal}
                  className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm space-y-1"
                >
                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                    <span>{isKhmer ? 'ទិញអស់:' : 'Cart Total:'}</span>
                    <span className="font-bold text-gray-900 dark:text-white">${sim.cartTotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>{isKhmer ? 'បញ្ចុះតម្លៃ:' : 'Discount:'}</span>
                    <span className="font-bold">
                      {sim.isEligible ? `-$${sim.discountAmount.toFixed(2)}` : '$0 (មិនទាន់ដល់ Min)'}
                    </span>
                  </div>
                  {sim.isCapped && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ ជាប់ពិដាន Max Cap (${maxDiscountVal})
                    </p>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white font-bold">
                    <span>{isKhmer ? 'ត្រូវបង់ជាក់ស្តែង:' : 'Final Pay:'}</span>
                    <span className="text-primary-600 dark:text-primary-400 text-sm">
                      ${sim.finalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            {editingCouponId && (
              <button
                type="button"
                onClick={() => {
                  setEditingCouponId(null);
                  setForm({
                    code: '',
                    description: '',
                    discountType: 'PERCENTAGE',
                    discount: '10',
                    minOrder: '',
                    maxDiscount: '',
                    usageLimit: '',
                    expiresAt: '',
                  });
                }}
                className="btn-secondary text-sm"
              >
                {adminT(language, 'cancelEdit')}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2 text-sm font-bold shadow-md"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {editingCouponId ? adminT(language, 'updateCoupon') : adminT(language, 'createCoupon')}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Coupons Table */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-surface-900 shadow-xl shadow-slate-200/40 dark:shadow-black/40 overflow-hidden">
        {/* Table Header & Toolbar */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 via-white to-indigo-50/30 dark:from-surface-900 dark:via-surface-900 dark:to-primary-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-primary-500/20">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900 dark:text-white text-base">
                  {adminT(language, 'existingCoupons')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40">
                  {coupons.length} {isKhmer ? 'គូប៉ុង' : 'Coupons'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isKhmer
                  ? 'គ្រប់គ្រងកូដបញ្ចុះតម្លៃ ពិនិត្យចំនួនប្រើប្រាស់ និងកំណត់កាលបរិច្ឆេទ'
                  : 'Manage promo codes, monitor usage quota, and configure expiry dates'}
              </p>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder={isKhmer ? 'ស្វែងរកតាមកូដ...' : 'Search coupon code...'}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100/80 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isKhmer ? 'ទាំងអស់' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isKhmer ? 'សកម្ម' : 'Active'}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('EXPIRED')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'EXPIRED'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isKhmer ? 'ផុតកំណត់' : 'Expired'}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <p className="text-xs text-slate-400">{isKhmer ? 'កំពុងទាញយកទិន្នន័យ...' : 'Loading coupons...'}</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Ticket className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {tableSearch || statusFilter !== 'ALL'
                ? isKhmer
                  ? 'រកមិនឃើញគូប៉ុងត្រូវតាមលក្ខខណ្ឌស្វែងរក'
                  : 'No coupons match your filter'
                : adminT(language, 'noCouponsYet')}
            </p>
            {(tableSearch || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setTableSearch('');
                  setStatusFilter('ALL');
                }}
                className="mt-3 text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
              >
                {isKhmer ? 'សម្អាតការស្វែងរក' : 'Clear search & filters'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-4 w-[28%] min-w-[220px] font-bold">{adminT(language, 'codeCol')}</th>
                  <th className="p-4 w-[16%] min-w-[130px] font-bold">{adminT(language, 'discountCol')}</th>
                  <th className="p-4 w-[18%] min-w-[140px] font-bold">{isKhmer ? 'លក្ខខណ្ឌ' : 'Rules'}</th>
                  <th className="p-4 w-[14%] min-w-[120px] font-bold">{adminT(language, 'usedCol')}</th>
                  <th className="p-4 w-[14%] min-w-[120px] font-bold">{adminT(language, 'expiresCol')}</th>
                  <th className="p-4 w-[10%] min-w-[90px] font-bold text-right">{adminT(language, 'actionCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredCoupons.map((c) => {
                  const isExpired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
                  const usagePercent = c.usageLimit && c.usageLimit > 0 ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : 0;
                  const isLimitReached = c.usageLimit != null && c.usedCount >= c.usageLimit;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Column 1: Code & Description */}
                      <td className="p-4 align-middle">
                        <div className="flex flex-col gap-1.5 max-w-[260px]">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyCode(c.code)}
                              className="group/code inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-primary-500/10 via-indigo-500/10 to-violet-500/10 dark:from-primary-950/60 dark:to-indigo-950/60 border border-primary-200/80 dark:border-primary-800/60 hover:border-primary-400 font-mono font-bold text-xs text-primary-700 dark:text-primary-300 transition-all shadow-xs"
                              title="Click to copy code"
                            >
                              <Ticket className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                              <span>{c.code}</span>
                              {copiedCode === c.code ? (
                                <Check className="w-3 h-3 text-emerald-500 ml-0.5" />
                              ) : (
                                <Copy className="w-3 h-3 text-primary-400/70 opacity-0 group-hover/code:opacity-100 transition-opacity ml-0.5" />
                              )}
                            </button>

                            {isExpired ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                                {isKhmer ? 'ផុតកំណត់' : 'Expired'}
                              </span>
                            ) : isLimitReached ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                                {isKhmer ? 'អស់ចំនួន' : 'Maxed'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                                {isKhmer ? 'សកម្ម' : 'Active'}
                              </span>
                            )}
                          </div>

                          {c.description ? (
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 leading-snug pl-0.5">
                              {c.description}
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic pl-0.5">
                              {isKhmer ? 'គ្មានការពណ៌នា' : 'No description'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Discount Value */}
                      <td className="p-4 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="inline-flex items-center gap-1 font-black text-sm text-emerald-600 dark:text-emerald-400">
                            <span>{formatDiscount(c)}</span>
                          </div>
                          {c.discountType === 'PERCENTAGE' && c.maxDiscount != null && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md w-max border border-amber-200/60 dark:border-amber-900/40">
                              Max: ${c.maxDiscount}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Rules & Conditions */}
                      <td className="p-4 align-middle">
                        <div className="flex flex-col gap-1 text-xs">
                          {c.minOrder != null && (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800 px-2 py-0.5 rounded-md w-max">
                              <ShoppingBag className="w-3 h-3 text-slate-400" />
                              <span>Min: ${c.minOrder}</span>
                            </span>
                          )}
                          {c.usageLimit != null && (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800 px-2 py-0.5 rounded-md w-max">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>Limit: {c.usageLimit}</span>
                            </span>
                          )}
                          {c.minOrder == null && c.usageLimit == null && (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Usage Progress */}
                      <td className="p-4 align-middle">
                        <div className="w-24">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            <span>{c.usedCount}</span>
                            <span className="text-slate-400 text-[11px] font-normal">
                              {c.usageLimit ? `/ ${c.usageLimit}` : 'times'}
                            </span>
                          </div>
                          {c.usageLimit ? (
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  usagePercent >= 100
                                    ? 'bg-rose-500'
                                    : usagePercent >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-primary-500'
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">{isKhmer ? 'គ្មានកម្រិត' : 'Unlimited'}</div>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Expiration */}
                      <td className="p-4 align-middle">
                        <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {c.expiresAt
                                ? new Date(c.expiresAt).toLocaleDateString('en-GB')
                                : isKhmer
                                ? 'គ្មានដែនកំណត់'
                                : 'Never'}
                            </span>
                          </div>
                          {c.expiresAt && (
                            <span className="text-[10px] text-slate-400 pl-4.5">
                              {isExpired ? (isKhmer ? 'បានផុត' : 'Ended') : isKhmer ? 'នៅមានសុពលភាព' : 'Valid'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 6: Actions */}
                      <td className="p-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 dark:hover:bg-primary-950/60 text-slate-700 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400 transition-all hover:scale-105"
                            title={adminT(language, 'editBtn')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{adminT(language, 'editBtn')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCoupon(c.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-all hover:scale-105"
                            title={adminT(language, 'deleteBtn')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{adminT(language, 'deleteBtn')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
