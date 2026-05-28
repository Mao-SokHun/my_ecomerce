import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage } from '@/lib/i18n';

type State = {
  language: AppLanguage;
  hydrated: boolean;
  setLanguage: (lang: AppLanguage) => void;
  hydrate: () => Promise<void>;
};

export const useLanguageStore = create<State>((set) => ({
  language: 'km',
  hydrated: false,
  setLanguage: (language) => {
    set({ language });
    AsyncStorage.setItem('app_language', language).catch(() => {});
  },
  hydrate: async () => {
    try {
      const saved = await AsyncStorage.getItem('app_language');
      if (saved === 'km' || saved === 'en' || saved === 'zh') {
        set({ language: saved, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
