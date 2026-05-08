'use client';

import { Building2, Plus, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminSettingsForm } from '../types';

interface FooterSettingsSectionProps {
  active: boolean;
  form: AdminSettingsForm;
  blockCls: string;
  blockHeadCls: string;
  blockBodyCls: string;
  fieldLabelCls: string;
  addBtn: string;
  onChangeForm: Dispatch<SetStateAction<AdminSettingsForm>>;
  updateLinkArray: (key: 'shopLinks' | 'accountLinks' | 'legalLinks', idx: number, field: 'label' | 'href', value: string) => void;
}

export default function FooterSettingsSection({
  active,
  form,
  blockCls,
  blockHeadCls,
  blockBodyCls,
  fieldLabelCls,
  addBtn,
  onChangeForm,
  updateLinkArray,
}: FooterSettingsSectionProps) {
  return (
    <div className={active ? `${blockCls} ring-1 ring-cyan-200/70 dark:ring-cyan-900/30` : 'hidden'}>
      <div className={blockHeadCls}>
        <span className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shadow-sm">
          <Building2 className="w-5 h-5 text-cyan-600 mt-0.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Footer & Store Contact</h2>
          <p className="text-xs text-gray-500">Store address, phone, social, legal, and payment badges</p>
        </div>
      </div>
      <div className={blockBodyCls}>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabelCls}>Brand Name</label>
            <input className="input" placeholder="Brand Name" value={form.footer.brandName} onChange={(e) => onChangeForm((p) => ({ ...p, footer: { ...p.footer, brandName: e.target.value } }))} />
          </div>
          <div>
            <label className={fieldLabelCls}>Store Email</label>
            <input className="input" placeholder="Store Email" value={form.footer.email} onChange={(e) => onChangeForm((p) => ({ ...p, footer: { ...p.footer, email: e.target.value } }))} />
          </div>
          <div className="md:col-span-2">
            <label className={fieldLabelCls}>Store Address</label>
            <input className="input md:col-span-2" placeholder="Store Address" value={form.footer.address} onChange={(e) => onChangeForm((p) => ({ ...p, footer: { ...p.footer, address: e.target.value } }))} />
          </div>
          <div className="md:col-span-2">
            <label className={fieldLabelCls}>Brand Description</label>
            <textarea className="input md:col-span-2 min-h-[90px]" placeholder="Brand Description" value={form.footer.brandDescription} onChange={(e) => onChangeForm((p) => ({ ...p, footer: { ...p.footer, brandDescription: e.target.value } }))} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Phones</p>
              <button type="button" className={addBtn} onClick={() => onChangeForm((p) => ({ ...p, footer: { ...p.footer, phones: [...p.footer.phones, ''] } }))}><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
            <div className="space-y-2">
              {form.footer.phones.map((phone, i) => (
                <div key={`phone-${i}`} className="flex gap-2">
                  <div className="flex-1">
                    <label className={fieldLabelCls}>Phone Number</label>
                    <input className="input" value={phone} onChange={(e) => { const arr = [...form.footer.phones]; arr[i] = e.target.value; onChangeForm((p) => ({ ...p, footer: { ...p.footer, phones: arr } })); }} />
                  </div>
                  <button type="button" className="btn-secondary px-2" onClick={() => onChangeForm((p) => ({ ...p, footer: { ...p.footer, phones: p.footer.phones.filter((_, idx) => idx !== i) } }))}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Social links</p>
              <button type="button" className={addBtn} onClick={() => onChangeForm((p) => ({ ...p, footer: { ...p.footer, socialLinks: [...p.footer.socialLinks, { name: '', url: '' }] } }))}><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
            <div className="space-y-2">
              {form.footer.socialLinks.map((s, i) => (
                <div key={`social-${i}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <div><label className={fieldLabelCls}>Social Name</label><input className="input" placeholder="Name" value={s.name} onChange={(e) => { const arr = [...form.footer.socialLinks]; arr[i] = { ...s, name: e.target.value }; onChangeForm((p) => ({ ...p, footer: { ...p.footer, socialLinks: arr } })); }} /></div>
                  <div><label className={fieldLabelCls}>Social URL</label><input className="input" placeholder="URL" value={s.url} onChange={(e) => { const arr = [...form.footer.socialLinks]; arr[i] = { ...s, url: e.target.value }; onChangeForm((p) => ({ ...p, footer: { ...p.footer, socialLinks: arr } })); }} /></div>
                  <button type="button" className="btn-secondary px-2" onClick={() => onChangeForm((p) => ({ ...p, footer: { ...p.footer, socialLinks: p.footer.socialLinks.filter((_, idx) => idx !== i) } }))}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {(['shopLinks', 'accountLinks', 'legalLinks'] as const).map((group) => (
            <div key={group} className="md:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium capitalize">{group.replace('Links', ' links')}</p>
                <button type="button" className={addBtn} onClick={() => onChangeForm((p) => ({ ...p, footer: { ...p.footer, [group]: [...p.footer[group], { label: '', href: '' }] } }))}><Plus className="w-3.5 h-3.5" /> Add</button>
              </div>
              <div className="space-y-2">
                {form.footer[group].map((item, idx) => (
                  <div key={`${group}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <div><label className={fieldLabelCls}>Link Label</label><input className="input" placeholder="Label" value={item.label} onChange={(e) => updateLinkArray(group, idx, 'label', e.target.value)} /></div>
                    <div><label className={fieldLabelCls}>Link URL</label><input className="input" placeholder="/path or URL" value={item.href} onChange={(e) => updateLinkArray(group, idx, 'href', e.target.value)} /></div>
                    <button type="button" className="btn-secondary px-2" onClick={() => onChangeForm((p) => ({ ...p, footer: { ...p.footer, [group]: p.footer[group].filter((_, i) => i !== idx) } }))}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Payment badges</p>
            <button type="button" className={addBtn} onClick={() => onChangeForm((p) => ({ ...p, footer: { ...p.footer, paymentBadges: [...p.footer.paymentBadges, ''] } }))}><Plus className="w-3.5 h-3.5" /> Add</button>
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            {form.footer.paymentBadges.map((b, i) => (
              <div key={`badge-${i}`} className="flex gap-2">
                <div className="flex-1">
                  <label className={fieldLabelCls}>Badge Name</label>
                  <input className="input" value={b} onChange={(e) => { const arr = [...form.footer.paymentBadges]; arr[i] = e.target.value; onChangeForm((p) => ({ ...p, footer: { ...p.footer, paymentBadges: arr } })); }} />
                </div>
                <button type="button" className="btn-secondary px-2" onClick={() => onChangeForm((p) => ({ ...p, footer: { ...p.footer, paymentBadges: p.footer.paymentBadges.filter((_, idx) => idx !== i) } }))}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
