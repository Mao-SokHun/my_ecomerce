'use client';

import { ReceiptText } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminSettingsForm } from '../types';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { adminT } from '@/lib/admin-i18n';

interface InvoiceSettingsSectionProps {
  active: boolean;
  form: AdminSettingsForm;
  blockCls: string;
  blockHeadCls: string;
  blockBodyCls: string;
  fieldLabelCls: string;
  onChangeForm: Dispatch<SetStateAction<AdminSettingsForm>>;
}

export default function InvoiceSettingsSection({
  active,
  form,
  blockCls,
  blockHeadCls,
  blockBodyCls,
  fieldLabelCls,
  onChangeForm,
}: InvoiceSettingsSectionProps) {
  const { language } = useAdminLanguageStore();
  return (
    <div className={active ? `${blockCls} ring-1 ring-amber-200/70 dark:ring-amber-900/30` : 'hidden'}>
      <div className={blockHeadCls}>
        <span className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shadow-sm">
          <ReceiptText className="w-5 h-5 text-amber-600 mt-0.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{adminT(language, 'invoiceSettings')}</h2>
          <p className="text-xs text-gray-500">{adminT(language, 'invoiceSectionSubtitle')}</p>
        </div>
      </div>

      <div className={blockBodyCls}>
        <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-slate-50/70 dark:bg-slate-900/40 p-4">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">{adminT(language, 'invoiceContactReadonlyTitle')}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{form.footer.email?.trim() || '—'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {form.footer.phones.map((p) => p.trim()).filter(Boolean).join(' / ') || '—'}
          </p>
          <p className="text-[11px] text-gray-500 mt-2">{adminT(language, 'invoiceContactReadonlyHint')}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabelCls}>Invoice Shop Name</label>
            <input
              className="input"
              placeholder="Invoice Shop Name"
              value={form.invoice.shopName}
              onChange={(e) =>
                onChangeForm((p) => ({ ...p, invoice: { ...p.invoice, shopName: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className={fieldLabelCls}>Invoice Address</label>
            <input
              className="input"
              placeholder="Invoice Address"
              value={form.invoice.shopAddress}
              onChange={(e) =>
                onChangeForm((p) => ({ ...p, invoice: { ...p.invoice, shopAddress: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className={fieldLabelCls}>Card Payment Label</label>
            <input
              className="input"
              placeholder="Card Payment Label"
              value={form.invoice.paymentLabelCard}
              onChange={(e) =>
                onChangeForm((p) => ({ ...p, invoice: { ...p.invoice, paymentLabelCard: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className={fieldLabelCls}>Bakong Payment Label</label>
            <input
              className="input"
              placeholder="Bakong Payment Label"
              value={form.invoice.paymentLabelBakong}
              onChange={(e) =>
                onChangeForm((p) => ({ ...p, invoice: { ...p.invoice, paymentLabelBakong: e.target.value } }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className={fieldLabelCls}>Invoice Footer Note</label>
            <textarea
              className="input md:col-span-2 min-h-[88px]"
              placeholder="Footer Note"
              value={form.invoice.footerNote}
              onChange={(e) =>
                onChangeForm((p) => ({ ...p, invoice: { ...p.invoice, footerNote: e.target.value } }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
