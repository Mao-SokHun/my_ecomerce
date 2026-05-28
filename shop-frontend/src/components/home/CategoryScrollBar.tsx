'use client';

import Link from 'next/link';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import {
  shopCategoryIcon,
  shopCategoryLabel,
  type ShopNavCategory,
} from '@/lib/shopCategoryNav';
import { cn } from '@/lib/utils';

type CategoryScrollBarProps = {
  categories: ShopNavCategory[];
  activeSlug?: string;
  className?: string;
  onNavigate?: () => void;
};

export function CategoryScrollBar({
  categories,
  activeSlug = '',
  className,
  onNavigate,
}: CategoryScrollBarProps) {
  const { language } = useLanguageStore();

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1 scrollbar-none snap-x snap-mandatory',
        className,
      )}
    >
      <Link
        href="/products"
        onClick={onNavigate}
        className={cn(
          'snap-start shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors min-h-[44px]',
          !activeSlug
            ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
            : 'bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-surface-700',
        )}
      >
        {t(language, 'allProducts')}
      </Link>
      {categories.map((cat) => {
        const isActive = activeSlug === cat.slug;
        const href = `/products?category=${encodeURIComponent(cat.slug)}`;
        return (
          <Link
            key={cat.slug}
            href={href}
            onClick={onNavigate}
            className={cn(
              'snap-start shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors min-h-[44px] max-w-[min(220px,75vw)]',
              isActive
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                : 'bg-gray-100 dark:bg-surface-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-surface-700',
            )}
          >
            <span className="text-base leading-none shrink-0" aria-hidden>
              {shopCategoryIcon(cat.slug)}
            </span>
            <span className="truncate leading-snug">
              {shopCategoryLabel(language, cat.slug, cat.name)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
