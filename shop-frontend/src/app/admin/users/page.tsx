'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { adminApi } from '@/lib/api';
import { User } from '@/types';
import { formatDate, formatPrice, toKhmerNum } from '@/lib/utils';
import {
  Search,
  ShieldCheck,
  UserX,
  X,
  Award,
  Eye,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
  MapPin,
  UserPlus,
  Shield,
  UserCheck,
  Crown,
  Users as UsersIcon,
  Sparkles,
  Coins,
  CheckCircle2,
  Tag,
  Clock,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { adminT } from '@/lib/admin-i18n';
import { calculateMembershipTier, getUserPoints, getUserLifetimeSpend, TierBenefit } from '@/lib/loyaltyEngine';
import {
  StaffRole,
  STAFF_ROLES,
  getEffectiveStaffRole,
  getUserStaffRole,
  setUserStaffRole,
  canCreateRole,
  canManageUsers,
  logAuditEvent,
} from '@/lib/rbac';
import { CreateStaffModal } from '@/components/admin/CreateStaffModal';

export default function AdminUsersPage() {
  const { user: authUser } = useAuthStore();
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';

  const [activeStaffRole, setActiveStaffRole] = useState<StaffRole>(() => getEffectiveStaffRole(authUser));
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_users');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_users');
        if (cached) return false;
      } catch {}
    }
    return true;
  });
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'customer' | 'staff' | 'vip' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    setActiveStaffRole(getEffectiveStaffRole(authUser));
  }, [authUser]);

  useEffect(() => {
    const handleRoleChange = () => {
      setActiveStaffRole(getEffectiveStaffRole(authUser));
    };
    window.addEventListener('staff_role_changed', handleRoleChange);
    window.addEventListener('user_staff_role_updated', () => {
      setUsers((prev) => [...prev]);
    });
    return () => {
      window.removeEventListener('staff_role_changed', handleRoleChange);
    };
  }, [authUser]);

  const loadUsers = () => {
    setLoading(true);
    adminApi
      .getUsers({ search: search || undefined })
      .then(({ data }) => {
        const list = data.data || [];
        setUsers(list);
        if (!search) {
          try {
            sessionStorage.setItem('admin_cached_users', JSON.stringify(list));
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [search]);

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    if (activeStaffRole !== 'SUPER_ADMIN' && activeStaffRole !== 'ADMIN') {
      toast.error(isKhmer ? 'គ្មានសិទ្ធិកែប្រែតួនាទីបុគ្គលិកឡើយ' : 'Permission denied');
      return;
    }

    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await adminApi.updateUser(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole as 'USER' | 'ADMIN' } : u)));
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, role: newRole as 'USER' | 'ADMIN' } : null));
      }
      logAuditEvent({
        action: 'ROLE_TOGGLE',
        actionCategory: 'AUTH',
        descriptionKm: `បានផ្លាស់ប្តូរតួនាទី ${newRole === 'ADMIN' ? 'ជា Admin' : 'ជា Customer'} សម្រាប់ User ID ${userId}`,
        descriptionEn: `Toggled user role to ${newRole} for user ID ${userId}`,
        actorName: authUser?.name || 'Admin',
        actorRole: activeStaffRole,
        targetId: userId,
        newValue: newRole,
      });
      toast.success(isKhmer ? `បានប្តូរតួនាទីទៅជា ${newRole}` : `User role changed to ${newRole}`);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean | undefined) => {
    if (activeStaffRole !== 'SUPER_ADMIN' && activeStaffRole !== 'ADMIN') {
      toast.error(isKhmer ? 'គ្មានសិទ្ធិកែប្រែស្ថានភាពគណនីឡើយ' : 'Permission denied');
      return;
    }

    const currentActive = isActive ?? true;
    try {
      await adminApi.updateUser(userId, { isActive: !currentActive });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: !currentActive } : u)));
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, isActive: !currentActive } : null));
      }
      logAuditEvent({
        action: 'STATUS_TOGGLE',
        actionCategory: 'AUTH',
        descriptionKm: `បាន ${!currentActive ? 'បើកដំណើរការ (Activate)' : 'បិទដំណើរការ (Deactivate)'} គណនី User ID ${userId}`,
        descriptionEn: `${!currentActive ? 'Activated' : 'Deactivated'} user account ${userId}`,
        actorName: authUser?.name || 'Admin',
        actorRole: activeStaffRole,
        targetId: userId,
        newValue: !currentActive ? 'ACTIVE' : 'INACTIVE',
      });
      toast.success(
        isKhmer
          ? `បាន${!currentActive ? 'បើកដំណើរការ' : 'ផ្អាក'}គណនីជោគជ័យ`
          : `User ${!currentActive ? 'activated' : 'deactivated'}`
      );
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការកែប្រែគណនី' : 'Failed to update user');
    }
  };

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const staffRole = getUserStaffRole(u.id, u.role, u.email);
      const isStaff = u.role === 'ADMIN' || staffRole !== 'USER';
      const lifetime = getUserLifetimeSpend(u.id);
      const isVip = lifetime >= 200; // Silver, Gold, Platinum

      if (filterTab === 'customer') return !isStaff;
      if (filterTab === 'staff') return isStaff;
      if (filterTab === 'vip') return isVip;
      if (filterTab === 'active') return u.isActive ?? true;
      if (filterTab === 'inactive') return u.isActive === false;
      return true;
    });
  }, [users, filterTab]);

  // Statistics calculation
  const totalCount = users.length;
  const staffCount = useMemo(() => {
    return users.filter((u) => {
      const r = getUserStaffRole(u.id, u.role, u.email);
      return u.role === 'ADMIN' || r !== 'USER';
    }).length;
  }, [users]);
  const vipCount = useMemo(() => {
    return users.filter((u) => getUserLifetimeSpend(u.id) >= 200).length;
  }, [users]);
  const activeCount = useMemo(() => {
    return users.filter((u) => u.isActive ?? true).length;
  }, [users]);

  return (
    <div
      className="space-y-4 font-sans"
      style={isKhmer ? { fontFamily: "'Kantumruy Pro', 'Noto Sans Khmer', 'Khmer OS Siemreap', 'Inter', sans-serif" } : undefined}
    >
      {/* ========================================================================= */}
      {/* TOP HEADER & CREATE STAFF BUTTON */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>{adminT(language, 'usersTitle')}</span>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/80 dark:border-primary-800/80">
              {isKhmer ? `${toKhmerNum(totalCount)} នាក់` : `${totalCount} Users`}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
            {isKhmer ? 'គ្រប់គ្រងអតិថិជន កម្រិត VIP និងសិទ្ធិគណនីបុគ្គលិកតាមតួនាទី (RBAC)' : 'Manage customer profiles, VIP loyalty tiers, and staff permissions (RBAC)'}
          </p>
        </div>

        {/* Create Staff Account Button (Super Admin & Admin only) */}
        {(activeStaffRole === 'SUPER_ADMIN' || activeStaffRole === 'ADMIN') && (
          <button
            type="button"
            onClick={() => setIsCreateStaffOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white text-xs font-bold transition shadow-md shadow-primary-500/25 flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>{isKhmer ? '➕ បង្កើតគណនីបុគ្គលិកថ្មី' : '➕ Create Staff Account'}</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STATS OVERVIEW CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. Total Registered */}
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all duration-200 overflow-hidden hover:-translate-y-0.5 shadow-2xs ${
            filterTab === 'all'
              ? 'bg-gradient-to-br from-indigo-50/90 to-white dark:from-indigo-950/40 dark:to-surface-900 border-indigo-500/50 shadow-sm ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-750 hover:border-indigo-300 dark:hover:border-indigo-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isKhmer ? 'គណនីសរុប' : 'Total Registered'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/40">
              <UsersIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {isKhmer ? toKhmerNum(totalCount) : totalCount}
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300">
              {isKhmer ? 'នាក់' : 'users'}
            </span>
          </div>
        </button>

        {/* 2. VIP Loyalty Members */}
        <button
          type="button"
          onClick={() => setFilterTab('vip')}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all duration-200 overflow-hidden hover:-translate-y-0.5 shadow-2xs ${
            filterTab === 'vip'
              ? 'bg-gradient-to-br from-amber-50/90 to-white dark:from-amber-950/40 dark:to-surface-900 border-amber-500/50 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-750 hover:border-amber-300 dark:hover:border-amber-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>💎</span>
              <span>{isKhmer ? 'សមាជិក VIP' : 'VIP Members'}</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
              <Crown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {isKhmer ? toKhmerNum(vipCount) : vipCount}
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              {isKhmer ? 'VIP Tier' : 'VIP'}
            </span>
          </div>
        </button>

        {/* 3. Staff & Admins */}
        <button
          type="button"
          onClick={() => setFilterTab('staff')}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all duration-200 overflow-hidden hover:-translate-y-0.5 shadow-2xs ${
            filterTab === 'staff'
              ? 'bg-gradient-to-br from-rose-50/90 to-white dark:from-rose-950/40 dark:to-surface-900 border-rose-500/50 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-750 hover:border-rose-300 dark:hover:border-rose-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              {isKhmer ? 'បុគ្គលិក & Admin' : 'Staff & Admins'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
              {isKhmer ? toKhmerNum(staffCount) : staffCount}
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-md bg-rose-100/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
              RBAC
            </span>
          </div>
        </button>

        {/* 4. Active Accounts */}
        <button
          type="button"
          onClick={() => setFilterTab('active')}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all duration-200 overflow-hidden hover:-translate-y-0.5 shadow-2xs ${
            filterTab === 'active'
              ? 'bg-gradient-to-br from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-surface-900 border-emerald-500/50 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-750 hover:border-emerald-300 dark:hover:border-emerald-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isKhmer ? 'គណនីសកម្ម' : 'Active Accounts'}</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {isKhmer ? toKhmerNum(activeCount) : activeCount}
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              {isKhmer ? 'សកម្ម' : 'live'}
            </span>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH BAR & FILTER TABS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-surface-750 bg-white dark:bg-surface-900 shadow-2xs p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={adminT(language, 'searchUserPlaceholder')}
              style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
              className="w-full h-10 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition shadow-inner"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-surface-700 transition z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 font-semibold self-end sm:self-center">
            {isKhmer
              ? `បង្ហាញ ${toKhmerNum(filteredUsers.length)} នៃ ${toKhmerNum(totalCount)} គណនី`
              : `Showing ${filteredUsers.length} of ${totalCount} users`}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-surface-800">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>{isKhmer ? 'តម្រង៖' : 'Filter:'}</span>
          </span>
          {[
            { mode: 'all' as const, label: isKhmer ? 'ទាំងអស់' : 'All Users', count: totalCount },
            { mode: 'customer' as const, label: isKhmer ? '👤 អតិថិជន' : '👤 Customers', count: totalCount - staffCount },
            { mode: 'vip' as const, label: isKhmer ? '💎 សមាជិក VIP' : '💎 VIP Members', count: vipCount },
            { mode: 'staff' as const, label: isKhmer ? '🛡️ បុគ្គលិក & Admin' : '🛡️ Staff & Admins', count: staffCount },
            { mode: 'active' as const, label: isKhmer ? '🟢 សកម្ម' : '🟢 Active', count: activeCount },
            { mode: 'inactive' as const, label: isKhmer ? '⚪ អសកម្ម' : '⚪ Inactive', count: totalCount - activeCount },
          ].map((tab) => {
            const isActive = filterTab === tab.mode;
            return (
              <button
                key={tab.mode}
                type="button"
                onClick={() => setFilterTab(tab.mode)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all duration-150 flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                    : 'bg-white dark:bg-surface-850 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`min-w-[18px] h-4.5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-mono font-black ${
                    isActive
                      ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-surface-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isKhmer ? toKhmerNum(tab.count) : tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LUXURY USERS TABLE */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-surface-900/95 shadow-sm overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-surface-850/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-3 px-3 text-center w-[5%] min-w-[45px]">{isKhmer ? 'ល.រ' : '#'}</th>
                <th className="py-3 px-4 w-[24%] min-w-[190px]">{adminT(language, 'userCol')}</th>
                <th className="py-3 px-4 w-[18%] min-w-[150px]">{adminT(language, 'emailCol')}</th>
                <th className="py-3 px-4 w-[14%] min-w-[130px]">{isKhmer ? 'កម្រិត VIP (Tier)' : 'VIP Tier'}</th>
                <th className="py-3 px-4 w-[13%] min-w-[110px]">{isKhmer ? 'ពិន្ទុរង្វាន់' : 'Points'}</th>
                <th className="py-3 px-4 w-[14%] min-w-[140px]">{adminT(language, 'roleCol')}</th>
                <th className="py-3 px-4 text-center w-[9%] min-w-[90px]">{adminT(language, 'statusCol')}</th>
                <th className="py-3 px-3 text-center w-[7%] min-w-[70px]">{adminT(language, 'ordersCol')}</th>
                <th className="py-3 px-4 text-right w-[10%] min-w-[100px]">{adminT(language, 'actionsCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs sm:text-sm">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`user-skeleton-${i}`}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={`user-cell-skeleton-${i}-${j}`} className="py-3.5 px-4">
                        <div className="h-4.5 bg-slate-100 dark:bg-surface-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-surface-800 flex items-center justify-center mx-auto text-slate-400 mb-2.5">
                      <UsersIcon className="w-6 h-6 stroke-1" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {isKhmer ? 'រកមិនឃើញគណនីអ្នកប្រើប្រាស់ឡើយ' : 'No user accounts found'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isKhmer ? 'សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬជ្រើសរើស Tab ផ្សេង' : 'Try adjusting your search or switching filter tabs'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const lifetimeSpend = getUserLifetimeSpend(u.id);
                  const tier = calculateMembershipTier(lifetimeSpend);
                  const points = getUserPoints(u.id);
                  const staffRole = getUserStaffRole(u.id, u.role, u.email);
                  const isStaff = u.role === 'ADMIN' || staffRole !== 'USER';
                  const staffConfig = STAFF_ROLES[staffRole as StaffRole] || STAFF_ROLES.ADMIN;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-surface-850/50 transition-colors group"
                    >
                      {/* 1. Index Sequence */}
                      <td className="py-3 px-3 text-center text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                        {isKhmer ? toKhmerNum(idx + 1) : idx + 1}
                      </td>

                      {/* 2. User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden shadow-xs">
                            {u.avatar ? (
                              <Image src={u.avatar} alt={u.name} fill className="object-cover" sizes="36px" />
                            ) : (
                              getInitials(u.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white block truncate leading-tight">
                              {u.name}
                            </span>
                            {u.phone ? (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate flex items-center gap-1 mt-0.5 font-mono">
                                <Phone className="w-2.5 h-2.5" />
                                {u.phone}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                                ID: {u.id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Email */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium block truncate max-w-[180px]">
                          {u.email || '—'}
                        </span>
                      </td>

                      {/* 4. VIP Tier Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${tier.badgeBg} ${tier.badgeText} ${tier.badgeBorder}`}
                        >
                          <span className="text-sm leading-none">{tier.icon}</span>
                          <span className="whitespace-nowrap leading-none font-bold">
                            {isKhmer ? tier.labelKm : tier.labelEn}
                          </span>
                        </span>
                      </td>

                      {/* 5. Points Badge */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300/80 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 font-mono font-bold text-xs">
                          <span>🪙</span>
                          <span>{points.toLocaleString()}</span>
                          <span className="text-[10px] font-normal text-amber-700/80 dark:text-amber-400">Pts</span>
                        </span>
                      </td>

                      {/* 6. Role Badge (Localized & RBAC) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isStaff ? (
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${staffConfig.badgeBg} ${staffConfig.badgeText} ${staffConfig.badgeBorder}`}
                          >
                            <span>
                              {staffRole === 'SUPER_ADMIN' && '👑'}
                              {staffRole === 'ADMIN' && '💼'}
                              {staffRole === 'CASHIER' && '💳'}
                              {staffRole === 'WAREHOUSE' && '📦'}
                            </span>
                            <span>
                              {staffRole === 'SUPER_ADMIN'
                                ? isKhmer ? 'អភិបាលជាន់ខ្ពស់' : 'Super Admin'
                                : staffRole === 'ADMIN'
                                  ? isKhmer ? 'អ្នកគ្រប់គ្រង' : 'Store Admin'
                                  : staffRole === 'CASHIER'
                                    ? isKhmer ? 'បុគ្គលិកគិតលុយ' : 'Cashier'
                                    : isKhmer ? 'បុគ្គលិកឃ្លាំង' : 'Warehouse'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-surface-700">
                            <span>👤</span>
                            <span>{isKhmer ? 'អតិថិជន' : 'Customer'}</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Status Pill */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.isActive ?? true
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.isActive ?? true ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <span>
                            {u.isActive ?? true
                              ? isKhmer ? 'សកម្ម' : 'Active'
                              : isKhmer ? 'អសកម្ម' : 'Inactive'}
                          </span>
                        </span>
                      </td>

                      {/* 8. Orders Count */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-200 text-xs font-bold font-mono">
                          {isKhmer ? toKhmerNum(u._count?.orders || 0) : u._count?.orders || 0}
                        </span>
                      </td>

                      {/* 9. Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 360° Profile Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            title={isKhmer ? 'មើលប្រវត្តិ 360° Profile' : 'View 360° Profile'}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Staff Role Toggle Button (Only Super Admin & Admin) */}
                          {(activeStaffRole === 'SUPER_ADMIN' || activeStaffRole === 'ADMIN') && (
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(u.id, u.role)}
                              title={
                                u.role !== 'USER'
                                  ? isKhmer ? 'ដកសិទ្ធិបុគ្គលិក (Make Customer)' : 'Remove Staff Access'
                                  : isKhmer ? 'ផ្តល់សិទ្ធិបុគ្គលិក (Make Staff)' : 'Promote to Staff'
                              }
                              className="p-1.5 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Active / Deactivate Toggle (Only Super Admin & Admin) */}
                          {(activeStaffRole === 'SUPER_ADMIN' || activeStaffRole === 'ADMIN') && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u.id, u.isActive)}
                              title={
                                u.isActive ?? true
                                  ? isKhmer ? 'ផ្អាកគណនី (Deactivate)' : 'Deactivate'
                                  : isKhmer ? 'បើកដំណើរការ (Activate)' : 'Activate'
                              }
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CUSTOMER 360° PROFILE MODAL */}
      {/* ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-surface-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200/90 dark:border-surface-750 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-surface-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base overflow-hidden relative shadow-md">
                  {selectedUser.avatar ? (
                    <Image src={selectedUser.avatar} alt={selectedUser.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    getInitials(selectedUser.name)
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedUser.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedUser.email || 'No email'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-surface-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* VIP Tier & Rewards Showcase Card */}
            {(() => {
              const lifetime = getUserLifetimeSpend(selectedUser.id);
              const tier = calculateMembershipTier(lifetime);
              const points = getUserPoints(selectedUser.id);
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl">{tier.icon}</span>
                      <div>
                        <h4 className="font-extrabold text-sm leading-tight text-white flex items-center gap-1.5">
                          <span>{isKhmer ? tier.labelKm : tier.labelEn}</span>
                        </h4>
                        <p className="text-[11px] text-indigo-200 mt-0.5">
                          {tier.discountPercentage}% {isKhmer ? 'បញ្ចុះតម្លៃ' : 'Discount'} • {tier.pointsMultiplier}x {isKhmer ? 'ពិន្ទុរង្វាន់' : 'Points multiplier'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white flex items-center gap-1 shadow-sm">
                      <span>🪙</span>
                      <span>{points.toLocaleString()} Pts</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-indigo-300 block text-[10px] uppercase tracking-wider font-bold">
                        {isKhmer ? 'ទឹកប្រាក់ទិញសរុប (LTV)' : 'Lifetime Spend (LTV)'}
                      </span>
                      <span className="font-black text-sm font-mono text-white">${lifetime.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-indigo-300 block text-[10px] uppercase tracking-wider font-bold">
                        {isKhmer ? 'ចំនួនការកម្មង់សរុប' : 'Total Orders'}
                      </span>
                      <span className="font-black text-sm text-white">
                        {selectedUser._count?.orders || 0} {isKhmer ? 'Orders' : 'Orders'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Profile Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-800/80 space-y-1 border border-slate-100 dark:border-surface-750">
                <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                  <Phone className="w-3.5 h-3.5 text-primary-500" /> {isKhmer ? 'លេខទូរស័ព្ទ' : 'Phone'}
                </span>
                <p className="font-bold text-slate-900 dark:text-white font-mono">{selectedUser.phone || '—'}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-800/80 space-y-1 border border-slate-100 dark:border-surface-750">
                <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> {isKhmer ? 'តួនាទី & ស្ថានភាព' : 'Role & Status'}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedUser.role} • {selectedUser.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-800/80 space-y-1 col-span-2 border border-slate-100 dark:border-surface-750">
                <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> {isKhmer ? 'កាលបរិច្ឆេទចុះឈ្មោះ' : 'Registered Date'}
                </span>
                <p className="font-bold text-slate-900 dark:text-white">{formatDate(selectedUser.createdAt)}</p>
              </div>
            </div>

            {/* Staff Role Assignment (When user is Staff) */}
            {selectedUser.role !== 'USER' && (activeStaffRole === 'SUPER_ADMIN' || activeStaffRole === 'ADMIN') && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-800/80 border border-slate-200 dark:border-surface-700 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  {isKhmer ? 'កំណត់តួនាទីបុគ្គលិកជាក់លាក់ (Assign Staff Role)៖' : 'Assign Specific Staff Role:'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(activeStaffRole === 'SUPER_ADMIN'
                    ? (['SUPER_ADMIN', 'ADMIN', 'CASHIER', 'WAREHOUSE'] as StaffRole[])
                    : (['CASHIER', 'WAREHOUSE'] as StaffRole[])
                  ).map((r) => {
                    const cfg = STAFF_ROLES[r];
                    const isCurrent = getUserStaffRole(selectedUser.id, selectedUser.role, selectedUser.email) === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setUserStaffRole(selectedUser.id, r);
                          logAuditEvent({
                            action: 'STAFF_ROLE_ASSIGNED',
                            actionCategory: 'AUTH',
                            descriptionKm: `បានកំណត់តួនាទីបុគ្គលិក ${selectedUser.name} ជា ${cfg.titleKm}`,
                            descriptionEn: `Assigned staff role for ${selectedUser.name} to ${cfg.titleEn}`,
                            actorName: authUser?.name || 'Admin',
                            actorRole: activeStaffRole,
                            targetId: selectedUser.id,
                            targetName: selectedUser.name,
                            newValue: r,
                          });
                          toast.success(isKhmer ? `បានកំណត់តួនាទីជា ${cfg.titleKm}` : `Assigned role to ${cfg.titleEn}`);
                          setUsers((prev) => [...prev]);
                        }}
                        className={`p-2 rounded-xl text-left border text-xs font-bold transition flex items-center justify-between ${
                          isCurrent
                            ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-1 ring-primary-500`
                            : 'bg-white dark:bg-surface-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-surface-700 hover:bg-slate-100 dark:hover:bg-surface-800'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {r === 'SUPER_ADMIN' && '👑'}
                          {r === 'ADMIN' && '💼'}
                          {r === 'CASHIER' && '💳'}
                          {r === 'WAREHOUSE' && '📦'}
                          <span>{isKhmer ? cfg.titleKm.split(' ')[0] : cfg.titleEn}</span>
                        </span>
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-surface-800">
              {(activeStaffRole === 'SUPER_ADMIN' || activeStaffRole === 'ADMIN') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRoleToggle(selectedUser.id, selectedUser.role)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                  >
                    {selectedUser.role !== 'USER'
                      ? isKhmer ? 'ដកសិទ្ធិបុគ្គលិក (Demote)' : 'Demote to Customer'
                      : isKhmer ? 'ផ្តល់សិទ្ធិបុគ្គលិក (Promote)' : 'Promote to Staff'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(selectedUser.id, selectedUser.isActive)}
                    className={`text-xs px-3.5 py-2 rounded-xl font-bold transition ${
                      selectedUser.isActive ?? true
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    }`}
                  >
                    {selectedUser.isActive ?? true
                      ? isKhmer ? 'ផ្អាកគណនី (Deactivate)' : 'Deactivate User'
                      : isKhmer ? 'បើកដំណើរការ (Activate)' : 'Activate User'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      <CreateStaffModal
        isOpen={isCreateStaffOpen}
        onClose={() => setIsCreateStaffOpen(false)}
        onSuccess={() => loadUsers()}
        activeStaffRole={activeStaffRole}
        currentActorName={authUser?.name || 'Admin'}
        isKhmer={isKhmer}
      />
    </div>
  );
}
