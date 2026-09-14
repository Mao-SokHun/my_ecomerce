'use client';

import { useState } from 'react';
import {
  X,
  UserPlus,
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  User,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  StaffRole,
  STAFF_ROLES,
  canCreateRole,
  getCreatableRoles,
  setUserStaffRole,
  logAuditEvent,
} from '@/lib/rbac';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeStaffRole: StaffRole;
  currentActorName: string;
  isKhmer: boolean;
}

export function CreateStaffModal({
  isOpen,
  onClose,
  onSuccess,
  activeStaffRole,
  currentActorName,
  isKhmer,
}: CreateStaffModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRole>(
    activeStaffRole === 'SUPER_ADMIN' ? 'ADMIN' : 'CASHIER'
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const creatableStaffRoles = getCreatableRoles(activeStaffRole);
  const isSuperAdmin = activeStaffRole === 'SUPER_ADMIN';

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
    toast.success(isKhmer ? 'បានបង្កើតពាក្យសម្ងាត់សុវត្ថិភាពដោយស្វ័យប្រវត្តិ!' : 'Secure password generated!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(isKhmer ? 'សូមបញ្ចូលឈ្មោះបុគ្គលិក' : 'Please enter staff name');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast.error(isKhmer ? 'សូមបញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទ' : 'Please enter email or phone');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error(isKhmer ? 'ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវទេ' : 'Invalid email format');
      return;
    }
    if (!password || password.length < 6) {
      toast.error(isKhmer ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 6 ខ្ទង់' : 'Password must be at least 6 chars');
      return;
    }

    if (!canCreateRole(activeStaffRole, selectedRole)) {
      toast.error(
        isKhmer
          ? 'លោកអ្នកគ្មានសិទ្ធិបង្កើតគណនីប្រភេទនេះឡើយ'
          : 'You do not have permission to create this role'
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password: password,
        role: 'ADMIN', // All staff roles have ADMIN database role access to console
      };

      const res = await adminApi.createUser(payload);
      const createdUser = res.data?.data;

      if (createdUser?.id) {
        // Save specific staff role mapping in RBAC
        setUserStaffRole(createdUser.id, selectedRole);

        // Log audit trail event
        logAuditEvent({
          action: 'STAFF_ACCOUNT_CREATED',
          actionCategory: 'AUTH',
          descriptionKm: `បានបង្កើតគណនីបុគ្គលិកថ្មី ${name} តួនាទី ${STAFF_ROLES[selectedRole].titleKm}`,
          descriptionEn: `Created new staff account for ${name} as ${STAFF_ROLES[selectedRole].titleEn}`,
          actorName: currentActorName || 'Admin',
          actorRole: activeStaffRole,
          targetId: createdUser.id,
          targetName: name,
          newValue: selectedRole,
          ipAddress: '103.216.50.12 (Phnom Penh)',
        });
      }

      toast.success(
        isKhmer
          ? `បានបង្កើតគណនីបុគ្គលិក ${name} (${STAFF_ROLES[selectedRole].titleKm}) ជោគជ័យ!`
          : `Staff account ${name} created successfully!`
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          (isKhmer ? 'មិនអាចបង្កើតគណនីបានទេ សូមព្យាយាមម្តងទៀត' : 'Failed to create staff account')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                {isKhmer ? 'បង្កើតគណនីបុគ្គលិកថ្មី' : 'Create New Staff Account'}
              </h3>
              <p className="text-xs text-slate-300">
                {isSuperAdmin
                  ? isKhmer ? 'សិទ្ធិ Super Admin: អាចបង្កើតបានគ្រប់តួនាទី' : 'Super Admin Mode: Can create all roles'
                  : isKhmer ? 'សិទ្ធិ Admin: បង្កើតបានតែ Cashier & Warehouse' : 'Admin Mode: Can create Cashier & Warehouse'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Permission Notice Banner for Admin */}
          {!isSuperAdmin && (
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {isKhmer ? 'កំណត់សម្គាល់សិទ្ធិ Admin៖' : 'Admin Permission Rule:'}
                </span>{' '}
                {isKhmer
                  ? 'ក្នុងនាមជា Admin អ្នកអាចបង្កើតបានតែបុគ្គលិក Cashier/POS និង Warehouse ប៉ុណ្ណោះ។ មានតែ Super Admin ទើបអាចបង្កើត Admin ឬ Super Admin បាន។'
                  : 'As an Admin, you can only create Cashier/POS and Warehouse staff. Only Super Admin can create Admin or Super Admin accounts.'}
              </div>
            </div>
          )}

          {/* Role Selection Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              {isKhmer ? 'ជ្រើសរើសតួនាទីបុគ្គលិក (Staff Role) *' : 'Select Staff Role *'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {creatableStaffRoles.map((roleKey) => {
                const cfg = STAFF_ROLES[roleKey];
                const isSelected = selectedRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setSelectedRole(roleKey)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/50 ring-2 ring-primary-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {roleKey === 'SUPER_ADMIN' && '👑'}
                        {roleKey === 'ADMIN' && '💼'}
                        {roleKey === 'CASHIER' && '💳'}
                        {roleKey === 'WAREHOUSE' && '📦'}
                        {isKhmer ? cfg.titleKm : cfg.titleEn}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-primary-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {cfg.descriptionKm}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {isKhmer ? 'ឈ្មោះបុគ្គលិក (Staff Name) *' : 'Staff Name *'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isKhmer ? 'ឧ. សុខ ហេង' : 'e.g. Sok Heng'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>

          {/* Email and Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {isKhmer ? 'អ៊ីមែល (Email)' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@shshop.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {isKhmer ? 'លេខទូរស័ព្ទ (Phone)' : 'Phone'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    // Allow only numbers, plus, space, and dashes
                    const val = e.target.value.replace(/[^0-9+\s-]/g, '');
                    setPhone(val);
                  }}
                  placeholder="012 345 678"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
            </div>
          </div>

          {/* Password & Generator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {isKhmer ? 'ពាក្យសម្ងាត់ (Password) *' : 'Password *'}
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{isKhmer ? 'បង្កើតកូដស្វ័យប្រវត្តិ' : 'Auto Generate'}</span>
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-xs font-semibold text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-800 transition"
            >
              {isKhmer ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-md shadow-primary-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? (isKhmer ? 'កំពុងបង្កើត...' : 'Creating...') : (isKhmer ? 'បង្កើតគណនីបុគ្គលិក' : 'Create Staff Account')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
