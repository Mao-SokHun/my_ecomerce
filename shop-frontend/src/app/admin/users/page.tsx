'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { adminApi } from '@/lib/api';
import { User } from '@/types';
import { formatDate, formatPrice } from '@/lib/utils';
import { Search, ShieldCheck, UserX, X, Award, Eye, Phone, Mail, Calendar, ShoppingBag, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { getInitials } from '@/lib/utils';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { adminT } from '@/lib/admin-i18n';
import { calculateMembershipTier, getUserPoints, getUserLifetimeSpend } from '@/lib/loyaltyEngine';

export default function AdminUsersPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!search && users.length === 0) setLoading(true);
    adminApi.getUsers({ search: search || undefined })
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
  }, [search]);

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await adminApi.updateUser(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole as 'USER' | 'ADMIN' } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => prev ? { ...prev, role: newRole as 'USER' | 'ADMIN' } : null);
      }
      toast.success(`User role changed to ${newRole}`);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean | undefined) => {
    const currentActive = isActive ?? true;
    try {
      await adminApi.updateUser(userId, { isActive: !currentActive });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !currentActive } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => prev ? { ...prev, isActive: !currentActive } : null);
      }
      toast.success(`User ${!currentActive ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update user'); }
  };

  return (
    <div style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{adminT(language, 'usersTitle')}</h1>
          <p className="text-gray-500 text-sm">{users.length} {adminT(language, 'registeredUsersCount')}</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={adminT(language, 'searchUserPlaceholder')}
          style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
          className="w-full h-11 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition shadow-inner"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-surface-700 transition z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'userCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'emailCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{isKhmer ? 'កម្រិត VIP (Tier)' : 'VIP Tier'}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{isKhmer ? 'ពិន្ទុរង្វាន់' : 'Points'}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'roleCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'statusCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'ordersCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'joinedCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'actionsCol')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`user-row-skeleton-${i}`}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={`user-cell-skeleton-${i}-${j}`} className="py-3 px-4"><div className="h-4 bg-gray-100 dark:bg-surface-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.map((user) => {
                const lifetimeSpend = getUserLifetimeSpend(user.id);
                const tier = calculateMembershipTier(lifetimeSpend);
                const points = getUserPoints(user.id);

                return (
                  <tr key={user.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                          {user.avatar ? (
                            <Image 
                              src={user.avatar} 
                              alt={user.name} 
                              fill 
                              className="object-cover" 
                            />
                          ) : getInitials(user.name)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white block">{user.name}</span>
                          {user.phone && <span className="text-[11px] text-gray-400 block">{user.phone}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${tier.badgeBg} ${tier.badgeText} ${tier.badgeBorder}`}>
                        <span>{tier.icon}</span>
                        <span>{isKhmer ? tier.labelKm.split(' ')[0] : tier.labelEn}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {points.toLocaleString()} Pts
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${user.role === 'ADMIN' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-gray-100 text-gray-600 dark:bg-surface-800 dark:text-gray-400'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${user.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {user.isActive ? adminT(language, 'activeStatus') : adminT(language, 'inactiveStatus')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-semibold">{user._count?.orders || 0}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedUser(user)}
                          title="View 360° Profile"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRoleToggle(user.id, user.role)}
                          title={user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360° Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-100 dark:border-surface-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-base overflow-hidden relative">
                  {selectedUser.avatar ? (
                    <Image src={selectedUser.avatar} alt={selectedUser.name} fill className="object-cover" />
                  ) : (
                    getInitials(selectedUser.name)
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{selectedUser.name}</h3>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* VIP Tier & Rewards Card */}
            {(() => {
              const lifetime = getUserLifetimeSpend(selectedUser.id);
              const tier = calculateMembershipTier(lifetime);
              const points = getUserPoints(selectedUser.id);
              return (
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tier.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm leading-tight">{isKhmer ? tier.labelKm : tier.labelEn}</h4>
                        <p className="text-[11px] text-indigo-200">
                          {tier.discountPercentage}% Discount • {tier.pointsMultiplier}x Points
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/90 text-white">
                      {points.toLocaleString()} Pts
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-indigo-300 block text-[10px]">Lifetime Spend (LTV):</span>
                      <span className="font-bold text-sm">${lifetime.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-indigo-300 block text-[10px]">Total Orders:</span>
                      <span className="font-bold text-sm">{selectedUser._count?.orders || 0} Orders</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-surface-800 space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.phone || 'N/A'}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-surface-800 space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Role & Status
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedUser.role} • {selectedUser.isActive ? 'Active' : 'Disabled'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-surface-800 space-y-1 col-span-2">
                <span className="text-gray-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Registered Date
                </span>
                <p className="font-semibold text-gray-900 dark:text-white">{formatDate(selectedUser.createdAt)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-surface-800">
              <button
                onClick={() => handleRoleToggle(selectedUser.id, selectedUser.role)}
                className="btn-secondary text-xs px-3 py-2"
              >
                {selectedUser.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
              </button>
              <button
                onClick={() => handleToggleActive(selectedUser.id, selectedUser.isActive)}
                className={`text-xs px-3 py-2 rounded-xl font-bold transition ${
                  selectedUser.isActive
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                    : 'bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400'
                }`}
              >
                {selectedUser.isActive ? 'Deactivate User' : 'Activate User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

