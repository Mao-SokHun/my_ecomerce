'use client';

import { LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminSettingsForm } from '../types';

interface HeaderSettingsSectionProps {
  active: boolean;
  form: AdminSettingsForm;
  inputCls: string;
  blockCls: string;
  blockHeadCls: string;
  blockBodyCls: string;
  fieldLabelCls: string;
  addBtn: string;
  onChangeForm: Dispatch<SetStateAction<AdminSettingsForm>>;
  updateLinkArray: (key: 'navLinks', idx: number, field: 'label' | 'href', value: string) => void;
}

export default function HeaderSettingsSection({
  active,
  form,
  inputCls,
  blockCls,
  blockHeadCls,
  blockBodyCls,
  fieldLabelCls,
  addBtn,
  onChangeForm,
  updateLinkArray,
}: HeaderSettingsSectionProps) {
  return (
    <div className={active ? `${blockCls} ring-1 ring-indigo-200/70 dark:ring-indigo-900/30` : 'hidden'}>
      <div className={blockHeadCls}>
        <span className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shadow-sm">
          <LayoutTemplate className="w-5 h-5 text-indigo-600 mt-0.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Header</h2>
          <p className="text-xs text-gray-500">Logo, store name, and navigation links</p>
        </div>
      </div>

      <div className={blockBodyCls}>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabelCls}>Header Brand Name</label>
            <input
              className={inputCls}
              placeholder="Header brand name"
              value={form.header.siteName}
              onChange={(e) =>
                onChangeForm((p) => ({ ...p, header: { ...p.header, siteName: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className={fieldLabelCls}>Logo Letter</label>
            <input
              className={inputCls}
              placeholder="Logo letter"
              value={form.header.logoLetter}
              onChange={(e) =>
                onChangeForm((p) => ({ ...p, header: { ...p.header, logoLetter: e.target.value } }))
              }
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Extra navigation links</p>
            <button
              type="button"
              className={addBtn}
              onClick={() =>
                onChangeForm((p) => ({
                  ...p,
                  header: { ...p.header, navLinks: [...p.header.navLinks, { label: '', href: '' }] },
                }))
              }
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <div className="space-y-2">
            {form.header.navLinks.map((item, idx) => (
              <div key={`hnav-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <div>
                  <label className={fieldLabelCls}>Menu Label</label>
                  <input
                    className="input"
                    placeholder="Label"
                    value={item.label}
                    onChange={(e) => updateLinkArray('navLinks', idx, 'label', e.target.value)}
                  />
                </div>
                <div>
                  <label className={fieldLabelCls}>Menu Link</label>
                  <input
                    className="input"
                    placeholder="/path or https://..."
                    value={item.href}
                    onChange={(e) => updateLinkArray('navLinks', idx, 'href', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-secondary px-2"
                  onClick={() =>
                    onChangeForm((p) => ({
                      ...p,
                      header: { ...p.header, navLinks: p.header.navLinks.filter((_, i) => i !== idx) },
                    }))
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
