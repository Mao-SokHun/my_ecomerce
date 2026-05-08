'use client';

import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminSettingsForm } from '../types';

interface HomepageSettingsSectionProps {
  active: boolean;
  form: AdminSettingsForm;
  blockCls: string;
  blockHeadCls: string;
  blockBodyCls: string;
  fieldLabelCls: string;
  addBtn: string;
  uploadingKey: string | null;
  heroBgPresets: Array<{ label: string; value: string }>;
  promoBgPresets: Array<{ label: string; from: string; to: string; fromColor: string; toColor: string }>;
  defaultHeroSlide: AdminSettingsForm['homepage']['heroSlides'][number];
  defaultPromoCard: AdminSettingsForm['homepage']['promoCards'][number];
  onChangeForm: Dispatch<SetStateAction<AdminSettingsForm>>;
  onUploadImage: (file: File | undefined, kind: 'hero' | 'promo', idx: number) => void;
}

export default function HomepageSettingsSection({
  active,
  form,
  blockCls,
  blockHeadCls,
  blockBodyCls,
  fieldLabelCls,
  addBtn,
  uploadingKey,
  heroBgPresets,
  promoBgPresets,
  defaultHeroSlide,
  defaultPromoCard,
  onChangeForm,
  onUploadImage,
}: HomepageSettingsSectionProps) {
  return (
    <div className={active ? `${blockCls} ring-1 ring-fuchsia-200/70 dark:ring-fuchsia-900/30` : 'hidden'}>
      <div className={blockHeadCls}>
        <span className="w-10 h-10 rounded-2xl bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center shadow-sm">
          <ImageIcon className="w-5 h-5 text-fuchsia-600 mt-0.5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Homepage Ads</h2>
          <p className="text-xs text-gray-500">Hero banners and promo cards</p>
        </div>
      </div>

      <div className={blockBodyCls}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Hero slides</p>
            <button
              type="button"
              className={addBtn}
              onClick={() =>
                onChangeForm((p) => ({
                  ...p,
                  homepage: { ...p.homepage, heroSlides: [...p.homepage.heroSlides, defaultHeroSlide] },
                }))
              }
            >
              <Plus className="w-3.5 h-3.5" /> Add slide
            </button>
          </div>

          {form.homepage.heroSlides.map((s, i) => (
            <div key={`slide-${i}`} className="p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-surface-800 dark:to-surface-900 grid md:grid-cols-2 gap-3">
              <div><label className={fieldLabelCls}>Slide Tag</label><input className="input" placeholder="Tag" value={s.tag} onChange={(e) => { const arr = [...form.homepage.heroSlides]; arr[i] = { ...s, tag: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } })); }} /></div>
              <div><label className={fieldLabelCls}>Main Title</label><input className="input" placeholder="Title" value={s.title} onChange={(e) => { const arr = [...form.homepage.heroSlides]; arr[i] = { ...s, title: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } })); }} /></div>
              <div><label className={fieldLabelCls}>Subtitle</label><input className="input" placeholder="Subtitle" value={s.subtitle} onChange={(e) => { const arr = [...form.homepage.heroSlides]; arr[i] = { ...s, subtitle: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } })); }} /></div>
              <div><label className={fieldLabelCls}>Button Text</label><input className="input" placeholder="CTA Text" value={s.cta} onChange={(e) => { const arr = [...form.homepage.heroSlides]; arr[i] = { ...s, cta: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } })); }} /></div>
              <div className="md:col-span-2"><label className={fieldLabelCls}>Description</label><input className="input" placeholder="Description" value={s.description} onChange={(e) => { const arr = [...form.homepage.heroSlides]; arr[i] = { ...s, description: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } })); }} /></div>
              <div><label className={fieldLabelCls}>Button Link</label><input className="input" placeholder="CTA href" value={s.ctaHref} onChange={(e) => { const arr = [...form.homepage.heroSlides]; arr[i] = { ...s, ctaHref: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } })); }} /></div>
              <div>
                <label className={fieldLabelCls}>Background Image URL</label>
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder="Image URL" value={s.image} onChange={(e) => { const arr = [...form.homepage.heroSlides]; arr[i] = { ...s, image: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } })); }} />
                  <label className="btn-secondary px-3 py-2 text-xs cursor-pointer">
                    {uploadingKey === `hero-${i}` ? 'Uploading...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingKey === `hero-${i}`}
                      onChange={(e) => onUploadImage(e.target.files?.[0], 'hero', i)}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className={fieldLabelCls}>Banner Background Style</label>
                <select
                  className="input"
                  value={s.bg}
                  onChange={(e) => {
                    const arr = [...form.homepage.heroSlides];
                    arr[i] = { ...s, bg: e.target.value };
                    onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } }));
                  }}
                >
                  {heroBgPresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="w-16">
                  <label className={fieldLabelCls}>Color</label>
                  <input
                    className="input p-1 h-10"
                    type="color"
                    value={s.accent || '#6366f1'}
                    onChange={(e) => {
                      const arr = [...form.homepage.heroSlides];
                      arr[i] = { ...s, accent: e.target.value };
                      onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } }));
                    }}
                  />
                </div>
                <div className="flex-1"><label className={fieldLabelCls}>Accent Color (HEX)</label><input className="input" placeholder="#6366f1" value={s.accent} onChange={(e) => { const arr = [...form.homepage.heroSlides]; arr[i] = { ...s, accent: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: arr } })); }} /></div>
                <button type="button" className="btn-secondary px-2" onClick={() => onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, heroSlides: p.homepage.heroSlides.filter((_, idx) => idx !== i) } }))}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3 pt-2 border-t dark:border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Promo cards</p>
            <button type="button" className={addBtn} onClick={() => onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: [...p.homepage.promoCards, defaultPromoCard] } }))}><Plus className="w-3.5 h-3.5" /> Add card</button>
          </div>
          {form.homepage.promoCards.map((c, i) => (
            <div key={`promo-${i}`} className="p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-surface-800 dark:to-surface-900 grid md:grid-cols-2 gap-3">
              <div><label className={fieldLabelCls}>Card Tag</label><input className="input" placeholder="Tag" value={c.tag} onChange={(e) => { const arr = [...form.homepage.promoCards]; arr[i] = { ...c, tag: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: arr } })); }} /></div>
              <div><label className={fieldLabelCls}>Card Title</label><input className="input" placeholder="Title" value={c.title} onChange={(e) => { const arr = [...form.homepage.promoCards]; arr[i] = { ...c, title: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: arr } })); }} /></div>
              <div className="md:col-span-2"><label className={fieldLabelCls}>Card Description</label><input className="input md:col-span-2" placeholder="Description" value={c.description} onChange={(e) => { const arr = [...form.homepage.promoCards]; arr[i] = { ...c, description: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: arr } })); }} /></div>
              <div><label className={fieldLabelCls}>Button Text</label><input className="input" placeholder="CTA text" value={c.cta} onChange={(e) => { const arr = [...form.homepage.promoCards]; arr[i] = { ...c, cta: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: arr } })); }} /></div>
              <div><label className={fieldLabelCls}>Button Link</label><input className="input" placeholder="CTA href" value={c.ctaHref} onChange={(e) => { const arr = [...form.homepage.promoCards]; arr[i] = { ...c, ctaHref: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: arr } })); }} /></div>
              <div>
                <label className={fieldLabelCls}>Card Image URL</label>
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder="https://... or /uploads/..." value={c.image || ''} onChange={(e) => { const arr = [...form.homepage.promoCards]; arr[i] = { ...c, image: e.target.value }; onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: arr } })); }} />
                  <label className="btn-secondary px-3 py-2 text-xs cursor-pointer">
                    {uploadingKey === `promo-${i}` ? 'Uploading...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingKey === `promo-${i}`}
                      onChange={(e) => onUploadImage(e.target.files?.[0], 'promo', i)}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className={fieldLabelCls}>Card Background Style</label>
                <select
                  className="input"
                  value={`${c.gradientFrom}|${c.gradientTo}`}
                  onChange={(e) => {
                    const [gradientFrom, gradientTo] = e.target.value.split('|');
                    const preset = promoBgPresets.find((p) => p.from === gradientFrom && p.to === gradientTo);
                    const arr = [...form.homepage.promoCards];
                    arr[i] = {
                      ...c,
                      gradientFrom,
                      gradientTo,
                      gradientFromColor: preset?.fromColor || c.gradientFromColor || '#4f46e5',
                      gradientToColor: preset?.toColor || c.gradientToColor || '#1e40af',
                    };
                    onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: arr } }));
                  }}
                >
                  {promoBgPresets.map((preset) => (
                    <option key={`${preset.from}|${preset.to}`} value={`${preset.from}|${preset.to}`}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="w-16">
                  <label className={fieldLabelCls}>From</label>
                  <input
                    className="input p-1 h-10"
                    type="color"
                    value={c.gradientFromColor || '#4f46e5'}
                    onChange={(e) => {
                      const arr = [...form.homepage.promoCards];
                      arr[i] = { ...c, gradientFromColor: e.target.value };
                      onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: arr } }));
                    }}
                  />
                </div>
                <div className="w-16">
                  <label className={fieldLabelCls}>To</label>
                  <input
                    className="input p-1 h-10"
                    type="color"
                    value={c.gradientToColor || '#1e40af'}
                    onChange={(e) => {
                      const arr = [...form.homepage.promoCards];
                      arr[i] = { ...c, gradientToColor: e.target.value };
                      onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: arr } }));
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className={fieldLabelCls}>Gradient Colors (HEX)</label>
                  <input
                    className="input"
                    value={`${c.gradientFromColor || '#4f46e5'} -> ${c.gradientToColor || '#1e40af'}`}
                    readOnly
                  />
                </div>
                <button type="button" className="btn-secondary px-2" onClick={() => onChangeForm((p) => ({ ...p, homepage: { ...p.homepage, promoCards: p.homepage.promoCards.filter((_, idx) => idx !== i) } }))}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
