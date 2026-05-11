'use client';

import { Mail, Phone, Plus, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminSettingsForm } from '../types';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { adminT } from '@/lib/admin-i18n';

interface ContactSettingsSectionProps {
  active: boolean;
  form: AdminSettingsForm;
  blockCls: string;
  blockHeadCls: string;
  blockBodyCls: string;
  fieldLabelCls: string;
  addBtn: string;
  helperTextCls: string;
  onChangeForm: Dispatch<SetStateAction<AdminSettingsForm>>;
}

/** Keep invoice support line in sync for previews and PDFs. */
const syncInvoiceContact = (email: string, phones: string[]) => {
  const trimmedPhones = phones.map((p) => p.trim());
  const supportPhone = trimmedPhones.filter(Boolean).join(' / ');
  return { email: email.trim(), phones: trimmedPhones, supportPhone };
};

export default function ContactSettingsSection({
  active,
  form,
  blockCls,
  blockHeadCls,
  blockBodyCls,
  fieldLabelCls,
  addBtn,
  helperTextCls,
  onChangeForm,
}: ContactSettingsSectionProps) {
  const { language } = useAdminLanguageStore();

  return (
    <div className={active ? `${blockCls} ring-1 ring-emerald-200/70 dark:ring-emerald-900/30` : 'hidden'}>
      <div className={blockHeadCls}>
        <span className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-sm">
          <Mail className="w-5 h-5 text-emerald-600 mt-0.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{adminT(language, 'contactSectionTitle')}</h2>
          <p className="text-xs text-gray-500">{adminT(language, 'contactSectionSubtitle')}</p>
        </div>
      </div>
      <div className={blockBodyCls}>
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {adminT(language, 'contactInfoBanner')}
        </div>
        <div>
          <label className={fieldLabelCls}>{adminT(language, 'contactEmailLabel')}</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              className="input pl-10"
              type="email"
              autoComplete="email"
              placeholder={adminT(language, 'contactEmailPlaceholder')}
              value={form.footer.email}
              onChange={(e) =>
                onChangeForm((p) => {
                  const email = e.target.value;
                  const { supportPhone } = syncInvoiceContact(email, p.footer.phones);
                  return {
                    ...p,
                    footer: { ...p.footer, email },
                    invoice: { ...p.invoice, supportEmail: email.trim(), supportPhone },
                  };
                })
              }
            />
          </div>
          <p className={helperTextCls}>{adminT(language, 'contactEmailHelp')}</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{adminT(language, 'contactPhonesTitle')}</p>
            </div>
            <button
              type="button"
              className={addBtn}
              onClick={() =>
                onChangeForm((p) => {
                  const phones = [...p.footer.phones, ''];
                  const { supportPhone } = syncInvoiceContact(p.footer.email, phones);
                  return {
                    ...p,
                    footer: { ...p.footer, phones },
                    invoice: { ...p.invoice, supportPhone },
                  };
                })
              }
            >
              <Plus className="w-3.5 h-3.5" /> {adminT(language, 'contactAddPhone')}
            </button>
          </div>
          <div className="space-y-2">
            {form.footer.phones.map((phone, i) => (
              <div key={`contact-phone-${i}`} className="flex gap-2">
                <div className="flex-1">
                  <label className={fieldLabelCls}>
                    {adminT(language, 'contactLineLabel')} {i + 1}
                  </label>
                  <input
                    className="input"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={adminT(language, 'contactPhonePlaceholder')}
                    value={phone}
                    onChange={(e) =>
                      onChangeForm((p) => {
                        const arr = [...p.footer.phones];
                        arr[i] = e.target.value;
                        const { supportPhone } = syncInvoiceContact(p.footer.email, arr);
                        return {
                          ...p,
                          footer: { ...p.footer, phones: arr },
                          invoice: { ...p.invoice, supportPhone },
                        };
                      })
                    }
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <button
                    type="button"
                    className="btn-secondary px-2 h-11 shrink-0"
                    onClick={() =>
                      onChangeForm((p) => {
                        const phones = p.footer.phones.filter((_, idx) => idx !== i);
                        const { supportPhone } = syncInvoiceContact(p.footer.email, phones);
                        return {
                          ...p,
                          footer: { ...p.footer, phones },
                          invoice: { ...p.invoice, supportPhone },
                        };
                      })
                    }
                    aria-label={adminT(language, 'contactRemovePhoneAria')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className={helperTextCls}>{adminT(language, 'contactPhonesHelp')}</p>
        </div>
      </div>
    </div>
  );
}
