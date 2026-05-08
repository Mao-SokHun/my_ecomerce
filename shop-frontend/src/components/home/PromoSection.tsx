'use client';

import Link from 'next/link';
import { ArrowRight, Tag } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { settingApi } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';

export function PromoSection() {
  const { language } = useLanguageStore();
  const [adminPromoCards, setAdminPromoCards] = useState<Array<{
    tag?: string;
    title?: string;
    description?: string;
    cta?: string;
    ctaHref?: string;
    image?: string;
    gradientFrom?: string;
    gradientTo?: string;
    gradientFromColor?: string;
    gradientToColor?: string;
  }>>([]);
  useEffect(() => {
    settingApi
      .get()
      .then(({ data }) => {
        const info = (data.data?.footerInfo || {}) as { homepage?: unknown };
        const rows = (info.homepage as { promoCards?: unknown } | undefined)?.promoCards;
        if (Array.isArray(rows)) setAdminPromoCards(rows as Array<Record<string, string>>);
      })
      .catch(() => {});
  }, []);
  const cards = useMemo(
    () =>
      adminPromoCards.length > 0
        ? adminPromoCards.map((p) => ({
            tag: p.tag || t(language, 'limitedTime'),
            title: p.title || t(language, 'summerSale'),
            description: p.description || t(language, 'promoSummerDesc'),
            cta: p.cta || t(language, 'shopElectronics'),
            ctaHref: p.ctaHref || '/products',
            image: p.image || '',
            gradientFrom: p.gradientFrom || 'from-primary-600',
            gradientTo: p.gradientTo || 'to-primary-800',
            gradientFromColor: p.gradientFromColor || '',
            gradientToColor: p.gradientToColor || '',
          }))
        : [
            {
              tag: t(language, 'limitedTime'),
              title: t(language, 'summerSale'),
              description: t(language, 'promoSummerDesc'),
              cta: t(language, 'shopElectronics'),
              ctaHref: '/products?category=electronics',
              image: '',
              gradientFrom: 'from-primary-600',
              gradientTo: 'to-primary-800',
              gradientFromColor: '#4f46e5',
              gradientToColor: '#1e40af',
            },
            {
              tag: t(language, 'newMembers'),
              title: t(language, 'firstOrder'),
              description: t(language, 'promoWelcomeDesc'),
              cta: t(language, 'joinNow'),
              ctaHref: '/register',
              image: '',
              gradientFrom: 'from-amber-500',
              gradientTo: 'to-orange-600',
              gradientFromColor: '#f59e0b',
              gradientToColor: '#ea580c',
            },
          ],
    [adminPromoCards, language]
  );
  return (
    <section className="py-16 page-container">
      <div className="grid md:grid-cols-2 gap-6">
        {cards.slice(0, 2).map((card, idx) => (
          <div
            key={`${card.title}-${idx}`}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} p-8 text-white`}
            style={
              card.gradientFromColor && card.gradientToColor
                ? { backgroundImage: `linear-gradient(135deg, ${card.gradientFromColor}, ${card.gradientToColor})` }
                : undefined
            }
          >
            {card.image ? (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${card.image})` }}
              />
            ) : null}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-medium mb-4">
                <Tag className="w-3.5 h-3.5" /> {card.tag}
              </span>
              <h3 className="text-2xl font-bold mb-2">{card.title}</h3>
              <p className="text-white/80 text-sm mb-5">{card.description}</p>
              <Link
                href={card.ctaHref}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 font-semibold text-sm rounded-xl hover:bg-primary-50 transition-colors"
              >
                {card.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
