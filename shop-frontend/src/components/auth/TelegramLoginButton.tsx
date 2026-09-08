'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Send, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    onTelegramAuth?: (user: {
      id: number | string;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date: number | string;
      hash: string;
    }) => void;
  }
}

type Props = {
  redirectTo: string;
  variant?: 'full' | 'compact' | 'icon';
};

export function TelegramLoginButton({ redirectTo, variant = 'full' }: Props) {
  const botUsername = (
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    'new_user_sh_shop_bot'
  ).trim().replace(/^@/, '');

  const botId = (
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID ||
    '8799740724'
  ).trim();

  const { loginWithTelegram } = useAuthStore();
  const router = useRouter();
  const { language } = useLanguageStore();
  const [loading, setLoading] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  const handleTelegramAuth = useCallback(
    (userData: {
      id: number | string;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date?: number | string;
      hash?: string;
    }) => {
      setLoading(true);
      loginWithTelegram(userData)
        .then(() => {
          toast.success(t(language, 'telegramLoginSuccess') || 'Telegram login successful');
          const target = redirectTo && redirectTo !== '/login' ? redirectTo : '/';
          window.location.href = target;
        })
        .catch((error: unknown) => {
          const msg = axios.isAxiosError(error)
            ? (error.response?.data as { message?: string } | undefined)?.message
            : undefined;
          toast.error(msg || t(language, 'telegramLoginFailed') || 'Telegram login failed');
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [language, loginWithTelegram, redirectTo]
  );

  useEffect(() => {
    window.onTelegramAuth = (user) => {
      handleTelegramAuth(user);
    };

    return () => {
      delete window.onTelegramAuth;
    };
  }, [handleTelegramAuth]);

  // Check URL hash fallback on mount if popup redirected
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return;
    try {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const tgAuthResult = params.get('tgAuthResult');
      if (tgAuthResult) {
        const decoded = JSON.parse(atob(tgAuthResult));
        if (decoded && decoded.id) {
          handleTelegramAuth(decoded);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    } catch {
      /* ignore */
    }
  }, [handleTelegramAuth]);

  // Load official script into hidden/background container for SDK initialization
  useEffect(() => {
    if (!botUsername || !widgetContainerRef.current) return;
    
    // Clear previous scripts
    widgetContainerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-onauth', 'window.onTelegramAuth(user)');
    script.async = true;

    widgetContainerRef.current.appendChild(script);
  }, [botUsername]);

  const handleDirectLogin = () => {
    if (loading) return;

    const width = 550;
    const height = 480;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authUrl = `https://oauth.telegram.org/auth?bot_id=${encodeURIComponent(botId)}&origin=${encodeURIComponent(
      window.location.origin
    )}&embed=1&request_access=write`;

    const popup = window.open(
      authUrl,
      'telegram_oauth',
      `width=${width},height=${height},top=${top},left=${left},toolbar=0,location=0,status=0,menubar=0`
    );

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('telegram.org') && event.origin !== window.location.origin) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        let userObj: any = null;
        if (data.event === 'auth_result' && data.result) {
          userObj = data.result;
        } else if (data.event === 'auth_user' && data.result) {
          userObj = data.result;
        } else if (data.id && (data.hash || data.auth_date)) {
          userObj = data;
        } else if (data.result && data.result.id) {
          userObj = data.result;
        }

        if (userObj) {
          handleTelegramAuth(userObj);
          popup?.close();
          window.removeEventListener('message', handleMessage);
        }
      } catch {
        /* ignore parsing issues */
      }
    };

    window.addEventListener('message', handleMessage);
  };

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={handleDirectLogin}
          disabled={loading}
          title="Telegram"
          aria-label="Telegram Login"
          className="w-full h-12 flex items-center justify-center rounded-xl border border-gray-200/80 bg-white
                     dark:bg-surface-800 dark:border-surface-700 text-[#229ED9]
                     hover:bg-[#229ED9]/10 hover:border-[#229ED9] hover:shadow-md hover:scale-[1.03]
                     active:scale-95 transition-all duration-200 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#229ED9]" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-sm">
              <Send className="w-3.5 h-3.5 ml-[-1px] mt-[1px]" />
            </div>
          )}
        </button>
        <div ref={widgetContainerRef} className="hidden" />
      </div>
    );
  }

  const label = loading
    ? (language === 'km' ? 'កំពុងចូល...' : language === 'zh' ? '登录中...' : 'Signing in...')
    : (language === 'km' ? 'បន្តជាមួយ Telegram' : language === 'zh' ? '使用 Telegram 继续' : 'Continue with Telegram');

  return (
    <div className="w-full relative space-y-1">
      <button
        type="button"
        onClick={handleDirectLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-[#229ED9]/40
                   bg-white text-gray-700 font-medium text-sm
                   hover:bg-[#229ED9] hover:text-white hover:border-[#229ED9]
                   active:bg-[#1E88C7]
                   dark:bg-surface-800 dark:border-surface-700 dark:text-gray-200
                   dark:hover:bg-[#229ED9] dark:hover:border-[#229ED9] dark:hover:text-white
                   transition-all duration-200 disabled:opacity-60 group shadow-sm"
      >
        <div className="w-5 h-5 rounded-full bg-[#229ED9] text-white flex items-center justify-center group-hover:bg-white group-hover:text-[#229ED9] transition-colors shrink-0">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3 ml-[-1px] mt-[1px]" />}
        </div>
        <span>{label}</span>
      </button>

      {/* Hidden widget container */}
      <div ref={widgetContainerRef} className="hidden" />
    </div>
  );
}
