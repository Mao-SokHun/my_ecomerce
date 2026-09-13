'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Bell,
  ExternalLink,
  Check,
  CheckCheck,
  Megaphone,
  Gift,
  Package,
  AlertTriangle,
  X,
} from 'lucide-react';
import { notificationApi } from '@/lib/api';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { playMessageAlertChime } from '@/lib/soundAlert';
import { useRealtime } from '@/providers/RealtimeProvider';
import toast from 'react-hot-toast';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'PROMOTION' | 'ORDER_UPDATE' | 'SYSTEM' | 'URGENT';
  target: 'ALL' | 'USER' | 'SUBSCRIBERS';
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const { language } = useLanguageStore();
  const { isAuthenticated } = useAuthStore();
  const isKhmer = language === 'km';

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(-1);
  const isFirstLoadRef = useRef<boolean>(true);

  // Fetch Unread Count and Notifications
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [notifsRes, unreadRes] = await Promise.allSettled([
        notificationApi.getCustomerNotifications({ limit: 15 }),
        notificationApi.getUnreadCount(),
      ]);

      let localReadIds: string[] = [];
      try {
        const raw = localStorage.getItem('dismissed_store_announcements_v1');
        const rawRead = localStorage.getItem('read_notifications_v1');
        const list1 = raw ? JSON.parse(raw) : [];
        const list2 = rawRead ? JSON.parse(rawRead) : [];
        localReadIds = Array.from(new Set([...list1, ...list2]));
      } catch {
        /* ignore */
      }

      if (notifsRes.status === 'fulfilled') {
        const list = (notifsRes.value.data?.data || []) as Notification[];
        // Filter out any leaked admin links or chat alert notifications
        const filtered = list.filter(
          (item) =>
            !item.link?.includes('/admin') &&
            !item.title?.toLowerCase().includes('chat') &&
            !item.title?.includes('សំណួរ') &&
            !item.title?.includes('សារថ្មី')
        );
        const mapped = filtered.map((item) => ({
          ...item,
          isRead: item.isRead || localReadIds.includes(item.id),
        }));
        setNotifications(mapped);

        const realUnread = mapped.filter((n) => !n.isRead).length;
        setUnreadCount(realUnread);

        if (silent && !isFirstLoadRef.current && realUnread > prevCountRef.current && prevCountRef.current >= 0) {
          playMessageAlertChime();
        }
        prevCountRef.current = realUnread;
        isFirstLoadRef.current = false;
      } else if (unreadRes.status === 'fulfilled') {
        const count = Number(unreadRes.value.data?.data?.unreadCount || 0);
        setUnreadCount(count);
      }
    } catch {
      /* ignore */
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const { socket } = useRealtime();

  // Instant Real-time WebSocket listener for new notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotif: Notification) => {
      if (!newNotif || !newNotif.id) return;
      // Do not display internal admin links or chat inquiries in customer notification bell
      if (
        newNotif.link?.includes('/admin') ||
        newNotif.title?.toLowerCase().includes('chat') ||
        newNotif.title?.includes('សំណួរ') ||
        newNotif.title?.includes('សារថ្មី')
      ) {
        return;
      }
      playMessageAlertChime();
      toast.success(`📢 ${newNotif.title}: ${newNotif.message}`, { duration: 6000 });

      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === newNotif.id);
        if (exists) return prev;
        return [{ ...newNotif, isRead: false }, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    const handleDeleteNotification = (data: { id: string }) => {
      if (!data || !data.id) return;
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === data.id);
        if (target && !target.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== data.id);
      });
    };

    socket.on('NOTIFICATION_NEW', handleNewNotification);
    socket.on('NOTIFICATION_DELETED', handleDeleteNotification);

    return () => {
      socket.off('NOTIFICATION_NEW', handleNewNotification);
      socket.off('NOTIFICATION_DELETED', handleDeleteNotification);
    };
  }, [socket]);

  // Background fallback poll every 45s
  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchNotifications(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      try {
        const raw = localStorage.getItem('dismissed_store_announcements_v1');
        const rawRead = localStorage.getItem('read_notifications_v1');
        const list1 = raw ? JSON.parse(raw) : [];
        const list2 = rawRead ? JSON.parse(rawRead) : [];
        const set = new Set([...list1, ...list2, id]);
        localStorage.setItem('dismissed_store_announcements_v1', JSON.stringify(Array.from(set)));
        localStorage.setItem('read_notifications_v1', JSON.stringify(Array.from(set)));
      } catch {
        /* ignore */
      }

      notificationApi.markAsRead(id).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      try {
        const allIds = notifications.map((n) => n.id);
        const raw = localStorage.getItem('dismissed_store_announcements_v1');
        const rawRead = localStorage.getItem('read_notifications_v1');
        const list1 = raw ? JSON.parse(raw) : [];
        const list2 = rawRead ? JSON.parse(rawRead) : [];
        const set = new Set([...list1, ...list2, ...allIds]);
        localStorage.setItem('dismissed_store_announcements_v1', JSON.stringify(Array.from(set)));
        localStorage.setItem('read_notifications_v1', JSON.stringify(Array.from(set)));
      } catch {
        /* ignore */
      }

      notificationApi.markAllAsRead().catch(() => {});

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PROMOTION':
        return {
          label: isKhmer ? '🎁 ប្រូម៉ូសិន' : '🎁 Promotion',
          classes: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/40',
          icon: Gift,
        };
      case 'URGENT':
        return {
          label: isKhmer ? '🚨 បន្ទាន់' : '🚨 Urgent',
          classes: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40',
          icon: AlertTriangle,
        };
      case 'ORDER_UPDATE':
        return {
          label: isKhmer ? '📦 ការកម្មង់' : '📦 Order',
          classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/40',
          icon: Package,
        };
      default:
        return {
          label: isKhmer ? '📢 ដំណឹងហាង' : '📢 Announcement',
          classes: 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 border-primary-200/80 dark:border-primary-800/40',
          icon: Megaphone,
        };
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    activeFilter === 'UNREAD' ? !n.isRead : true
  );

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) void fetchNotifications();
        }}
        aria-label="Store notifications"
        title={isKhmer ? 'ការជូនដំណឹងពីហាង' : 'Store Notifications'}
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-surface-800/80 dark:hover:bg-surface-750 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all border border-slate-200/60 dark:border-white/[0.08] active:scale-95 shadow-2xs"
      >
        <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-[#12151c] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
            className="absolute right-0 mt-2.5 w-[350px] sm:w-[390px] rounded-2xl bg-white dark:bg-[#12161f] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/25 dark:shadow-black/80 z-50 overflow-hidden"
          >
            {/* Popover Header */}
            <div className="p-4 bg-slate-50 dark:bg-[#181d28] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-400 flex items-center justify-center shadow-xs">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {isKhmer ? 'ការជូនដំណឹងពីហាង' : 'Store Notifications'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {unreadCount > 0
                      ? isKhmer
                        ? `អ្នកមានសារមិនទាន់អាន ${unreadCount}`
                        : `${unreadCount} unread alerts`
                      : isKhmer
                      ? 'ទាន់សម័យទាំងអស់'
                      : 'All caught up'}
                  </p>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200/60 dark:border-primary-800/60 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition shadow-2xs"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{isKhmer ? 'អានទាំងអស់' : 'Mark all read'}</span>
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#0e1118] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {isKhmer ? 'ទាំងអស់' : 'All'} ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('UNREAD')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === 'UNREAD'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {isKhmer ? 'មិនទាន់អាន' : 'Unread'} ({unreadCount})
              </button>
            </div>

            {/* Notification List Body */}
            <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/70 overscroll-contain">
              {isLoading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-slate-400">
                  {isKhmer ? 'កំពុងផ្ទុក...' : 'Loading notifications...'}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                    <Bell className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {isKhmer ? 'មិនទាន់មានសេចក្តីជូនដំណឹងថ្មីទេ' : 'No notifications found'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isKhmer
                      ? 'ដំណឹងប្រូម៉ូសិន និងការប្រកាសពីហាងនឹងបង្ហាញនៅទីនេះ'
                      : 'Store announcements and offers will appear here'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const badge = getTypeBadge(item.type);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleMarkAsRead(item.id)}
                      className={`p-4 transition-colors relative cursor-pointer group ${
                        !item.isRead
                          ? 'bg-primary-50/50 dark:bg-primary-950/25 hover:bg-primary-50/80 dark:hover:bg-primary-950/40 border-l-4 border-l-primary-500'
                          : 'bg-white dark:bg-[#12161f] hover:bg-slate-50 dark:hover:bg-[#181d28] border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Unread dot indicator */}
                      {!item.isRead && (
                        <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-primary-600 dark:bg-primary-400 ring-4 ring-primary-500/20" />
                      )}

                      <div className="flex items-center gap-2 mb-1.5 pr-6">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border ${badge.classes}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                          {new Date(item.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line break-words">
                        {item.message}
                      </p>

                      {item.link && (
                        <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <Link
                            href={item.link}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline"
                          >
                            <span>{isKhmer ? 'ចូលមើលឥឡូវនេះ' : 'View Details'}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {!item.isRead && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(item.id, e)}
                              className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              {isKhmer ? 'គូសជាអានរួច' : 'Mark read'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
