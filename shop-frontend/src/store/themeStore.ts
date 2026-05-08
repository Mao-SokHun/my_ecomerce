import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggleTheme: () =>
        set((state) => {
          const newDark = !state.isDark;
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', newDark);
          }
          return { isDark: newDark };
        }),
      setTheme: (dark) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', dark);
        }
        set({ isDark: dark });
      },
    }),
    { name: 'theme-storage' }
  )
);
