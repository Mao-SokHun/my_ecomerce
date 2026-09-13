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
    const applyBadges = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') {
        setCards(DEFAULT_TRUST_BADGES);
        return;
      }
      const d = raw as { footerInfo?: { homepage?: { trustBadges?: TrustBadgeCard[] } } };
      const layout = (d.footerInfo || {}) as { homepage?: { trustBadges?: TrustBadgeCard[] } };
      const rawBadges = layout.homepage?.trustBadges;
      if (Array.isArray(rawBadges) && rawBadges.length > 0) {
        setCards(rawBadges);
      } else {
        setCards(DEFAULT_TRUST_BADGES);
      }
    };

    settingApi
      .get()
      .then(({ data }) => {
        applyBadges(data?.data);
      })
      .catch(() => setCards(DEFAULT_TRUST_BADGES));

    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        applyBadges(customEvent.detail);
      }
    };

    window.addEventListener('settings:updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings:updated', handleSettingsUpdated);
  }, []);

  if (!cards || cards.length === 0) return null;

  return (
    <section className="py-6 sm:py-10 page-container">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = resolveTrustBadgeIcon(card.iconKey);
          const { title, desc } = pickText(card, language);
          return (
            <div
              key={`${card.iconKey}-${i}`}
              className="group relative flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-surface-900/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] hover:border-amber-500/40 dark:hover:border-amber-400/40 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 hover:-translate-y-0.5"
            >
              {/* Subtle top golden hairline on hover */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-amber-400/0 group-hover:via-amber-400/60 to-transparent transition-all duration-500" />

              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/15 via-yellow-500/20 to-amber-600/25 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/25 group-hover:scale-105 group-hover:border-amber-400/50 transition-all duration-300 shadow-sm">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                  {title}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-tight mt-1 font-medium">
                  {desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
