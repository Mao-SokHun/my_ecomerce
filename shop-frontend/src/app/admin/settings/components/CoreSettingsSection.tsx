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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Core Settings</h2>
          <p className="text-xs text-gray-500">Store identity and shipping fee by company</p>
        </div>
      </div>

      <div className={blockBodyCls}>
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700 p-5 bg-gradient-to-br from-white to-gray-50/80 dark:from-surface-900 dark:to-surface-800/70">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Site Name</label>
            <input
              className={inputCls}
              placeholder="e.g. SH-Shop"
              value={form.siteName}
              onChange={(e) => onChangeForm((p) => ({ ...p, siteName: e.target.value }))}
            />
            <label className="block text-xs font-medium text-gray-500 mt-4 mb-1.5">Store Tagline</label>
            <input
              className={inputCls}
              placeholder="e.g. Fast delivery, best price"
              value={form.siteTagline}
              onChange={(e) => onChangeForm((p) => ({ ...p, siteTagline: e.target.value }))}
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 p-5 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/15 dark:to-surface-900">
              <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">VET Delivery Fee (USD)</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 1.50"
                value={form.shippingFeeVet}
                onChange={(e) => onChangeForm((p) => ({ ...p, shippingFeeVet: parseMoneyInput(e.target.value) }))}
              />
              <p className={helperTextCls}>You can input decimal values (example: 1.25)</p>
            </div>

            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 p-5 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-900/15 dark:to-surface-900">
              <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">J&T Delivery Fee (USD)</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 2.50"
                value={form.shippingFeeJnt}
                onChange={(e) => onChangeForm((p) => ({ ...p, shippingFeeJnt: parseMoneyInput(e.target.value) }))}
              />
              <p className={helperTextCls}>You can input decimal values (example: 2.75)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
