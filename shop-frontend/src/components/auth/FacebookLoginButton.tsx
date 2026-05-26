'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import toast from 'react-hot-toast';
import axios from 'axios';

const FB_SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';

function loadFbSdk(appId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.FB) return Promise.resolve();

  return new Promise((resolve) => {
    window.fbAsyncInit = () => {
      window.FB!.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v21.0',
      });
      resolve();
    };

    if (document.querySelector(`script[src="${FB_SDK_URL}"]`)) return;
    const script = document.createElement('script');
    script.src = FB_SDK_URL;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });
}

type Props = { redirectTo: string };

export function FacebookLoginButton({ redirectTo }: Props) {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim();
  const { loginWithFacebook } = useAuthStore();
  const router = useRouter();
  const { language } = useLanguageStore();
  const [loading, setLoading] = useState(false);
  const sdkReady = useRef(false);

  useEffect(() => {
    if (!appId) return;
    loadFbSdk(appId).then(() => {
      sdkReady.current = true;
    });
  }, [appId]);

  const handleClick = useCallback(async () => {
    if (!appId || loading) return;

    if (!sdkReady.current) {
      await loadFbSdk(appId);
      sdkReady.current = true;
    }

    if (!window.FB) {
      toast.error(t(language, 'facebookLoginFailed'));
      return;
    }

    setLoading(true);

    window.FB.login(
      (response) => {
        const token = response.authResponse?.accessToken;
        if (!token) {
          setLoading(false);
          return;
        }

        loginWithFacebook(token)
          .then(() => {
            toast.success(t(language, 'facebookLoginSuccess'));
            router.push(redirectTo);
          })
          .catch((error: unknown) => {
            const msg = axios.isAxiosError(error)
              ? (error.response?.data as { message?: string } | undefined)?.message
              : undefined;
            toast.error(msg || t(language, 'facebookLoginFailed'));
          })
          .finally(() => {
            setLoading(false);
          });
      },
      { scope: 'public_profile,email' }
    );
  }, [appId, loading, language, loginWithFacebook, redirectTo, router]);

  if (!appId) return null;

  const label = loading
    ? (language === 'km' ? 'កំពុងចូល...' : language === 'zh' ? '登录中...' : 'Signing in...')
    : (language === 'km' ? 'បន្តជាមួយ Facebook' : language === 'zh' ? '使用 Facebook 继续' : 'Continue with Facebook');

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-gray-200
                 bg-white text-gray-700 font-medium text-sm
                 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]
                 active:bg-[#166FE5]
                 dark:bg-surface-800 dark:border-surface-700 dark:text-gray-200
                 dark:hover:bg-[#1877F2] dark:hover:border-[#1877F2] dark:hover:text-white
                 transition-all duration-200 disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
      {label}
    </button>
  );
}
