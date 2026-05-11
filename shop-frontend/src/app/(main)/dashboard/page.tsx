'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi, uploadApi } from '@/lib/api';
import { User, Package, Heart, MapPin, Lock, MessageSquare, Pencil } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  DISPLAY_NAME_PATTERN,
  normalizeDisplayName,
  resolveToFullImageUrl,
  truncateText,
} from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';
import { t } from '@/lib/i18n';
import { useLanguageStore } from '@/store/languageStore';

export default function DashboardPage() {
  const { user, updateUser, fetchUser, isAuthenticated, isAuthChecked } = useAuthStore();
  const { language } = useLanguageStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', avatar: user?.avatar || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isAuthenticated) router.push('/login');
  }, [isAuthChecked, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthChecked || !isAuthenticated) return;
    void fetchUser();
  }, [isAuthChecked, isAuthenticated, fetchUser]);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
    });
  }, [user?.name, user?.phone, user?.avatar]);

  useEffect(() => {
    setEditingProfile(false);
    setEditingPassword(false);
  }, [activeTab]);

  if (!isAuthChecked || !isAuthenticated) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameNorm = normalizeDisplayName(profileForm.name);
    if (!nameNorm || !DISPLAY_NAME_PATTERN.test(nameNorm)) {
      toast.error(t(language, 'invalidNameLettersOnly'));
      return;
    }
    const phoneDigits = profileForm.phone.replace(/\D/g, '');
    if (phoneDigits && !/^\d{8,15}$/.test(phoneDigits)) {
      toast.error(t(language, 'invalidPhoneDigitsOnly'));
      return;
    }
    const rawAvatar = profileForm.avatar.trim();
    const avatar = rawAvatar ? resolveToFullImageUrl(rawAvatar) : '';
    const payload = { name: nameNorm, phone: phoneDigits, avatar };
    setSaving(true);
    try {
      const { data } = await authApi.updateProfile(payload);
      if (data?.data) updateUser(data.data);
      else updateUser(payload);
      setEditingProfile(false);
      toast.success(t(language, 'profileUpdated'));
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || t(language, 'updateFailed'));
    } finally { 
      setSaving(false); 
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t(language, 'passwordsDoNotMatch'));
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setEditingPassword(false);
      toast.success(t(language, 'passwordChanged'));
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || t(language, 'updateFailed'));
    } finally { 
      setSaving(false); 
    }
  };

  const resetProfileForm = () => {
    setProfileForm({
      name: user?.name || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
    });
  };

  const resetPasswordForm = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(
        language === 'km'
          ? 'រូបធំពេក (អតិបរមា 5MB)'
          : language === 'zh'
            ? '图片过大（最大 5MB）'
            : 'Image is too large (max 5MB)'
      );
      input.value = '';
      return;
    }
    setUploadingAvatar(true);
    try {
      const { data } = await uploadApi.uploadProductImage(file, 'avatars');
      const nextUrl = data?.data?.url || '';
      if (!nextUrl) throw new Error('No URL');
      setProfileForm((prev) => ({ ...prev, avatar: nextUrl }));
      toast.success(language === 'km' ? 'បានផ្ទុករូបភាព' : language === 'zh' ? '图片上传成功' : 'Image uploaded');
    } catch {
      toast.error(language === 'km' ? 'ផ្ទុករូបបរាជ័យ' : language === 'zh' ? '图片上传失败' : 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      input.value = '';
    }
  };

  const stats = [
    { icon: Package, label: t(language, 'statsOrders'), value: user?._count?.orders ?? 0, href: '/dashboard/orders', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { icon: Heart, label: t(language, 'statsWishlist'), value: user?._count?.wishlist ?? 0, href: '/dashboard/wishlist', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
    { icon: User, label: t(language, 'statsReviews'), value: user?._count?.reviews ?? 0, href: '/dashboard/reviews', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { icon: MapPin, label: t(language, 'statsAddresses'), value: user?._count?.addresses ?? 0, href: '/dashboard/addresses', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t(language, 'myAccount')}</h1>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5 text-center">
            <UserAvatar name={user?.name || ''} src={user?.avatar} size="md" className="mx-auto mb-3" />
            <p className="font-bold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {user?.role === 'ADMIN' && (
              <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 mt-2">Admin</span>
            )}
          </div>

          <div className="card p-2">
            {[
              { icon: User, label: t(language, 'profileInfo'), tab: 'profile' as const },
              { icon: Lock, label: t(language, 'changePassword'), tab: 'password' as const },
            ].map(({ icon: Icon, label, tab }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
            <Link href="/dashboard/orders" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-800 rounded-xl transition-colors">
              <Package className="w-4 h-4" /> {t(language, 'myOrders')}
            </Link>
            <Link href="/dashboard/wishlist" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-800 rounded-xl transition-colors">
              <Heart className="w-4 h-4" /> {t(language, 'wishlist')}
            </Link>
            <Link href="/dashboard/reviews" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-800 rounded-xl transition-colors">
              <MessageSquare className="w-4 h-4" /> {t(language, 'myReviewsPage')}
            </Link>
            <Link href="/dashboard/addresses" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-800 rounded-xl transition-colors">
              <MapPin className="w-4 h-4" /> {t(language, 'myAddressesPage')}
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(({ icon: Icon, label, value, href, color }) => (
              <Link key={label} href={href} className="card p-3.5 sm:p-4 hover:shadow-card-hover transition-shadow border-none bg-white dark:bg-surface-900 min-h-[100px] sm:min-h-0">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </Link>
            ))}
          </div>

          {/* Form */}
          <div className="card p-4 sm:p-6">
            {activeTab === 'profile' ? (
              editingProfile ? (
                <form onSubmit={handleUpdateProfile}>
                  <h2 className="font-bold text-gray-900 dark:text-white mb-6 text-lg">{t(language, 'profileInfo')}</h2>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t(language, 'fullName')}</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t(language, 'emailAddress')}</label>
                      <input type="email" value={user?.email} disabled className="input opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t(language, 'phoneNumber')}</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+855 12 345 678"
                        className="input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t(language, 'profilePicture')}</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <label className="inline-flex items-center justify-center px-4 h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-900 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-800">
                          {uploadingAvatar
                            ? (language === 'km' ? 'កំពុងផ្ទុក...' : language === 'zh' ? '上传中...' : 'Uploading...')
                            : (language === 'km' ? 'ជ្រើសរូបពីឧបករណ៍' : language === 'zh' ? '从设备选择图片' : 'Choose image from device')}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,image/avif,.jpg,.jpeg,.png,.gif,.webp,.avif"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                            disabled={uploadingAvatar}
                          />
                        </label>
                        <input
                          type="text"
                          inputMode="url"
                          autoComplete="off"
                          spellCheck={false}
                          value={profileForm.avatar}
                          onChange={(e) => setProfileForm((p) => ({ ...p, avatar: e.target.value }))}
                          placeholder={t(language, 'avatarUrlFieldHint')}
                          className="input flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={saving} className="btn-primary px-8 py-2.5 shadow-premium">
                      {saving ? t(language, 'saving') : t(language, 'saveChanges')}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        resetProfileForm();
                        setEditingProfile(false);
                      }}
                      className="btn-secondary px-6 py-2.5"
                    >
                      {t(language, 'cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">{t(language, 'profileInfo')}</h2>
                    <button
                      type="button"
                      onClick={() => setEditingProfile(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors"
                    >
                      <Pencil className="w-4 h-4" aria-hidden />
                      {t(language, 'edit')}
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">{t(language, 'fullName')}</p>
                      <p className="text-gray-900 dark:text-white">{user?.name?.trim() ? user.name : '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">{t(language, 'emailAddress')}</p>
                      <p className="text-gray-900 dark:text-white break-all">{user?.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">{t(language, 'phoneNumber')}</p>
                      <p className="text-gray-900 dark:text-white">{user?.phone?.trim() ? user.phone : '—'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t(language, 'profilePicture')}</p>
                      <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                        <UserAvatar name={user?.name || ''} src={user?.avatar} size="lg" />
                        <div className="min-w-0 flex-1 space-y-1">
                          {user?.avatar?.trim() ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed break-all">
                              {truncateText(user.avatar, 96)}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {t(language, 'avatarNoPhotoHint')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : editingPassword ? (
              <form onSubmit={handleChangePassword}>
                <h2 className="font-bold text-gray-900 dark:text-white mb-6 text-lg">{t(language, 'changePassword')}</h2>
                <div className="space-y-5 max-w-md">
                  {[
                    { key: 'currentPassword', label: t(language, 'currentPassword') },
                    { key: 'newPassword', label: t(language, 'newPassword') },
                    { key: 'confirmPassword', label: t(language, 'confirmNewPassword') },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
                      <input
                        type="password"
                        value={(passwordForm as Record<string, string>)[key]}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, [key]: e.target.value }))}
                        className="input"
                        required
                        minLength={8}
                      />
                    </div>
                  ))}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={saving} className="btn-primary px-8 py-2.5 shadow-premium">
                      {saving ? t(language, 'updating') : t(language, 'updatePassword')}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        resetPasswordForm();
                        setEditingPassword(false);
                      }}
                      className="btn-secondary px-6 py-2.5"
                    >
                      {t(language, 'cancel')}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">{t(language, 'changePassword')}</h2>
                  <button
                    type="button"
                    onClick={() => setEditingPassword(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors"
                  >
                    <Pencil className="w-4 h-4" aria-hidden />
                    {t(language, 'edit')}
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">{t(language, 'passwordChangeHint')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
