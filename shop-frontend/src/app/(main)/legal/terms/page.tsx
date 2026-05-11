'use client';

import Link from 'next/link';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';

export default function TermsPage() {
  const { language } = useLanguageStore();

  const sections: { titleKey: string; bodyKey: string }[] = [
    { titleKey: 'termsSectionAcceptanceTitle', bodyKey: 'termsSectionAcceptanceBody' },
    { titleKey: 'termsSectionAccountsTitle', bodyKey: 'termsSectionAccountsBody' },
    { titleKey: 'termsSectionOrdersTitle', bodyKey: 'termsSectionOrdersBody' },
    { titleKey: 'termsSectionPaymentTitle', bodyKey: 'termsSectionPaymentBody' },
    { titleKey: 'termsSectionShippingTitle', bodyKey: 'termsSectionShippingBody' },
    { titleKey: 'termsSectionReturnsTitle', bodyKey: 'termsSectionReturnsBody' },
    { titleKey: 'termsSectionConductTitle', bodyKey: 'termsSectionConductBody' },
    { titleKey: 'termsSectionChangesTitle', bodyKey: 'termsSectionChangesBody' },
  ];

  return (
    <div className="page-container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t(language, 'termsPageTitle')}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">{t(language, 'termsPageIntro')}</p>

      {sections.map(({ titleKey, bodyKey }) => (
        <section key={titleKey} className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{t(language, titleKey)}</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t(language, bodyKey)}</p>
        </section>
      ))}

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-6">
        {t(language, 'termsPageLegalNote')}
      </p>
      <div className="flex flex-wrap gap-4">
        <Link href="/legal/privacy" className="text-primary-600 hover:underline">
          {t(language, 'privacyPolicy')}
        </Link>
        <Link href="/" className="text-primary-600 hover:underline">
          {t(language, 'termsBackHome')}
        </Link>
      </div>
    </div>
  );
}
