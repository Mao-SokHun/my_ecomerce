import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/lib/api';
import { getOptionalBrowserGeolocation } from '@/lib/geolocation';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthChecked: boolean;

  login: (identifier: string, password: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  loginWithTelegram: (telegramData: {
    id: number | string;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date?: number | string;
    hash?: string;
  }) => Promise<void>;
  loginWithTelegramCode: (target: string, code: string) => Promise<void>;
  setAuthData: (user: User, token: string, refreshToken?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (name: string, email: string | undefined, phone: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  fetchUser: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

function saveTokens(token: string, refreshToken?: string) {
  localStorage.setItem('token', token);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      isAuthChecked: false,

      login: async (identifier, password) => {
        set({ isLoading: true });
        try {
          const geo = await getOptionalBrowserGeolocation();
          const { data } = await authApi.login({
            identifier,
            password,
            ...(geo ? { clientLatitude: geo.latitude, clientLongitude: geo.longitude } : {}),
          });
          const { user, token, refreshToken } = data.data;
          saveTokens(token, refreshToken);
          set({ user, token, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false, isAuthChecked: true });
          try {
            const me = await authApi.getMe();
            if (me.data?.data) set({ user: me.data.data });
          } catch {
            /* keep login payload */
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithFacebook: async (accessToken) => {
        set({ isLoading: true });
        try {
          const geo = await getOptionalBrowserGeolocation();
          const { data } = await authApi.facebookLogin({
            accessToken,
            ...(geo ? { clientLatitude: geo.latitude, clientLongitude: geo.longitude } : {}),
          });
          const { user, token, refreshToken } = data.data;
          saveTokens(token, refreshToken);
          set({ user, token, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false, isAuthChecked: true });
          try {
            const me = await authApi.getMe();
            if (me.data?.data) set({ user: me.data.data });
          } catch {
            /* keep login payload */
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithTelegram: async (telegramData) => {
        set({ isLoading: true });
        try {
          const geo = await getOptionalBrowserGeolocation();
          const { data } = await authApi.telegramLogin({
            ...telegramData,
            ...(geo ? { clientLatitude: geo.latitude, clientLongitude: geo.longitude } : {}),
          });
          const { user, token, refreshToken } = data.data;
          saveTokens(token, refreshToken);
          set({ user, token, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false, isAuthChecked: true });
          try {
            const me = await authApi.getMe();
            if (me.data?.data) set({ user: me.data.data });
          } catch {
            /* keep login payload */
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithTelegramCode: async (target: string, code: string) => {
        set({ isLoading: true });
        try {
          const geo = await getOptionalBrowserGeolocation();
          const { data } = await authApi.verifyTelegramLoginCode({
            target,
            code,
            ...(geo ? { clientLatitude: geo.latitude, clientLongitude: geo.longitude } : {}),
          });
          const { user, token, refreshToken } = data.data;
          saveTokens(token, refreshToken);
          set({ user, token, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false, isAuthChecked: true });
          try {
            const me = await authApi.getMe();
            if (me.data?.data) set({ user: me.data.data });
          } catch {
            /* keep login payload */
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setAuthData: async (user: User, token: string, refreshToken?: string) => {
        saveTokens(token, refreshToken);
        set({ user, token, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false, isAuthChecked: true });
        try {
          const me = await authApi.getMe();
          if (me.data?.data) set({ user: me.data.data });
        } catch {
          /* keep */
        }
      },

      loginWithGoogle: async (credential) => {
        set({ isLoading: true });
        try {
          const geo = await getOptionalBrowserGeolocation();
          const { data } = await authApi.googleLogin({
            credential,
            ...(geo ? { clientLatitude: geo.latitude, clientLongitude: geo.longitude } : {}),
          });
          const { user, token, refreshToken } = data.data;
          saveTokens(token, refreshToken);
          set({ user, token, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false, isAuthChecked: true });
          try {
            const me = await authApi.getMe();
            if (me.data?.data) set({ user: me.data.data });
          } catch {
            /* keep login payload */
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name, email, phone, password) => {
        set({ isLoading: true });
        try {
          const geo = await getOptionalBrowserGeolocation();
          const { data } = await authApi.register({
            name,
            email,
            phone,
            password,
            ...(geo ? { clientLatitude: geo.latitude, clientLongitude: geo.longitude } : {}),
          });
          const { user, token, refreshToken } = data.data;
          saveTokens(token, refreshToken);
          set({ user, token, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false, isAuthChecked: true });
          try {
            const me = await authApi.getMe();
            if (me.data?.data) set({ user: me.data.data });
          } catch {
            /* keep register payload */
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        clearTokens();
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isAuthChecked: true });
      },

      updateUser: (userData) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, ...userData } });
        }
      },

      refreshAccessToken: async () => {
        const rt = get().refreshToken || localStorage.getItem('refreshToken');
        if (!rt) return false;
        try {
          const { data } = await authApi.refreshToken(rt);
          const { token, refreshToken: newRt } = data.data;
          saveTokens(token, newRt);
          set({ token, refreshToken: newRt || rt });
          return true;
        } catch {
          clearTokens();
          set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isAuthChecked: true });
          return false;
        }
      },

      fetchUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false, isAuthChecked: true });
          return;
        }
        try {
          const { data } = await authApi.getMe();
          set({ user: data.data, token, isAuthenticated: true, isAuthChecked: true });
        } catch (error: unknown) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401) {
            const refreshed = await get().refreshAccessToken();
            if (refreshed) {
              try {
                const { data } = await authApi.getMe();
                set({ user: data.data, isAuthenticated: true, isAuthChecked: true });
                return;
              } catch {
                /* fall through to logout */
              }
            }
            clearTokens();
            set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isAuthChecked: true });
            return;
          }
          set({ isAuthChecked: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          useAuthStore.setState({ isAuthChecked: true });
        }
      },
    }
  )
);
