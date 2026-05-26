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
    <section className="py-5 sm:py-8 page-container">
      <div className="grid gap-2.5 sm:gap-4 grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
        {cards.map((card, i) => {
          const Icon = resolveTrustBadgeIcon(card.iconKey);
          const { title, desc } = pickText(card, language);
          return (
            <div
              key={`${card.iconKey}-${i}`}
              className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-surface-900 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-primary-50 dark:bg-primary-900/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-tight">{title}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 leading-tight mt-0.5">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
