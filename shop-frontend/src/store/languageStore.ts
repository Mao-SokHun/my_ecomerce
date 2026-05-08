import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppLanguage } from '@/lib/i18n';

interface LanguageState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'km',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'language-storage' }
  )
);

