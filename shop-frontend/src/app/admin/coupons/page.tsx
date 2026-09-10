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
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
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

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getCoupons()
      .then(({ data }) => setCoupons(data.data || []))
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
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
      <div className="card overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4 text-primary-600" />
            {adminT(language, 'existingCoupons')}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {coupons.length} {isKhmer ? 'គូប៉ុង' : 'Coupons'}
          </span>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : coupons.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            {adminT(language, 'noCouponsYet')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="p-3.5 font-bold">{adminT(language, 'codeCol')}</th>
                  <th className="p-3.5 font-bold">{adminT(language, 'discountCol')}</th>
                  <th className="p-3.5 font-bold">{isKhmer ? 'លក្ខខណ្ឌ' : 'Rules'}</th>
                  <th className="p-3.5 font-bold">{adminT(language, 'usedCol')}</th>
                  <th className="p-3.5 font-bold">{adminT(language, 'expiresCol')}</th>
                  <th className="p-3.5 font-bold text-right">{adminT(language, 'actionCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded border border-primary-100 dark:border-primary-900/30">
                          {c.code}
                        </span>
                        {c.description && (
                          <span className="text-xs text-gray-500 line-clamp-1">
                            {c.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatDiscount(c)}
                      </span>
                      {c.discountType === 'PERCENTAGE' && c.maxDiscount != null && (
                        <span className="block text-[11px] text-amber-600 font-medium">
                          Max: ${c.maxDiscount}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-xs text-gray-600 dark:text-gray-400">
                      {c.minOrder != null && (
                        <span className="block">Min: ${c.minOrder}</span>
                      )}
                      {c.usageLimit != null && (
                        <span className="block">Limit: {c.usageLimit}</span>
                      )}
                      {c.minOrder == null && c.usageLimit == null && (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-xs">
                      {c.usedCount}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ''}
                    </td>
                    <td className="p-3.5 text-xs text-gray-500">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString()
                        : isKhmer
                        ? 'គ្មានដែនកំណត់'
                        : 'Never'}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                      >
                        {adminT(language, 'editBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCoupon(c.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 transition-all"
                      >
                        {adminT(language, 'deleteBtn')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
