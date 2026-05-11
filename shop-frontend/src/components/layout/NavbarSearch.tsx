'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search, Loader2, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import type { AppLanguage } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';
import { addRecentSearch } from '@/lib/recentSearches';
import { useNavbarSearchAssist, type SearchSuggestion } from './useNavbarSearchAssist';

type Slot = 'desktop' | 'mobile' | null;

type SearchCtx = {
  language: AppLanguage;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSubmitSearch: (trimmed: string) => void;
  assist: ReturnType<typeof useNavbarSearchAssist>;
  activeSlot: Slot;
  openPanel: (slot: Exclude<Slot, null>) => void;
  scheduleClose: () => void;
  cancelBlur: () => void;
  handleSubmit: (e: FormEvent) => void;
  goToResults: (q: string) => void;
};

const Ctx = createContext<SearchCtx | null>(null);

function useSearchCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error('NavbarSearch context missing');
  return v;
}

export function NavbarSearchProvider({
  language,
  searchQuery,
  setSearchQuery,
  onSubmitSearch,
  children,
}: {
  language: AppLanguage;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSubmitSearch: (trimmed: string) => void;
  children: ReactNode;
}) {
  const assist = useNavbarSearchAssist(searchQuery, language);
  const [activeSlot, setActiveSlot] = useState<Slot>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelBlur = useCallback(() => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelBlur();
    blurTimer.current = setTimeout(() => setActiveSlot(null), 200);
  }, [cancelBlur]);

  const openPanel = useCallback(
    (slot: Exclude<Slot, null>) => {
      cancelBlur();
      setActiveSlot(slot);
    },
    [cancelBlur],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      addRecentSearch(q);
      assist.refreshRecent();
      onSubmitSearch(q);
      setActiveSlot(null);
    },
    [assist, onSubmitSearch, searchQuery],
  );

  const goToResults = useCallback(
    (q: string) => {
      const tq = q.trim();
      if (!tq) return;
      addRecentSearch(tq);
      assist.refreshRecent();
      setSearchQuery(tq);
      onSubmitSearch(tq);
      setActiveSlot(null);
    },
    [assist, onSubmitSearch, setSearchQuery],
  );

  const value = useMemo(
    () =>
      ({
        language,
        searchQuery,
        setSearchQuery,
        onSubmitSearch,
        assist,
        activeSlot,
        openPanel,
        scheduleClose,
        cancelBlur,
        handleSubmit,
        goToResults,
      }) satisfies SearchCtx,
    [
      activeSlot,
      assist,
      cancelBlur,
      goToResults,
      handleSubmit,
      language,
      onSubmitSearch,
      openPanel,
      scheduleClose,
      searchQuery,
      setSearchQuery,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function DropdownPanel({ slot }: { slot: 'desktop' | 'mobile' }) {
  const {
    language,
    searchQuery,
    assist,
    activeSlot,
    goToResults,
  } = useSearchCtx();

  if (activeSlot !== slot) return null;
  const q = searchQuery.trim();
  const showSuggest = q.length >= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute left-0 right-0 top-full mt-2 z-[70] rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-900 shadow-xl shadow-gray-200/50 dark:shadow-black/40 max-h-[min(70vh,420px)] overflow-y-auto"
      onMouseDown={(e) => e.preventDefault()}
      role="listbox"
      aria-label={t(language, 'searchAriaSuggestions')}
    >
      {showSuggest && (
        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
          <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {t(language, 'searchQuickResults')}
          </p>
          {assist.loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : assist.suggestions.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500 text-center">{t(language, 'searchNoMatches')}</p>
          ) : (
            <ul className="space-y-0.5">
              {assist.suggestions.map((item: SearchSuggestion) => (
                <li key={item.id}>
                  <Link
                    href={`/products/${item.slug}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors"
                    onClick={() => {
                      addRecentSearch(item.name);
                      assist.refreshRecent();
                    }}
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-surface-800">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={item.name} fill className="object-cover" sizes="44px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-gray-400">SKU</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {[item.brand, formatPrice(item.price, language)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-50 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-900/25 dark:text-primary-300 dark:hover:bg-primary-900/40"
            onClick={() => goToResults(q)}
          >
            {t(language, 'searchSeeAllResults')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {!showSuggest && (
        <p className="px-4 py-3 text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
          {t(language, 'searchHintMinChars')}
        </p>
      )}

      {assist.recent.length > 0 && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <Clock className="w-3.5 h-3.5" /> {t(language, 'searchRecent')}
          </p>
          <div className="flex flex-wrap gap-2">
            {assist.recent.map((term) => (
              <button
                key={term}
                type="button"
                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-surface-800 dark:text-gray-200 dark:hover:bg-surface-700"
                onClick={() => goToResults(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {assist.trending.length > 0 && (
        <div className="p-3">
          <p className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <TrendingUp className="w-3.5 h-3.5" /> {t(language, 'searchTrending')}
          </p>
          <ul className="space-y-1">
            {assist.trending.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.slug}`}
                  className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-surface-800"
                >
                  <span className="truncate text-gray-800 dark:text-gray-100">{p.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-gray-500">{formatPrice(p.price, language)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

export function NavbarSearchDesktop() {
  const {
    language,
    searchQuery,
    setSearchQuery,
    handleSubmit,
    openPanel,
    scheduleClose,
  } = useSearchCtx();

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 max-w-md hidden md:flex ml-8"
      role="search"
      aria-label={t(language, 'searchPlaceholder')}
    >
      <div className="relative w-full" onFocus={() => openPanel('desktop')} onBlur={scheduleClose}>
        <motion.div
          className="relative w-full flex items-center"
          whileFocus={{ scale: 1.02 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            type="search"
            name="search"
            autoComplete="off"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(language, 'searchPlaceholder')}
            className="w-full pl-11 pr-12 py-2.5 text-sm bg-gray-100/50 dark:bg-surface-800/50 border border-transparent focus:border-primary-500/30 focus:bg-white dark:focus:bg-surface-900 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all duration-200 ease-smooth-out"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30 transition-colors"
            aria-label={language === 'km' ? 'ស្វែងរក' : language === 'zh' ? '搜索' : 'Search'}
          >
            <Search className="w-4 h-4" />
          </button>
        </motion.div>
        <DropdownPanel slot="desktop" />
      </div>
    </form>
  );
}

export function NavbarSearchMobile() {
  const {
    language,
    searchQuery,
    setSearchQuery,
    handleSubmit,
    openPanel,
    scheduleClose,
  } = useSearchCtx();

  return (
    <div className="pb-3 md:hidden">
      <form onSubmit={handleSubmit} role="search" aria-label={t(language, 'searchPlaceholder')}>
        <div className="relative" onFocus={() => openPanel('mobile')} onBlur={scheduleClose}>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            name="search"
            autoComplete="off"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(language, 'searchPlaceholder')}
            className="w-full min-h-[44px] pl-10 pr-12 py-2.5 text-sm bg-gray-100 dark:bg-surface-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100 transition-all duration-200 ease-smooth-out"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-primary-600 hover:bg-white/60 dark:text-primary-400 dark:hover:bg-surface-700"
            aria-label={language === 'km' ? 'ស្វែងរក' : language === 'zh' ? '搜索' : 'Search'}
          >
            <Search className="w-5 h-5" />
          </button>
          <DropdownPanel slot="mobile" />
        </div>
      </form>
    </div>
  );
}
