'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  Send,
  Users,
  User,
  Mail,
  Megaphone,
  Gift,
  Package,
  AlertTriangle,
  Radio,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  RefreshCw,
  Phone,
  Eye,
  History,
  ShieldCheck,
  SendHorizontal,
  Tag,
  ShoppingBag,
  Check,
  X,
} from 'lucide-react';
import { notificationApi, adminApi } from '@/lib/api';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import toast from 'react-hot-toast';

type NotificationItem = {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'PROMOTION' | 'ORDER_UPDATE' | 'SYSTEM' | 'URGENT';
  target: 'ALL' | 'USER' | 'SUBSCRIBERS';
  link?: string | null;
  sentBy?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  } | null;
};

type UserCandidate = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

export default function AdminNotificationsPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';

  // Composer Form States
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'ANNOUNCEMENT' | 'PROMOTION' | 'ORDER_UPDATE' | 'URGENT'>('ANNOUNCEMENT');
  const [target, setTarget] = useState<'ALL' | 'USER' | 'SUBSCRIBERS'>('ALL');
  const [targetUserIdentifier, setTargetUserIdentifier] = useState('');
  const [link, setLink] = useState('');
  const [sendTelegram, setSendTelegram] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Quick Link Picker States
  const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string; slug: string; price: number; thumbnail?: string }[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<{ id: string; code: string; discount: number; discountType: string; description?: string | null }[]>([]);
  const [linkPickerMode, setLinkPickerMode] = useState<'NONE' | 'PRODUCT' | 'COUPON'>('NONE');
  const [productSearch, setProductSearch] = useState('');

  // Fetch available Products & Coupons for Quick Action Linking
  useEffect(() => {
    adminApi.getProducts({ limit: 100 })
      .then(({ data }) => setAvailableProducts(data?.data || []))
      .catch(() => {});
    adminApi.getCoupons()
      .then(({ data }) => setAvailableCoupons(data?.data || []))
      .catch(() => {});
  }, []);

  // User Autocomplete Search States
  const [userQuery, setUserQuery] = useState('');
  const [userCandidates, setUserCandidates] = useState<UserCandidate[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCandidate | null>(null);

  // History & Table States
  const [historyList, setHistoryList] = useState<NotificationItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyTab, setHistoryTab] = useState<'preview' | 'history'>('preview');
  const [filterType, setFilterType] = useState('ALL');
  const [searchHistory, setSearchHistory] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load Broadcast History
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data } = await notificationApi.getAdminBroadcasts({
        type: filterType === 'ALL' ? undefined : filterType,
        search: searchHistory.trim() || undefined,
        limit: 50,
      });
      setHistoryList(data?.data || []);
    } catch {
      setHistoryList([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [filterType, searchHistory]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Search Users for autocomplete
  useEffect(() => {
    if (target !== 'USER' || !userQuery.trim() || userQuery.length < 2) {
      setUserCandidates([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const { data } = await adminApi.getUsers({ search: userQuery.trim(), limit: 6 });
        setUserCandidates(data?.data?.users || data?.data || []);
      } catch {
        setUserCandidates([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userQuery, target]);

  // Handle Send Broadcast
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error(isKhmer ? 'សូមបញ្ចូលចំណងជើង និងខ្លឹមសារសារ' : 'Please provide a title and message');
      return;
    }

    if (target === 'USER' && !targetUserIdentifier.trim()) {
      toast.error(isKhmer ? 'សូមជ្រើសរើស ឬបញ្ចូលឈ្មោះ/អ៊ីមែលអតិថិជន' : 'Please select or enter customer information');
      return;
    }

    setIsSending(true);
    try {
      const { data } = await notificationApi.sendBroadcast({
        title: title.trim(),
        message: message.trim(),
        type,
        target,
        targetUserIdentifier: target === 'USER' ? targetUserIdentifier.trim() : undefined,
        link: link.trim() || undefined,
        sendTelegram,
      });

      toast.success(data?.message || (isKhmer ? 'បានផ្ញើសេចក្តីជូនដំណឹងដោយជោគជ័យ!' : 'Notification sent successfully!'));
      
      // Reset Form
      setTitle('');
      setMessage('');
      setLink('');
      setSelectedUser(null);
      setTargetUserIdentifier('');
      setUserQuery('');
      void loadHistory();
      setHistoryTab('history');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isKhmer ? 'ការផ្ញើសារបរាជ័យ' : 'Failed to send notification'));
    } finally {
      setIsSending(false);
    }
  };

  // Handle Delete Broadcast
  const handleDelete = async (id: string) => {
    if (!confirm(isKhmer ? 'តើអ្នកពិតជាចង់លុបសេចក្តីជូនដំណឹងនេះមែនទេ?' : 'Are you sure you want to delete this notification?')) return;
    setDeletingId(id);
    try {
      await notificationApi.deleteBroadcast(id);
      toast.success(isKhmer ? 'បានលុបរួចរាល់' : 'Notification deleted');
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការលុប' : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeBadge = (itemType: string) => {
    switch (itemType) {
      case 'PROMOTION':
        return {
          label: isKhmer ? '🎁 ប្រូម៉ូសិន' : '🎁 Promotion',
          classes: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/50',
          dot: 'bg-rose-500',
        };
      case 'URGENT':
        return {
          label: isKhmer ? '🚨 បន្ទាន់' : '🚨 Urgent',
          classes: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/50',
          dot: 'bg-amber-500',
        };
      case 'ORDER_UPDATE':
        return {
          label: isKhmer ? '📦 ការកម្មង់' : '📦 Order',
          classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/50',
          dot: 'bg-blue-500',
        };
      default:
        return {
          label: isKhmer ? '📢 ដំណឹងហាង' : '📢 Announcement',
          classes: 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 border-primary-200/80 dark:border-primary-800/50',
          dot: 'bg-primary-500',
        };
    }
  };

  const getTargetBadge = (itemTarget: string, userObj?: NotificationItem['user']) => {
    switch (itemTarget) {
      case 'USER':
        return {
          label: userObj?.name ? `👤 ${userObj.name}` : isKhmer ? '👤 អតិថិជនជាក់លាក់' : '👤 Targeted User',
          classes: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        };
      case 'SUBSCRIBERS':
        return {
          label: isKhmer ? '📬 អ្នក Subscribe' : '📬 Subscribers',
          classes: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      default:
        return {
          label: isKhmer ? '🌐 អតិថិជនទាំងអស់' : '🌐 All Customers',
          classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-primary-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold border border-white/15">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>{isKhmer ? 'ប្រព័ន្ធផ្សាយដំណឹង និងផ្ញើសារជូនដំណឹង' : 'Store Broadcast & Alert Center'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {isKhmer ? 'ផ្ញើសេចក្តីជូនដំណឹង & ប្រកាសដំណឹងហាង' : 'Customer Broadcast & Alerts'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            {isKhmer
              ? 'ផ្ញើសារប្រកាសដំណឹងហាង ប្រូម៉ូសិនពិសេស ឬសារផ្ទាល់ទៅកាន់អតិថិជនម្នាក់ៗ ក្រុមអ្នក Subscribe ឬអតិថិជនទាំងអស់លើវេបសាយ និង Telegram។'
              : 'Broadcast store notices, flash promotions, or tailored direct alerts to specific customers, subscribers, or all shoppers instantly.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <button
            type="button"
            onClick={() => setHistoryTab('preview')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
              historyTab === 'preview'
                ? 'bg-white text-slate-900 shadow-md border-white'
                : 'bg-white/10 text-white hover:bg-white/20 border-white/15'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'ផ្ទាំងបង្កើត & Preview' : 'Composer & Preview'}</span>
          </button>
          <button
            type="button"
            onClick={() => setHistoryTab('history')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
              historyTab === 'history'
                ? 'bg-white text-slate-900 shadow-md border-white'
                : 'bg-white/10 text-white hover:bg-white/20 border-white/15'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'ប្រវត្តិផ្ញើ (' + historyList.length + ')' : `History (${historyList.length})`}</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Broadcast Composer Form */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSend}
            className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <SendHorizontal className="w-4 h-4 text-primary-500" />
                <span>{isKhmer ? 'បង្កើតសារជូនដំណឹងថ្មី' : 'Compose Notification'}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                {isKhmer ? 'បំពេញព័ត៌មានខាងក្រោម' : 'Fill details below'}
              </span>
            </div>

            {/* 1. Target Audience Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {isKhmer ? '១. ជ្រើសរើសអ្នកទទួល (Target Audience)' : '1. Target Audience'}:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'ALL',
                    label: isKhmer ? 'អតិថិជនទាំងអស់' : 'All Customers',
                    icon: Users,
                    desc: isKhmer ? 'ផ្ញើទៅគ្រប់គ្នា' : 'Everyone',
                  },
                  {
                    id: 'USER',
                    label: isKhmer ? 'អតិថិជនជាក់លាក់' : 'Specific User',
                    icon: User,
                    desc: isKhmer ? 'ឈ្មោះ / Email / Phone' : 'By Name/Email',
                  },
                  {
                    id: 'SUBSCRIBERS',
                    label: isKhmer ? 'អ្នក Subscribe' : 'Subscribers',
                    icon: Mail,
                    desc: isKhmer ? 'Newsletter Leads' : 'Leads list',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = target === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTarget(item.id as 'ALL' | 'USER' | 'SUBSCRIBERS');
                        if (item.id !== 'USER') {
                          setSelectedUser(null);
                          setTargetUserIdentifier('');
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        active
                          ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-500 dark:border-primary-600 shadow-xs ring-2 ring-primary-500/20'
                          : 'bg-slate-50/50 hover:bg-slate-100/70 dark:bg-surface-850 dark:hover:bg-surface-800 border-slate-200/80 dark:border-white/[0.06]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                      <p className={`text-xs font-bold truncate ${active ? 'text-primary-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Specific User Search (If target === 'USER') */}
            {target === 'USER' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2.5"
              >
                <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  {isKhmer ? 'ស្វែងរកអតិថិជនតាមឈ្មោះ អ៊ីមែល ឬលេខទូរស័ព្ទ' : 'Search Customer by Name, Email, or Phone'}:
                </label>

                {selectedUser ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-800 border border-indigo-200 dark:border-indigo-700 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedUser.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {selectedUser.email || selectedUser.phone || selectedUser.id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setTargetUserIdentifier('');
                        setUserQuery('');
                      }}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:underline px-2 py-1"
                    >
                      {isKhmer ? 'ផ្លាស់ប្តូរ' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        className="input pl-9 h-10 text-xs w-full bg-white dark:bg-surface-850"
                        placeholder={isKhmer ? 'ឧទាហរណ៍៖ Sokhun, user@gmail.com, 097...' : 'e.g., Sokhun, customer@mail.com'}
                        value={userQuery}
                        onChange={(e) => {
                          setUserQuery(e.target.value);
                          setTargetUserIdentifier(e.target.value);
                        }}
                      />
                      {isSearchingUsers && (
                        <div className="absolute right-3">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-500" />
                        </div>
                      )}
                    </div>

                    {/* Candidate Results Dropdown */}
                    {userCandidates.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-surface-850 border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xl z-30 overflow-hidden max-h-48 overflow-y-auto">
                        {userCandidates.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setTargetUserIdentifier(u.id);
                              setUserCandidates([]);
                            }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-950/40 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] transition last:border-0"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-white">{u.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{u.email || u.phone || u.id}</p>
                            </div>
                            <span className="text-[10px] font-bold text-primary-600 bg-primary-100 dark:bg-primary-950/80 px-2 py-0.5 rounded-md">
                              {isKhmer ? 'ជ្រើសរើស' : 'Select'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. Notification Type / Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {isKhmer ? '២. ប្រភេទសារ (Notification Category)' : '2. Category'}:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ANNOUNCEMENT', label: isKhmer ? '📢 ដំណឹងហាង' : 'Announcement', icon: Megaphone },
                  { id: 'PROMOTION', label: isKhmer ? '🎁 ប្រូម៉ូសិន' : 'Promotion', icon: Gift },
                  { id: 'ORDER_UPDATE', label: isKhmer ? '📦 ការកម្មង់' : 'Order Update', icon: Package },
                  { id: 'URGENT', label: isKhmer ? '🚨 បន្ទាន់' : 'Urgent Alert', icon: AlertTriangle },
                ].map((item) => {
                  const active = type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as typeof type)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                          : 'bg-white dark:bg-surface-850 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-slate-300'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Title Input with Quick Emoji Helpers */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isKhmer ? '៣. ចំណងជើងសេចក្តីជូនដំណឹង' : '3. Subject / Title'} <span className="text-rose-500">*</span>:
                </label>
                <div className="flex items-center gap-1">
                  {['🎉', '📢', '🔥', '⚡', '📦', '⚠️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setTitle((prev) => `${emoji} ${prev}`)}
                      className="px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-surface-800 text-xs transition"
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                className="input h-10 text-xs font-semibold"
                placeholder={
                  type === 'PROMOTION'
                    ? isKhmer
                      ? '🎉 ប្រូម៉ូសិនពិសេសចុងសប្តាហ៍ បញ្ចុះតម្លៃ 20% គ្រប់មុខទំនិញ!'
                      : '🎉 Weekend Flash Sale: 20% Off All Items!'
                    : isKhmer
                    ? '📢 សេចក្តីជូនដំណឹងស្តីពីការផ្លាស់ប្តូរម៉ោងដឹកជញ្ជូន'
                    : '📢 Important Update: Express Delivery Available'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* 4. Message Content */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isKhmer ? '៤. ខ្លឹមសារលម្អិតនៃសេចក្តីជូនដំណឹង' : '4. Notification Message Content'} <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={4}
                className="input py-2.5 text-xs leading-relaxed resize-none"
                placeholder={
                  isKhmer
                    ? 'សូមជម្រាបជូនអតិថិជនជាទីគោរព... សូមរីករាយជាមួយកាដូបញ្ចុះតម្លៃពិសេស និងការដឹកជញ្ជូនរហ័ស!'
                    : 'Dear valued customers, we are excited to announce our upcoming promotion...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            {/* 5. Optional Action URL with Quick Product & Coupon Pickers */}
            <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-surface-800/40 border border-slate-200/70 dark:border-white/[0.06]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isKhmer ? '៥. តំណភ្ជាប់សកម្មភាព (Action Link - មិនបង្ខំ)' : '5. Action Link (Optional)'}:
                </label>

                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLinkPickerMode((prev) => (prev === 'PRODUCT' ? 'NONE' : 'PRODUCT'))}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                      linkPickerMode === 'PRODUCT'
                        ? 'bg-primary-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-surface-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-surface-700 hover:border-primary-400'
                    }`}
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <span>{isKhmer ? '📦 ជ្រើសទំនិញ' : 'Pick Product'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkPickerMode((prev) => (prev === 'COUPON' ? 'NONE' : 'COUPON'))}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                      linkPickerMode === 'COUPON'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-surface-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-surface-700 hover:border-amber-400'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{isKhmer ? '🎟️ ជ្រើសគូប៉ុង' : 'Pick Coupon'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Preset Badges */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10.5px] font-bold text-slate-400">{isKhmer ? 'គំរូទូទៅ៖' : 'Presets:'}</span>
                <button
                  type="button"
                  onClick={() => { setLink('/products'); setLinkPickerMode('NONE'); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    link === '/products'
                      ? 'bg-primary-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-surface-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-surface-700 hover:bg-slate-100'
                  }`}
                >
                  🛍️ {isKhmer ? 'គ្រប់ទំនិញ' : 'All Products'} (/products)
                </button>
                <button
                  type="button"
                  onClick={() => { setLink('/products?deals=true'); setLinkPickerMode('NONE'); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    link === '/products?deals=true'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-surface-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-surface-700 hover:bg-slate-100'
                  }`}
                >
                  🔥 {isKhmer ? 'បញ្ចុះតម្លៃ' : 'Deals'}
                </button>
                <button
                  type="button"
                  onClick={() => { setLink('/products?featured=true'); setLinkPickerMode('NONE'); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    link === '/products?featured=true'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-surface-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-surface-700 hover:bg-slate-100'
                  }`}
                >
                  ⭐ {isKhmer ? 'ទំនិញលេចធ្លោ' : 'Featured'}
                </button>
                <button
                  type="button"
                  onClick={() => { setLink('/coupons'); setLinkPickerMode('NONE'); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    link === '/coupons'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-surface-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-surface-700 hover:bg-slate-100'
                  }`}
                >
                  🎟️ {isKhmer ? 'ទំព័រគូប៉ុង' : 'Coupons'}
                </button>
                {link && (
                  <button
                    type="button"
                    onClick={() => { setLink(''); setLinkPickerMode('NONE'); }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-auto"
                  >
                    ✕ {isKhmer ? 'លុប Link' : 'Clear Link'}
                  </button>
                )}
              </div>

              {/* Product Picker Drawer */}
              {linkPickerMode === 'PRODUCT' && (
                <div className="p-3 rounded-xl bg-white dark:bg-surface-900 border border-primary-200 dark:border-primary-800/60 shadow-md space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isKhmer ? 'ចុចលើទំនិញដើម្បីដាក់ Link ស្វ័យប្រវត្តិ៖' : 'Select a product to link:'}</span>
                    </span>
                    <input
                      type="text"
                      placeholder={isKhmer ? 'ស្វែងរកឈ្មោះទំនិញ...' : 'Filter products...'}
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-7 px-2.5 text-[11px] rounded-lg bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 w-48 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {availableProducts.length === 0 ? (
                      <p className="col-span-2 text-center py-4 text-xs text-slate-400">
                        {isKhmer ? 'មិនមានទំនិញ' : 'No products found'}
                      </p>
                    ) : (
                      availableProducts
                        .filter((p) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .slice(0, 30)
                        .map((p) => {
                          const targetUrl = `/products/${p.slug || p.id}`;
                          const isSelected = link === targetUrl;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setLink(targetUrl);
                                setLinkPickerMode('NONE');
                                toast.success(isKhmer ? `បានភ្ជាប់តំណទំនិញ: ${p.name}` : `Linked product: ${p.name}`);
                              }}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 ring-1 ring-primary-500 text-primary-700 dark:text-primary-300'
                                  : 'bg-slate-50/60 dark:bg-surface-800/60 border-slate-200/60 dark:border-surface-700/60 hover:bg-slate-100 dark:hover:bg-surface-750'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-surface-700 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">
                                {p.thumbnail ? (
                                  <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  '📦'
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</p>
                                <p className="text-[10px] font-mono text-slate-400 truncate">{targetUrl}</p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* Coupon Picker Drawer */}
              {linkPickerMode === 'COUPON' && (
                <div className="p-3 rounded-xl bg-white dark:bg-surface-900 border border-amber-200 dark:border-amber-800/60 shadow-md space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'ចុចលើគូប៉ុងដើម្បីភ្ជាប់ Link ទៅកាន់ការបញ្ចុះតម្លៃ៖' : 'Select a coupon to link:'}</span>
                  </span>
                  <div className="max-h-52 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {availableCoupons.length === 0 ? (
                      <p className="col-span-2 text-center py-4 text-xs text-slate-400">
                        {isKhmer ? 'មិនទាន់មានគូប៉ុងសកម្មទេ' : 'No active coupons found'}
                      </p>
                    ) : (
                      availableCoupons.map((c) => {
                        const targetUrl = `/products?coupon=${c.code}`;
                        const isSelected = link === targetUrl;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setLink(targetUrl);
                              setLinkPickerMode('NONE');
                              toast.success(isKhmer ? `បានភ្ជាប់គូប៉ុង: ${c.code}` : `Linked coupon: ${c.code}`);
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-1 ring-amber-500 text-amber-800 dark:text-amber-200'
                                : 'bg-slate-50/60 dark:bg-surface-800/60 border-slate-200/60 dark:border-surface-700/60 hover:bg-slate-100 dark:hover:bg-surface-750'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">{c.code}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                                  {c.discountType === 'PERCENT' ? `${c.discount}% OFF` : `$${c.discount} OFF`}
                                </span>
                              </div>
                              <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{targetUrl}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* URL Input Box */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  className="input h-9.5 text-xs font-mono pr-8 w-full font-medium"
                  placeholder="e.g. /products/slug-name or /products?deals=true"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
                {link && (
                  <button
                    type="button"
                    onClick={() => setLink('')}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 6. Telegram Channel Delivery Checkbox */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendTelegram}
                  onChange={(e) => setSendTelegram(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isKhmer ? '✈️ ផ្ញើច្បាប់ចម្លងផ្សាយលើ Telegram Bot / Channel ផ្ទាល់' : '✈️ Forward copy to Telegram Channel / Bot'}
                </span>
              </label>
            </div>

            {/* Submit Action Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSending}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white font-bold text-sm shadow-lg shadow-primary-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isKhmer ? 'កំពុងដំណើរការផ្ញើ...' : 'Broadcasting notification...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {target === 'USER'
                        ? isKhmer
                          ? `ផ្ញើសារជូនដំណឹងទៅកាន់ ${selectedUser?.name || 'អតិថិជន'}`
                          : `Send to ${selectedUser?.name || 'Customer'}`
                        : target === 'SUBSCRIBERS'
                        ? isKhmer
                          ? 'ផ្ញើទៅកាន់អ្នក Subscribe ទាំងអស់'
                          : 'Send to All Subscribers'
                        : isKhmer
                        ? '🚀 ផ្សាយសេចក្តីជូនដំណឹងទៅអតិថិជនទាំងអស់'
                        : '🚀 Broadcast to All Customers'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Live Customer Preview & Broadcast History */}
        <div className="lg:col-span-5 space-y-6">
          {historyTab === 'preview' ? (
            /* Live Device Preview */
            <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <Eye className="w-4 h-4 text-emerald-500" />
                  <span>{isKhmer ? 'ទម្រង់បង្ហាញលើអេក្រង់អតិថិជន' : 'Live Customer Preview'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Real-time
                </span>
              </div>

              {/* Notification Card Mockup */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {isKhmer ? 'កាត Popover ក្នុង Notification Bell:' : 'Customer Popover Card:'}
                </p>

                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-surface-850 dark:to-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-md space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTypeBadge(type).classes}`}>
                        {getTypeBadge(type).label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                      {title.trim() || (isKhmer ? 'ចំណងជើងសេចក្តីជូនដំណឹងនឹងបង្ហាញនៅទីនេះ' : 'Notification Title will appear here')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                      {message.trim() || (isKhmer ? 'ខ្លឹមសារលម្អិតនៃសារជូនដំណឹងរបស់អ្នកនឹងបង្ហាញនៅទីនេះ...' : 'Detailed message preview will update here as you type...')}
                    </p>
                  </div>

                  {link.trim() && (
                    <div className="pt-2 border-t border-slate-150 dark:border-white/[0.06] flex justify-end">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline">
                        <span>{isKhmer ? 'ចូលមើលព័ត៌មានលម្អិត' : 'View Details'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Storefront Top Announcement Banner Mockup */}
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {isKhmer ? 'ផ្ទាំង Banner លើកំពូលទំព័រដើម:' : 'Storefront Top Bar Preview:'}
                </p>

                <div className="p-3 rounded-2xl bg-gradient-to-r from-primary-700 via-indigo-700 to-violet-800 text-white flex items-center justify-between gap-2 shadow-sm text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Megaphone className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="font-bold truncate">
                      {title.trim() || (isKhmer ? 'ប្រកាសដំណឹងពិសេសពីហាង' : 'Special Store Notice')}
                    </span>
                  </div>
                  {link.trim() && (
                    <span className="shrink-0 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold">
                      {isKhmer ? 'មើលភ្លាម' : 'Check Now'}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Info */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-850 border border-slate-200/60 dark:border-white/[0.06] flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {isKhmer
                    ? 'សារដែលបានផ្ញើត្រូវបាន Sync ទៅកាន់ Database និង Telegram ក្នុងពេលដំណាលគ្នា។'
                    : 'Broadcasts are saved to database and synced to Telegram channels simultaneously.'}
                </span>
              </div>
            </div>
          ) : (
            /* Broadcast History Table */
            <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <History className="w-4 h-4 text-primary-500" />
                  <span>{isKhmer ? 'ប្រវត្តិសេចក្តីជូនដំណឹងកន្លងមក' : 'Broadcast History'}</span>
                </div>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search & Filter */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={isKhmer ? 'ស្វែងរកតាមចំណងជើង...' : 'Search title...'}
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="input h-8 text-xs flex-1"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="input h-8 text-[11px] py-0 px-2"
                >
                  <option value="ALL">{isKhmer ? 'គ្រប់ប្រភេទ' : 'All Types'}</option>
                  <option value="ANNOUNCEMENT">📢 Announcement</option>
                  <option value="PROMOTION">🎁 Promotion</option>
                  <option value="ORDER_UPDATE">📦 Order</option>
                  <option value="URGENT">🚨 Urgent</option>
                </select>
              </div>

              {/* History List */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar">
                {isLoadingHistory ? (
                  <p className="text-center py-8 text-xs text-slate-400">Loading history...</p>
                ) : historyList.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">
                    {isKhmer ? 'មិនទាន់មានប្រវត្តិជូនដំណឹងឡើយ' : 'No notifications sent yet'}
                  </p>
                ) : (
                  historyList.map((item) => {
                    const typeBadge = getTypeBadge(item.type);
                    const targetBadge = getTargetBadge(item.target, item.user);
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 dark:bg-surface-850 dark:hover:bg-surface-800 border border-slate-200/70 dark:border-white/[0.06] transition space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${typeBadge.classes}`}>
                              {typeBadge.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${targetBadge.classes}`}>
                              {targetBadge.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{item.title}</h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{item.message}</p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-150 dark:border-white/[0.04]">
                          <span>{item.sentBy ? `By ${item.sentBy}` : 'Admin'}</span>
                          <span className="font-mono">
                            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
