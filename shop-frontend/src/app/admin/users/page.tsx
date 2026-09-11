'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { adminApi } from '@/lib/api';
import { User } from '@/types';
import { formatDate } from '@/lib/utils';
import { Search, ShieldCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { getInitials } from '@/lib/utils';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { adminT } from '@/lib/admin-i18n';

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
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={adminT(language, 'searchUserPlaceholder')}
          className="w-full h-10 pl-9.5 pr-4 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition shadow-inner"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'userCol')}</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{adminT(language, 'emailCol')}</th>
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
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={`user-cell-skeleton-${i}-${j}`} className="py-3 px-4"><div className="h-4 bg-gray-100 dark:bg-surface-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.map((user) => (
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
                      <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{user.email}</td>
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
                  <td className="py-3 px-4 text-gray-500">{user._count?.orders || 0}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
