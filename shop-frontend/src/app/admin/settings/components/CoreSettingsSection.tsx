'use client';

import { Truck } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminSettingsForm } from '../types';

interface CoreSettingsSectionProps {
  active: boolean;
  form: AdminSettingsForm;
  inputCls: string;
  blockCls: string;
  blockHeadCls: string;
  blockBodyCls: string;
  helperTextCls: string;
  parseMoneyInput: (value: string) => number;
  onChangeForm: Dispatch<SetStateAction<AdminSettingsForm>>;
}

export default function CoreSettingsSection({
  active,
  form,
  inputCls,
  blockCls,
  blockHeadCls,
  blockBodyCls,
  helperTextCls,
  parseMoneyInput,
  onChangeForm,
}: CoreSettingsSectionProps) {
  return (
    <div className={active ? `${blockCls} ring-1 ring-emerald-200/70 dark:ring-emerald-900/30` : 'hidden'}>
      <div className={blockHeadCls}>
        <span className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-sm">
          <Truck className="w-5 h-5 text-emerald-600 mt-0.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ការកំណត់ទូទៅ និងសេវាដឹកជញ្ជូន (Core Settings)</h2>
          <p className="text-xs text-gray-500">កំណត់អត្តសញ្ញាណហាង ម៉ោងធ្វើការ និងថ្លៃសេវាដឹកជញ្ជូនតាមក្រុមហ៊ុននីមួយៗ</p>
        </div>
      </div>

      <div className={blockBodyCls}>
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Store Info & Working Hours */}
          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700 p-5 bg-gradient-to-br from-white to-gray-50/80 dark:from-surface-900 dark:to-surface-800/70 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ឈ្មោះហាង (Site Name)</label>
              <input
                className={inputCls}
                placeholder="e.g. SH-Shop"
                value={form.siteName}
                onChange={(e) => onChangeForm((p) => ({ ...p, siteName: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ពាក្យស្លោកហាង (Store Tagline)</label>
              <input
                className={inputCls}
                placeholder="e.g. ទំនុកចិត្ត គុណភាព និងតម្លៃសមរម្យ"
                value={form.siteTagline}
                onChange={(e) => onChangeForm((p) => ({ ...p, siteTagline: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">ម៉ោងធ្វើការ (Working Hours) សម្រាប់ Auto Chat</label>
              <input
                className={inputCls}
                placeholder="e.g. រៀងរាល់ថ្ងៃ ម៉ោង 8:00 ព្រឹក - 9:00 យប់"
                value={form.workingHours || ''}
                onChange={(e) => onChangeForm((p) => ({ ...p, workingHours: e.target.value }))}
              />
              <p className={helperTextCls}>ព័ត៌មាននេះនឹងបង្ហាញក្នុង Auto Chat ពេលអតិថិជនសួរពីម៉ោងធ្វើការ</p>
            </div>
          </div>

          {/* Shipping Fees & Free Shipping Threshold */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-purple-200 dark:border-purple-900/40 p-4 bg-gradient-to-br from-purple-50/80 to-white dark:from-purple-900/15 dark:to-surface-900">
              <label className="block text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1.5">ថ្លៃដឹក ភ្នំពេញ (USD)</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 1.00"
                value={form.shippingFeePhnomPenh}
                onChange={(e) => onChangeForm((p) => ({ ...p, shippingFeePhnomPenh: parseMoneyInput(e.target.value) }))}
              />
              <p className={helperTextCls}>សេវាដឹកជញ្ជូនរាជធានីភ្នំពេញ</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 p-4 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/15 dark:to-surface-900">
              <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">ថ្លៃដឹក VET (USD)</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 1.00"
                value={form.shippingFeeVet}
                onChange={(e) => onChangeForm((p) => ({ ...p, shippingFeeVet: parseMoneyInput(e.target.value) }))}
              />
              <p className={helperTextCls}>ដឹកតាមខេត្តក្រុមហ៊ុន VET</p>
            </div>

            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 p-4 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-900/15 dark:to-surface-900">
              <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">ថ្លៃដឹក J&T (USD)</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 1.00"
                value={form.shippingFeeJnt}
                onChange={(e) => onChangeForm((p) => ({ ...p, shippingFeeJnt: parseMoneyInput(e.target.value) }))}
              />
              <p className={helperTextCls}>ដឹកតាមខេត្តក្រុមហ៊ុន J&T</p>
            </div>

            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 p-4 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-900/15 dark:to-surface-900">
              <label className="block text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5">Free Shipping ចាប់ពី (USD)</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 50.00"
                value={form.freeShippingThreshold}
                onChange={(e) => onChangeForm((p) => ({ ...p, freeShippingThreshold: parseMoneyInput(e.target.value) }))}
              />
              <p className={helperTextCls}>ទិញលើសចំនួននេះ ដឹកឥតគិតថ្លៃ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
