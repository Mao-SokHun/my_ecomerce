'use client';

import { useState, useEffect } from 'react';
import { productApi } from '@/lib/api';
import type { AppLanguage } from '@/lib/i18n';
import type { Product } from '@/types';
import { getRecentSearches } from '@/lib/recentSearches';

export type SearchSuggestion = {
  id: string;
  name: string;
  slug: string;
  thumbnail?: string | null;
  price: number;
  brand?: string | null;
};

export function useNavbarSearchAssist(searchQuery: string, language: AppLanguage) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  useEffect(() => {
    let cancelled = false;
    productApi
      .getAll({ limit: 6, sort: 'soldCount', order: 'desc', lang: language })
      .then(({ data }) => {
        if (cancelled) return;
        const body = data as { data?: Product[] };
        setTrending(Array.isArray(body?.data) ? body.data : []);
      })
      .catch(() => {
        if (!cancelled) setTrending([]);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      productApi
        .suggest({ q, limit: 8, lang: language })
        .then(({ data }) => {
          const rows = (data as { data?: SearchSuggestion[] })?.data;
          setSuggestions(Array.isArray(rows) ? rows : []);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 260);
    return () => clearTimeout(t);
  }, [searchQuery, language]);

  const refreshRecent = () => setRecent(getRecentSearches());

  return { suggestions, loading, trending, recent, refreshRecent };
}
