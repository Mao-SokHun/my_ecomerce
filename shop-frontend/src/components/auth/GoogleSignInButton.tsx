'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import toast from 'react-hot-toast';
import axios from 'axios';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google script load failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SCRIPT;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google script load failed'));
    document.body.appendChild(s);
  });
}

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

type Props = { redirectTo: string };

export function GoogleSignInButton({ redirectTo }: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const { loginWithGoogle } = useAuthStore();
  const router = useRouter();
  const { language } = useLanguageStore();
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  const onCredential = useCallback(
    async (credential: string) => {
      setLoading(true);
      try {
        await loginWithGoogle(credential);
        toast.success(t(language, 'googleLoginSuccess'));
        router.push(redirectTo);
      } catch (error: unknown) {
        const msg = axios.isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)?.message
          : undefined;
        toast.error(msg || t(language, 'googleLoginFailed'));
      } finally {
        setLoading(false);
      }
    },
    [language, loginWithGoogle, redirectTo, router]
  );

  const credentialRef = useRef(onCredential);
  credentialRef.current = onCredential;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const init = async () => {
      try {
        await loadGisScript();
        if (cancelled || !window.google?.accounts?.id) return;
        if (!initializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (res) => {
              if (res?.credential) void credentialRef.current(res.credential);
            },
          });
          initializedRef.current = true;
        }
      } catch {
        /* ignore */
      }
    };

    void init();
    return () => { cancelled = true; };
  }, [clientId]);

  const handleClick = useCallback(async () => {
    if (!clientId || loading) return;

    if (!window.google?.accounts?.id) {
      await loadGisScript();
      if (!window.google?.accounts?.id) {
        toast.error(t(language, 'googleLoginFailed'));
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => {
          if (res?.credential) void credentialRef.current(res.credential);
        },
      });
    }

    window.google.accounts.id.prompt();
  }, [clientId, loading, language]);

  if (!clientId) return null;

  const label = loading
    ? (language === 'km' ? 'កំពុងចូល...' : language === 'zh' ? '登录中...' : 'Signing in...')
    : (language === 'km' ? 'បន្តជាមួយ Google' : language === 'zh' ? '使用 Google 继续' : 'Continue with Google');

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-gray-200
                 bg-white text-gray-700 font-medium text-sm
                 hover:bg-gray-50 hover:shadow-sm hover:border-gray-300
                 active:bg-gray-100
                 dark:bg-surface-800 dark:border-surface-700 dark:text-gray-200
                 dark:hover:bg-surface-700 dark:hover:border-surface-600
                 transition-all duration-200 disabled:opacity-60"
    >
      <GoogleLogo />
      {label}
    </button>
  );
}
