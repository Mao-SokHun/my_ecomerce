'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  Send,
  X,
  QrCode,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Info,
  Smartphone,
} from 'lucide-react';

interface TelegramAuthWidgetUser {
  id: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: string | number;
  hash?: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthWidgetUser) => void;
  }
}

interface TelegramLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export function TelegramLoginModal({
  isOpen,
  onClose,
  redirectTo = '/',
}: TelegramLoginModalProps) {
  const { language } = useLanguageStore();
  const { loginWithTelegram, loginWithTelegramCode, setAuthData } = useAuthStore();

  const botUsername = (
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'new_user_sh_shop_bot'
  ).trim().replace(/^@/, '');

  // Tab: 'bot' | 'otp' | 'widget'
  const [activeTab, setActiveTab] = useState<'bot' | 'otp' | 'widget'>('bot');

  // Bot Session state
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    botDeepLink: string;
    botAppDeepLink: string;
  } | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'authorized'>('idle');

  // OTP State
  const [otpTarget, setOtpTarget] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Widget container ref
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const isWidgetLoadedRef = useRef(false);

  // Complete Login handler
  const handleLoginSuccess = useCallback(() => {
    toast.success(t(language, 'telegramLoginSuccess') || 'Telegram login successful');
    onClose();
    const target = redirectTo && redirectTo !== '/login' ? redirectTo : '/';
    window.location.href = target;
  }, [language, onClose, redirectTo]);

  // Direct Auth callback (for Widget & Telegram postMessage)
  const handleTelegramAuth = useCallback(
    async (userData: {
      id: number | string;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date?: number | string;
      hash?: string;
    }) => {
      try {
        await loginWithTelegram(userData);
        handleLoginSuccess();
      } catch (error: unknown) {
        const msg = axios.isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)?.message
          : undefined;
        toast.error(msg || t(language, 'telegramLoginFailed') || 'Telegram login failed');
      }
    },
    [handleLoginSuccess, language, loginWithTelegram]
  );

  // Bind global callback
  useEffect(() => {
    window.onTelegramAuth = (user) => {
      void handleTelegramAuth(user);
    };
    return () => {
      delete window.onTelegramAuth;
    };
  }, [handleTelegramAuth]);

  // 1. Initialize Bot Login Session
  const initBotSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const { data } = await authApi.createTelegramSession();
      if (data?.success && data?.data) {
        setSessionData(data.data);
        setPollingStatus('polling');
      }
    } catch (error) {
      console.error('Failed to create Telegram session:', error);
      toast.error('Failed to initialize Telegram session');
    } finally {
      setSessionLoading(false);
    }
  }, []);

  // Initialize session when modal opens on 'bot' tab
  useEffect(() => {
    if (isOpen && activeTab === 'bot' && !sessionData) {
      void initBotSession();
    }
  }, [isOpen, activeTab, sessionData, initBotSession]);

  // Poll session status
  useEffect(() => {
    if (!isOpen || pollingStatus !== 'polling' || !sessionData?.sessionId) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await authApi.checkTelegramSession(sessionData.sessionId);
        if (data?.status === 'authorized' && data?.data) {
          setPollingStatus('authorized');
          clearInterval(interval);
          const { user, token, refreshToken } = data.data;
          await setAuthData(user, token, refreshToken);
          handleLoginSuccess();
        } else if (data?.status === 'expired') {
          setPollingStatus('idle');
          clearInterval(interval);
        }
      } catch {
        /* ignore polling error */
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, pollingStatus, sessionData, setAuthData, handleLoginSuccess]);

  // 2. OTP Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = otpTarget.trim();
    if (!target) {
      toast.error(
        language === 'km'
          ? 'សូមបញ្ចូល Telegram Username ឬលេខសម្គាល់'
          : 'Please enter your Telegram Username or Chat ID'
      );
      return;
    }

    setOtpSending(true);
    try {
      const { data } = await authApi.sendTelegramLoginCode({ target });
      if (data?.success) {
        setOtpSent(true);
        setCountdown(60);
        toast.success(
          language === 'km'
            ? 'កូដ 6 ខ្ទង់ត្រូវបានផ្ញើទៅកាន់ Telegram របស់អ្នក!'
            : '6-digit verification code sent to your Telegram!'
        );
      }
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(msg || 'Failed to send verification code');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = otpTarget.trim();
    const code = otpCode.trim();
    if (!target || !code) return;

    setOtpVerifying(true);
    try {
      await loginWithTelegramCode(target, code);
      handleLoginSuccess();
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(msg || 'Invalid verification code');
    } finally {
      setOtpVerifying(false);
    }
  };

  // 3. Render Official Widget Script when Tab is 'widget'
  useEffect(() => {
    if (activeTab !== 'widget' || !widgetContainerRef.current) return;

    // Reset container
    widgetContainerRef.current.innerHTML = '';
    isWidgetLoadedRef.current = false;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'true');
    script.setAttribute('data-onauth', 'window.onTelegramAuth(user)');
    script.async = true;

    widgetContainerRef.current.appendChild(script);
    isWidgetLoadedRef.current = true;
  }, [activeTab, botUsername]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-surface-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-[#229ED9]/10 via-[#229ED9]/5 to-transparent border-b border-gray-100 dark:border-surface-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center shadow-md shadow-[#229ED9]/25 shrink-0">
              <Send className="w-5 h-5 ml-[-1px] mt-[1px]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-1.5">
                {language === 'km'
                  ? 'ចូលប្រើតាម Telegram'
                  : language === 'zh'
                  ? '使用 Telegram 登录'
                  : 'Sign in with Telegram'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                @{botUsername} • Fast & Secure
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex p-1 mt-4 bg-gray-100/80 dark:bg-surface-800 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('bot')}
              className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'bot'
                  ? 'bg-white dark:bg-surface-700 text-[#229ED9] font-bold shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'Bot ផ្ទាល់' : 'Telegram Bot'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('otp')}
              className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'otp'
                  ? 'bg-white dark:bg-surface-700 text-[#229ED9] font-bold shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'កូដ 6 ខ្ទង់' : 'OTP Code'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('widget')}
              className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'widget'
                  ? 'bg-white dark:bg-surface-700 text-[#229ED9] font-bold shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'Widget ផ្លូវការ' : 'Widget'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: Bot 1-Click / Deep Link */}
          {activeTab === 'bot' && (
            <div className="space-y-4 text-center">
              <div className="py-2">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#229ED9]/10 text-[#229ED9] flex items-center justify-center">
                  {sessionLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : pollingStatus === 'polling' ? (
                    <RefreshCw className="w-8 h-8 animate-spin text-[#229ED9]" />
                  ) : (
                    <Send className="w-8 h-8" />
                  )}
                </div>

                <h4 className="font-semibold text-gray-900 dark:text-white text-base">
                  {language === 'km'
                    ? 'ចុចដើម្បីបើកកម្មវិធី Telegram'
                    : 'Click to open in Telegram Bot'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                  {language === 'km'
                    ? 'ចុចប៊ូតុងខាងក្រោម រួចចុច Start ក្នុង Telegram ដើម្បីចូលប្រើប្រាស់ភ្លាមៗ'
                    : 'Tap the button below and click Start in Telegram to instantly authorize.'}
                </p>
              </div>

              {sessionData && (
                <div className="space-y-2.5">
                  <a
                    href={sessionData.botDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#229ED9] hover:bg-[#1E88C7] text-white font-medium shadow-md shadow-[#229ED9]/25 active:scale-[0.98] transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {language === 'km'
                        ? 'បើកក្នុង Telegram Bot'
                        : 'Open in Telegram App'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-surface-800 p-2.5 rounded-xl border border-gray-100 dark:border-surface-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#229ED9]" />
                    <span>
                      {language === 'km'
                        ? 'កំពុងរង់ចាំការបញ្ជាក់ក្នុង Telegram...'
                        : 'Waiting for confirmation in Telegram...'}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={initBotSession}
                  className="text-xs text-[#229ED9] hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {language === 'km' ? 'បង្កើតតំណថ្មី (Refresh Link)' : 'Generate new link'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 6-Digit OTP Code */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {language === 'km'
                  ? 'បញ្ចូល Telegram Username ឬ Chat ID ដើម្បីទទួលកូដសម្ងាត់ 6 ខ្ទង់តាម Bot'
                  : 'Enter your Telegram Username or Chat ID to receive a 6-digit login code via Bot.'}
              </p>

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'km' ? 'Telegram Username / Chat ID' : 'Telegram Username or ID'}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-semibold text-sm">
                        @
                      </span>
                      <input
                        type="text"
                        value={otpTarget}
                        onChange={(e) => setOtpTarget(e.target.value)}
                        placeholder="your_username (or 855974944390)"
                        className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#229ED9]/50"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={otpSending || !otpTarget.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#229ED9] hover:bg-[#1E88C7] text-white text-sm font-medium shadow-md shadow-[#229ED9]/25 disabled:opacity-50 transition-all"
                  >
                    {otpSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {language === 'km' ? 'ផ្ញើកូដសម្ងាត់ (Send Code)' : 'Send 6-Digit Code'}
                    </span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div className="bg-blue-50/70 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#229ED9]" />
                    <div>
                      <span>
                        {language === 'km'
                          ? `កូដសម្ងាត់ត្រូវបានផ្ញើទៅកាន់ @${otpTarget}`
                          : `Code sent to @${otpTarget}. Check your Telegram chat.`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'km' ? 'លេខកូដ 6 ខ្ទង់' : '6-Digit Code'}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.5em] text-lg font-bold py-2.5 rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#229ED9]/50"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpVerifying || otpCode.trim().length !== 6}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#229ED9] hover:bg-[#1E88C7] text-white text-sm font-medium shadow-md shadow-[#229ED9]/25 disabled:opacity-50 transition-all"
                  >
                    {otpVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {language === 'km' ? 'ផ្ទៀងផ្ទាត់ & ចូលប្រើ' : 'Verify & Sign In'}
                    </span>
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {language === 'km' ? '← ប្តូរគណនី' : '← Change Account'}
                    </button>

                    <button
                      type="button"
                      disabled={countdown > 0 || otpSending}
                      onClick={() => handleSendOtp()}
                      className="text-[#229ED9] hover:underline disabled:opacity-50"
                    >
                      {countdown > 0
                        ? `${countdown}s`
                        : language === 'km'
                        ? 'ផ្ញើកូដម្តងទៀត'
                        : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: Official Telegram Widget */}
          {activeTab === 'widget' && (
            <div className="space-y-4 text-center py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'km'
                  ? 'ប្រើប្រាស់ Telegram Login Widget ផ្លូវការរបស់ Telegram'
                  : 'Use official Telegram Login Widget provided by Telegram API.'}
              </p>

              <div className="flex items-center justify-center min-h-[50px] p-4 bg-gray-50 dark:bg-surface-800 rounded-xl border border-gray-100 dark:border-surface-700">
                <div ref={widgetContainerRef} className="flex justify-center" />
              </div>

              <div className="bg-amber-50/70 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800/40 text-left text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <p>
                  {language === 'km'
                    ? 'ប្រសិនបើ Widget មិនបង្ហាញ ឬប្រាប់ថា "Bot domain invalid" សូមជ្រើសយកផ្ទាំង "Bot ផ្ទាល់" ឬ "កូដ 6 ខ្ទង់" នៅខាងលើ។'
                    : 'If the widget shows "Bot domain invalid", please use the "Telegram Bot" or "OTP Code" tab above.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-gray-50/80 dark:bg-surface-800/60 border-t border-gray-100 dark:border-surface-800 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            <span>End-to-End Encrypted</span>
          </span>
          <span>SH-Shop Authentication</span>
        </div>
      </div>
    </div>
  );
}
