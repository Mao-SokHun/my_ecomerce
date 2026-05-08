import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppLanguage } from '@/lib/i18n';

interface AdminLanguageState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
}

/**
 * Admin-only language state.
 * Kept separate from user storefront language to avoid side effects
 * on customer-facing pages and role-related flows.
 */
export const useAdminLanguageStore = create<AdminLanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'admin-language-storage' }
  )
);

