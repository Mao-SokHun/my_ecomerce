'use client';

import { ReceiptText } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminSettingsForm } from '../types';

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
  return (
    <div className={active ? `${blockCls} ring-1 ring-amber-200/70 dark:ring-amber-900/30` : 'hidden'}>
      <div className={blockHeadCls}>
        <span className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shadow-sm">
          <ReceiptText className="w-5 h-5 text-amber-600 mt-0.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invoice Settings</h2>
          <p className="text-xs text-gray-500">Invoice contact details and payment labels</p>
        </div>
      </div>

      <div className={blockBodyCls}>
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
            <label className={fieldLabelCls}>Support Email</label>
            <input
              className="input"
              placeholder="Support Email"
              value={form.invoice.supportEmail}
              onChange={(e) =>
                onChangeForm((p) => ({ ...p, invoice: { ...p.invoice, supportEmail: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className={fieldLabelCls}>Support Phone</label>
            <input
              className="input"
              placeholder="Support Phone"
              value={form.invoice.supportPhone}
              onChange={(e) =>
                onChangeForm((p) => ({ ...p, invoice: { ...p.invoice, supportPhone: e.target.value } }))
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
