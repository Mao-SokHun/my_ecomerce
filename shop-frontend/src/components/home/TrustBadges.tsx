'use client';

import { useEffect, useState } from 'react';
import { settingApi } from '@/lib/api';
import { useLanguageStore } from '@/store/languageStore';
import { DEFAULT_TRUST_BADGES } from '@/lib/trustBadgeDefaults';
import { resolveTrustBadgeIcon } from '@/lib/trustBadgeIcons';
import type { TrustBadgeCard } from '@/types';
import type { AppLanguage } from '@/lib/i18n';

function pickText(card: TrustBadgeCard, lang: AppLanguage) {
  if (lang === 'km') return { title: card.titleKm, desc: card.descKm };
  if (lang === 'zh') return { title: card.titleZh, desc: card.descZh };
  return { title: card.titleEn, desc: card.descEn };
}

export function TrustBadges() {
  const { language } = useLanguageStore();
  const [cards, setCards] = useState<TrustBadgeCard[] | null>(null);

  useEffect(() => {
    settingApi
      .get()
      .then(({ data }) => {
        const layout = (data?.data?.footerInfo || {}) as { homepage?: { trustBadges?: TrustBadgeCard[] } };
        const raw = layout.homepage?.trustBadges;
        if (Array.isArray(raw)) {
          setCards(raw);
        } else {
          setCards(DEFAULT_TRUST_BADGES);
        }
      })
      .catch(() => setCards(DEFAULT_TRUST_BADGES));
  }, []);

  if (!cards || cards.length === 0) return null;

  return (
    <section className="py-8 page-container">
      <div className="grid gap-4 grid-cols-2 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
        {cards.map((card, i) => {
          const Icon = resolveTrustBadgeIcon(card.iconKey);
          const { title, desc } = pickText(card, language);
          return (
            <div
              key={`${card.iconKey}-${i}`}
              className="flex items-center gap-4 p-4 bg-white dark:bg-surface-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <div className="w-11 h-11 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary-600" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
