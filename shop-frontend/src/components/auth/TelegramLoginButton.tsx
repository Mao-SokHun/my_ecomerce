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

type Props = { redirectTo: string };

export function TelegramLoginButton({ redirectTo }: Props) {
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
          router.push(redirectTo);
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
    [language, loginWithTelegram, redirectTo, router]
  );

  useEffect(() => {
    window.onTelegramAuth = (user) => {
      handleTelegramAuth(user);
    };

    return () => {
      delete window.onTelegramAuth;
    };
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

    // Check if official iframe button inside container can be triggered
    const iframe = widgetContainerRef.current?.querySelector('iframe');
    if (iframe) {
      iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

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
      if (event.origin !== 'https://oauth.telegram.org' && event.origin !== window.location.origin) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.event === 'auth_result' && data.result) {
          handleTelegramAuth(data.result);
          popup?.close();
          window.removeEventListener('message', handleMessage);
        }
      } catch {
        /* ignore parsing issues */
      }
    };

    window.addEventListener('message', handleMessage);
  };

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
