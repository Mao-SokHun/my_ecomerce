import { create } from 'zustand';
import { authApi } from '@/lib/api';
import { tokenStorage } from '@/lib/storage';
import type { User } from '@/types';

type State = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReady: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
};

export const useAuthStore = create<State>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isReady: false,

  bootstrap: async () => {
    const token = await tokenStorage.getToken();
    if (!token) {
      set({ isReady: true });
      return;
    }
    try {
      const { data } = await authApi.getMe();
      set({ user: data.data, isAuthenticated: true, isReady: true });
    } catch {
      await tokenStorage.clear();
      set({ isReady: true });
    }
  },

  login: async (identifier, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login({ identifier, password });
      const { user, token, refreshToken } = data.data;
      await tokenStorage.setTokens(token, refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  register: async (name, phone, password, email) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.register({ name, phone, password, email });
      const { user, token, refreshToken } = data.data;
      await tokenStorage.setTokens(token, refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    await tokenStorage.clear();
    set({ user: null, isAuthenticated: false });
  },
}));
