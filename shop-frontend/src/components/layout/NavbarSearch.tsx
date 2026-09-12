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
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Clock, TrendingUp, ArrowRight, X, Sparkles, Trash2 } from 'lucide-react';
import type { AppLanguage } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';
import { addRecentSearch, clearRecentSearches } from '@/lib/recentSearches';
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
  handleSubmit: (e?: FormEvent) => void;
  goToResults: (q: string) => void;
  handleClear: () => void;
  handleClearAllRecent: () => void;
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
    blurTimer.current = setTimeout(() => setActiveSlot(null), 250);
  }, [cancelBlur]);

  const openPanel = useCallback(
    (slot: Exclude<Slot, null>) => {
      cancelBlur();
      setActiveSlot(slot);
    },
    [cancelBlur],
  );

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      if (e) e.preventDefault();
      const q = searchQuery.trim();
      if (q) {
        addRecentSearch(q);
        assist.refreshRecent();
      }
      onSubmitSearch(q);
      setActiveSlot(null);
    },
    [assist, onSubmitSearch, searchQuery],
  );

  const goToResults = useCallback(
    (q: string) => {
      const tq = q.trim();
      if (tq) {
        addRecentSearch(tq);
        assist.refreshRecent();
      }
      setSearchQuery(tq);
      onSubmitSearch(tq);
      setActiveSlot(null);
    },
    [assist, onSubmitSearch, setSearchQuery],
  );

  const handleClear = useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleClearAllRecent = useCallback(() => {
    clearRecentSearches();
    assist.refreshRecent();
  }, [assist]);

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
        handleClear,
        handleClearAllRecent,
      }) satisfies SearchCtx,
    [
      activeSlot,
      assist,
      cancelBlur,
      goToResults,
      handleClear,
      handleClearAllRecent,
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
    handleClearAllRecent,
    cancelBlur,
  } = useSearchCtx();

  if (activeSlot !== slot) return null;
  const q = searchQuery.trim();
  const showSuggest = q.length >= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-0 right-0 top-full mt-2.5 z-[70] rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] max-h-[min(75vh,480px)] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80"
      onMouseDown={(e) => {
        e.preventDefault();
        cancelBlur();
      }}
      role="listbox"
      aria-label={t(language, 'searchAriaSuggestions')}
    >
      {/* Live Auto-Suggestions */}
      {showSuggest && (
        <div className="p-3">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              {t(language, 'searchQuickResults')}
            </span>
            {assist.suggestions.length > 0 && (
              <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-full">
                {assist.suggestions.length} {language === 'km' ? 'លទ្ធផល' : 'results'}
              </span>
            )}
          </div>

          {assist.loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              <span className="text-xs">{language === 'km' ? 'កំពុងស្វែងរក...' : 'Searching products...'}</span>
            </div>
          ) : assist.suggestions.length === 0 ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {language === 'km' ? `រកមិនឃើញ "${q}" ទេ` : `No results found for "${q}"`}
              </p>
              <p className="text-[11px] text-slate-400">
                {language === 'km' ? 'សូមសាកល្បងពាក្យគន្លឹះផ្សេងទៀត' : 'Try searching with different keywords'}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {assist.suggestions.map((item: SearchSuggestion) => (
                <li key={item.id}>
                  <Link
                    href={`/products/${item.slug}`}
                    className="flex items-center gap-3 rounded-2xl p-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-all duration-150 group"
                    onClick={() => {
                      addRecentSearch(item.name);
                      assist.refreshRecent();
                    }}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-200" sizes="48px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-400">SH</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.brand && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                            {item.brand}
                          </span>
                        )}
                        <span className="text-xs font-extrabold text-primary-600 dark:text-primary-400">
                          {formatPrice(item.price, language)}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0 mr-1" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:shadow-md hover:shadow-primary-500/25 active:scale-[0.99] transition-all"
            onClick={() => goToResults(q)}
          >
            <span>{t(language, 'searchSeeAllResults')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recent Searches */}
      {assist.recent.length > 0 && (
        <div className="p-3.5 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {t(language, 'searchRecent')}
            </span>
            <button
              type="button"
              onClick={handleClearAllRecent}
              className="text-[10px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 flex items-center gap-1 transition-colors"
              title="Clear search history"
            >
              <Trash2 className="w-3 h-3" />
              <span>{language === 'km' ? 'លុបប្រវត្តិ' : 'Clear'}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {assist.recent.map((term) => (
              <button
                key={term}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-primary-50 hover:text-primary-600 dark:bg-slate-800 dark:hover:bg-primary-950/50 dark:hover:text-primary-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60 transition-all cursor-pointer active:scale-95"
                onClick={() => goToResults(term)}
              >
                <Search className="w-3 h-3 text-slate-400 opacity-70" />
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending / Popular Products */}
      {assist.trending.length > 0 && (
        <div className="p-3.5 space-y-2">
          <span className="flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            {t(language, 'searchTrending')}
          </span>
          <ul className="space-y-1">
            {assist.trending.slice(0, 4).map((p, idx) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.slug}`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-2.5 py-2 text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                      idx === 0
                        ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                        : idx === 1
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="truncate font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {p.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-primary-600 dark:text-primary-400">
                    {formatPrice(p.price, language)}
                  </span>
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
    handleClear,
  } = useSearchCtx();

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 max-w-lg hidden md:flex ml-6 lg:ml-8"
      role="search"
      aria-label={t(language, 'searchPlaceholder')}
    >
      <div className="relative w-full" onFocus={() => openPanel('desktop')} onBlur={scheduleClose}>
        <div className="relative w-full flex items-center group">
          {/* Left Search Icon */}
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 transition-colors" />

          {/* Search Input Box */}
          <input
            type="search"
            name="search"
            autoComplete="off"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(language, 'searchPlaceholder')}
            className="w-full pl-11 pr-20 py-2.5 text-xs sm:text-sm font-medium bg-slate-100/90 hover:bg-slate-100 focus:bg-white dark:bg-[#111827] dark:hover:bg-[#162032] dark:focus:bg-[#0B0F17] border border-slate-200/90 dark:border-slate-800/90 focus:border-primary-500 dark:focus:border-primary-500 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15 shadow-2xs transition-all duration-200"
          />

          {/* Right Action Icons: Clear Button + Search Button */}
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-sm hover:shadow-md hover:shadow-primary-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              aria-label={language === 'km' ? 'ស្វែងរក' : language === 'zh' ? '搜索' : 'Search'}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          <DropdownPanel slot="desktop" />
        </AnimatePresence>
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
    handleClear,
  } = useSearchCtx();

  return (
    <div className="pb-2 md:hidden">
      <form onSubmit={handleSubmit} role="search" aria-label={t(language, 'searchPlaceholder')}>
        <div className="relative" onFocus={() => openPanel('mobile')} onBlur={scheduleClose}>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            name="search"
            autoComplete="off"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(language, 'searchPlaceholder')}
            className="w-full min-h-[42px] pl-10 pr-20 py-2 text-xs sm:text-sm font-medium bg-slate-100 dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              className="flex h-7.5 w-7.5 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-xs active:scale-95 transition-all"
              aria-label={language === 'km' ? 'ស្វែងរក' : language === 'zh' ? '搜索' : 'Search'}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            <DropdownPanel slot="mobile" />
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
