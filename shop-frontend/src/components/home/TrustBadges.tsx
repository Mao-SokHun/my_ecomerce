'use client';

import { Truck, ShieldCheck, RefreshCw, Headphones } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';

export function TrustBadges() {
  const { language } = useLanguageStore();
  const badges = [
    { icon: Truck, title: t(language, 'trustFreeShippingTitle'), desc: t(language, 'trustFreeShippingDesc') },
    { icon: ShieldCheck, title: t(language, 'trustSecureTitle'), desc: t(language, 'trustSecureDesc') },
    { icon: RefreshCw, title: t(language, 'trustReturnsTitle'), desc: t(language, 'trustReturnsDesc') },
    { icon: Headphones, title: t(language, 'trustSupportTitle'), desc: t(language, 'trustSupportDesc') },
  ];
  return (
    <section className="py-8 page-container">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {badges.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-center gap-4 p-4 bg-white dark:bg-surface-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
          >
            <div className="w-11 h-11 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
