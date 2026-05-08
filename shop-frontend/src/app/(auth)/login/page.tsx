'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Facebook, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/i18n';
import toast from 'react-hot-toast';
import axios from 'axios';

function loginErrorMessage(error: unknown, lang: AppLanguage): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return t(lang, 'loginRequestTimeout');
    if (!error.response) return t(lang, 'loginCannotReachServer');
    const status = error.response.status;
    if (status === 401) return t(lang, 'loginInvalidCredentials');
    const msg = (error.response.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
    return t(lang, 'loginFailed');
  }
  return t(lang, 'loginFailed');
}

function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { login, loginWithFacebook, isLoading } = useAuthStore();
  const { language } = useLanguageStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      await login(form.email, form.password);
      toast.success(t(language, 'welcomeBack'));
      router.push(redirect);
    } catch (error: unknown) {
      const msg = loginErrorMessage(error, language);
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  const handleFacebookLogin = async () => {
    const token = window.prompt(t(language, 'pasteFacebookToken'));
    if (!token) return;
    try {
      await loginWithFacebook(token.trim());
      toast.success(t(language, 'facebookLoginSuccess'));
      router.push(redirect);
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(msg || t(language, 'facebookLoginFailed'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t(language, 'welcomeBack')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t(language, 'signInToContinue')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t(language, 'emailAddress')}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => {
                setSubmitError(null);
                setForm((p) => ({ ...p, email: e.target.value }));
              }}
              placeholder="you@example.com"
              required
              autoFocus
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t(language, 'password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => {
                  setSubmitError(null);
                  setForm((p) => ({ ...p, password: e.target.value }));
                }}
                placeholder="••••••••"
                required
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
            <LogIn className="w-4 h-4" />
            {isLoading ? t(language, 'signingIn') : t(language, 'signIn')}
          </button>
        </form>
        <button type="button" onClick={handleFacebookLogin} className="btn-secondary w-full py-3 mt-3">
          <Facebook className="w-4 h-4" />
          {t(language, 'continueWithFacebook')}
        </button>

        {/* Demo credentials */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-surface-800 rounded-xl text-xs text-gray-500">
          <p className="font-medium mb-1">{t(language, 'demoAccounts')}</p>
          <p>{t(language, 'demoUser')}: user@shop.com / User@12345</p>
          <p>{t(language, 'demoAdmin')}: admin@shop.com / Admin@12345</p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          {t(language, 'dontHaveAccount')}{' '}
          <Link href="/register" className="text-primary-600 font-semibold hover:underline">{t(language, 'signUp')}</Link>
        </p>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md"><div className="card p-8 animate-pulse h-96" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
