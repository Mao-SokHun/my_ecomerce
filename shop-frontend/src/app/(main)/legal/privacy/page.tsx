'use client';

import Link from 'next/link';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';

export default function PrivacyPage() {
  const { language } = useLanguageStore();

  return (
    <div className="page-container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t(language, 'privacyPageTitle')}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">{t(language, 'privacyPageIntro')}</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {t(language, 'privacySectionCollectionTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t(language, 'privacySectionCollectionBody')}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {t(language, 'privacySectionPurposeTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t(language, 'privacySectionPurposeBody')}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {t(language, 'privacySectionRetentionTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t(language, 'privacySectionRetentionBody')}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {t(language, 'privacySectionRightsTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t(language, 'privacySectionRightsBody')}</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {t(language, 'privacySignInSecurityTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{t(language, 'privacySignInIpGeo')}</p>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t(language, 'privacySignInDeviceLocation')}</p>
      </section>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-6">
        {t(language, 'privacyPageLegalNote')}
      </p>
      <Link href="/" className="text-primary-600 hover:underline">
        {t(language, 'privacyBackHome')}
      </Link>
    </div>
  );
}
