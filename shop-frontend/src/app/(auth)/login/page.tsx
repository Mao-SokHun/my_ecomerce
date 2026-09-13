'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/i18n';
import toast from 'react-hot-toast';
import axios from 'axios';
import { authApi } from '@/lib/api';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { FacebookLoginButton } from '@/components/auth/FacebookLoginButton';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';

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

function parseLoginFieldError(error: unknown, lang: AppLanguage): { identifier?: string; password?: string } {
  if (!axios.isAxiosError(error)) return {};
  const rawMessage = (error.response?.data as { message?: string } | undefined)?.message?.toLowerCase() || '';
  if (rawMessage.includes('phone/email')) {
    return {
      identifier:
        lang === 'km'
          ? 'អ៊ីមែល ឬ លេខទូរស័ព្ទមិនត្រឹមត្រូវ'
          : lang === 'zh'
            ? '邮箱或手机号不正确'
            : 'Email or phone is incorrect',
    };
  }
  if (rawMessage.includes('password')) {
    return {
      password:
        lang === 'km'
          ? 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ'
          : lang === 'zh'
            ? '密码不正确'
            : 'Password is incorrect',
    };
  }
  return {};
}

function LoginForm() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotMode, setForgotMode] = useState<'email' | 'info'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotName, setForgotName] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const { language } = useLanguageStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});
    const nextErrors: { identifier?: string; password?: string } = {};
    if (!form.identifier.trim()) {
      nextErrors.identifier =
        language === 'km'
          ? 'សូមបញ្ចូលអ៊ីមែល ឬ លេខទូរស័ព្ទ'
          : language === 'zh'
            ? '请输入邮箱或手机号'
            : 'Please enter email or phone';
    }
    if (!form.password.trim()) {
      nextErrors.password =
        language === 'km'
          ? 'សូមបញ្ចូលពាក្យសម្ងាត់'
          : language === 'zh'
            ? '请输入密码'
            : 'Please enter password';
    }
    if (nextErrors.identifier || nextErrors.password) {
      setFieldErrors(nextErrors);
      setSubmitError(
        language === 'km'
          ? 'សូមពិនិត្យ field ខាងក្រោម'
          : language === 'zh'
            ? '请检查下面的字段'
            : 'Please check the fields below'
      );
      return;
    }
    try {
      await login(form.identifier, form.password);
      toast.success(t(language, 'welcomeBack'));
      router.push(redirect);
    } catch (error: unknown) {
      const msg = loginErrorMessage(error, language);
      setFieldErrors(parseLoginFieldError(error, language));
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  const handleRequestResetCode = async () => {
    if (!forgotEmail.trim()) {
      toast.error(language === 'km' ? 'សូមបញ្ចូលអ៊ីមែលរបស់អ្នក' : 'Please enter your email');
      return;
    }
    setSendingCode(true);
    try {
      const res = await authApi.requestPasswordResetByEmail({ email: forgotEmail.trim() });
      const data = res.data as { devOtp?: string; emailSent?: boolean; message?: string };
      const devOtp = data?.devOtp;
      const emailSent = data?.emailSent;
      if (devOtp) {
        setForgotCode(devOtp);
        setOtpNotice(devOtp);
      }
      if (emailSent) {
        toast.success(
          language === 'km'
            ? 'បានផ្ញើកូដទៅកាន់ប្រអប់សំបុត្រ Email របស់អ្នកជោគជ័យ!'
            : language === 'zh'
              ? '验证码已成功发送到您的邮箱！'
              : 'Code successfully sent to your email inbox!'
        );
      } else {
        toast.success(
          language === 'km'
            ? `បានបង្កើតកូដផ្ទៀងផ្ទាត់: ${devOtp}`
            : language === 'zh'
              ? `验证码: ${devOtp}`
              : `Verification code: ${devOtp}`
        );
      }
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message : undefined;
      toast.error(msg || (language === 'km' ? 'ផ្ញើលេខកូដបរាជ័យ' : language === 'zh' ? '发送验证码失败' : 'Failed to send code'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleResetByEmailCode = async () => {
    if (!forgotEmail.trim() || !forgotCode.trim() || !forgotNewPassword) {
      toast.error(language === 'km' ? 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់' : 'Please fill in all fields');
      return;
    }
    setResettingPassword(true);
    try {
      await authApi.resetPasswordByEmailCode({
        email: forgotEmail.trim(),
        code: forgotCode.trim(),
        newPassword: forgotNewPassword,
      });
      toast.success(language === 'km' ? 'ប្ដូរពាក្យសម្ងាត់ជោគជ័យ' : language === 'zh' ? '密码重置成功' : 'Password reset successful');
      setForgotOpen(false);
      setForgotCode('');
      setForgotNewPassword('');
      setOtpNotice(null);
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message : undefined;
      toast.error(msg || (language === 'km' ? 'លេខកូដមិនត្រឹមត្រូវ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវតាមលក្ខខណ្ឌ' : language === 'zh' ? '验证码或新密码不正确' : 'Invalid code or password format'));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResetByInfo = async () => {
    try {
      await authApi.resetPasswordByInfo({
        name: forgotName.trim(),
        phone: forgotPhone.trim(),
        newPassword: forgotNewPassword,
      });
      toast.success(language === 'km' ? 'ប្ដូរពាក្យសម្ងាត់ជោគជ័យ' : language === 'zh' ? '密码重置成功' : 'Password reset successful');
      setForgotOpen(false);
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message : undefined;
      toast.error(msg || (language === 'km' ? 'ព័ត៌មានមិនត្រឹមត្រូវ' : language === 'zh' ? '信息不正确' : 'Provided information is incorrect'));
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {language === 'km' ? 'អ៊ីមែល ឬ លេខទូរស័ព្ទ' : language === 'zh' ? '邮箱或手机号' : 'Email or phone'}
            </label>
            <input
              type="text"
              value={form.identifier}
              onChange={(e) => {
                setSubmitError(null);
                setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                setForm((p) => ({ ...p, identifier: e.target.value }));
              }}
              placeholder={language === 'km' ? 'you@example.com ឬ 012345678' : language === 'zh' ? 'you@example.com 或 012345678' : 'you@example.com or 012345678'}
              autoFocus
              className={`input ${fieldErrors.identifier ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : ''}`}
            />
            {fieldErrors.identifier && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.identifier}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t(language, 'password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => {
                  setSubmitError(null);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  setForm((p) => ({ ...p, password: e.target.value }));
                }}
                placeholder="••••••••"
                className={`input pr-10 ${fieldErrors.password ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
            <LogIn className="w-4 h-4" />
            {isLoading ? t(language, 'signingIn') : t(language, 'signIn')}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-surface-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-surface-900 px-3 text-gray-400 font-medium">
              {language === 'km' ? 'ឬ ចូលតាមរយៈ' : language === 'zh' ? '或使用社交账号登录' : 'or continue with'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 w-full [&>*]:flex-1">
          <TelegramLoginButton redirectTo={redirect} variant="icon" />
          <FacebookLoginButton redirectTo={redirect} variant="icon" />
          <GoogleSignInButton redirectTo={redirect} variant="icon" />
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          {t(language, 'dontHaveAccount')}{' '}
          <Link href="/register" className="text-primary-600 font-semibold hover:underline">{t(language, 'signUp')}</Link>
        </p>
        <button
          type="button"
          onClick={() => setForgotOpen(true)}
          className="w-full mt-3 text-sm text-primary-600 hover:underline"
        >
          {language === 'km' ? 'ភ្លេចពាក្យសម្ងាត់?' : language === 'zh' ? '忘记密码？' : 'Forgot password?'}
        </button>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="card p-5 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {language === 'km' ? 'កំណត់ពាក្យសម្ងាត់ឡើងវិញ' : language === 'zh' ? '重置密码' : 'Reset password'}
              </h3>
              <button type="button" onClick={() => { setForgotOpen(false); setOtpNotice(null); }} className="text-gray-500">✕</button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForgotMode('email')} className={`px-3 py-1.5 rounded-lg text-sm ${forgotMode === 'email' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-surface-800'}`}>
                {language === 'km' ? 'ផ្ទៀងផ្ទាត់តាមអ៊ីមែល' : language === 'zh' ? '邮箱验证' : 'Verify by email'}
              </button>
              <button type="button" onClick={() => setForgotMode('info')} className={`px-3 py-1.5 rounded-lg text-sm ${forgotMode === 'info' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-surface-800'}`}>
                {language === 'km' ? 'ផ្ទៀងផ្ទាត់តាមព័ត៌មាន' : language === 'zh' ? '信息验证' : 'Verify by information'}
              </button>
            </div>

            {forgotMode === 'email' ? (
              <div className="space-y-2.5">
                <input
                  type="email"
                  className="input"
                  placeholder="Email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={sendingCode || resettingPassword}
                />
                <div className="flex gap-2">
                  <input
                    className="input flex-1 font-mono font-bold tracking-wider"
                    placeholder={language === 'km' ? 'លេខកូដ ៦ ខ្ទង់' : language === 'zh' ? '6位数验证码' : '6-digit code'}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value)}
                    maxLength={8}
                    disabled={resettingPassword}
                  />
                  <button
                    type="button"
                    onClick={handleRequestResetCode}
                    disabled={sendingCode || !forgotEmail.trim()}
                    className="btn-secondary text-xs sm:text-sm font-semibold shrink-0 disabled:opacity-60"
                  >
                    {sendingCode
                      ? (language === 'km' ? 'កំពុងផ្ញើ...' : 'Sending...')
                      : (language === 'km' ? 'ផ្ញើកូដ' : language === 'zh' ? '发送验证码' : 'Send code')}
                  </button>
                </div>

                {otpNotice && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between font-bold">
                      <span>{language === 'km' ? '🔑 លេខកូដផ្ទៀងផ្ទាត់ OTP:' : '🔑 Verification OTP:'}</span>
                      <span className="font-mono text-sm tracking-widest bg-white dark:bg-surface-800 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 text-emerald-600 dark:text-emerald-400">
                        {otpNotice}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-1">
                      {language === 'km'
                        ? 'ប្រព័ន្ធបានបំពេញកូដនេះដោយស្វ័យប្រវត្តិ។ (សម្រាប់ការផ្ញើអ៊ីមែលពិតប្រាកដចូល Gmail Inbox សូមកំណត់ SMTP_PASS ឬ RESEND_API_KEY)'
                        : 'Code auto-filled. (For real delivery to Gmail, configure SMTP_PASS or RESEND_API_KEY in backend)'}
                    </p>
                  </div>
                )}
                <div>
                  <input
                    type="password"
                    className="input"
                    placeholder={language === 'km' ? 'ពាក្យសម្ងាត់ថ្មី' : language === 'zh' ? '新密码' : 'New password'}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    disabled={resettingPassword}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {language === 'km'
                      ? 'ពាក្យសម្ងាត់យ៉ាងតិច ៨ ខ្ទង់ (អក្សរធំ តូច លេខ និងសញ្ញាពិសេស)'
                      : 'Min 8 chars with uppercase, lowercase, number & symbol'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetByEmailCode}
                  disabled={resettingPassword || !forgotEmail.trim() || !forgotCode.trim() || !forgotNewPassword}
                  className="btn-primary w-full disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {resettingPassword ? (
                    <span>{language === 'km' ? 'កំពុងប្ដូរ...' : 'Updating...'}</span>
                  ) : (
                    <span>{language === 'km' ? 'ប្ដូរពាក្យសម្ងាត់' : language === 'zh' ? '重置密码' : 'Reset password'}</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input className="input" placeholder={language === 'km' ? 'ឈ្មោះ' : language === 'zh' ? '姓名' : 'Name'} value={forgotName} onChange={(e) => setForgotName(e.target.value)} />
                <input className="input" placeholder={language === 'km' ? 'លេខទូរស័ព្ទ' : language === 'zh' ? '手机号' : 'Phone'} value={forgotPhone} onChange={(e) => setForgotPhone(e.target.value)} />
                <input
                  type="password"
                  className="input"
                  placeholder={language === 'km' ? 'ពាក្យសម្ងាត់ថ្មី' : language === 'zh' ? '新密码' : 'New password'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                />
                <button type="button" onClick={handleResetByInfo} className="btn-primary w-full">
                  {language === 'km' ? 'ប្ដូរពាក្យសម្ងាត់' : language === 'zh' ? '重置密码' : 'Reset password'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
