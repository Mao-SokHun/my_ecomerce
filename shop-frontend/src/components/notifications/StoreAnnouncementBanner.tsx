'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Megaphone, Gift, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { notificationApi } from '@/lib/api';
import { useLanguageStore } from '@/store/languageStore';

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'PROMOTION' | 'ORDER_UPDATE' | 'SYSTEM' | 'URGENT';
  link?: string | null;
  createdAt: string;
};

const DISMISSED_KEY = 'dismissed_store_announcements_v1';

export function StoreAnnouncementBanner() {
  const { language } = useLanguageStore();
  const isKhmer = language === 'km';

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    notificationApi
      .getLatestAnnouncement()
      .then(({ data }) => {
        const item = data?.data as Announcement | null;
        if (item && item.id) {
          // Strict Guard: Never display admin links, support tickets, or chat alerts on the storefront
          if (
            item.link?.includes('/admin') ||
            item.title?.toLowerCase().includes('chat') ||
            item.title?.includes('សំណួរ') ||
            item.title?.includes('សារថ្មី')
          ) {
            return;
          }
          try {
            const raw = localStorage.getItem(DISMISSED_KEY);
            const dismissedList: string[] = raw ? JSON.parse(raw) : [];
            if (!dismissedList.includes(item.id)) {
              setAnnouncement(item);
              setIsDismissed(false);
            }
          } catch {
            setAnnouncement(item);
            setIsDismissed(false);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = useCallback(() => {
    if (announcement?.id) {
      try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        const dismissedList: string[] = raw ? JSON.parse(raw) : [];
        if (!dismissedList.includes(announcement.id)) {
          dismissedList.push(announcement.id);
          localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedList));
        }
      } catch {
        /* ignore */
      }
      // Also mark as read in backend
      notificationApi.markAsRead(announcement.id).catch(() => {});
    }
    setIsDismissed(true);
  }, [announcement]);

  if (isDismissed || !announcement) return null;
  if (announcement.link?.includes('/admin') || announcement.title?.includes('Chat') || announcement.title?.includes('សំណួរ')) {
    return null;
  }

  const isPromo = announcement.type === 'PROMOTION';
  const isUrgent = announcement.type === 'URGENT';

  return (
    <div
      className={`relative py-2.5 px-4 text-xs font-semibold text-white transition-all overflow-hidden ${
        isPromo
          ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-primary-600'
          : isUrgent
          ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600'
          : 'bg-gradient-to-r from-primary-700 via-indigo-700 to-violet-800'
      }`}
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            {isPromo ? (
              <Gift className="w-3.5 h-3.5 text-white animate-bounce" />
            ) : isUrgent ? (
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            ) : (
              <Megaphone className="w-3.5 h-3.5 text-amber-300" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-extrabold truncate">{announcement.title}</span>
            <span className="hidden sm:inline text-white/80 font-normal truncate">• {announcement.message}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {announcement.link && (
            <Link
              href={announcement.link}
              onClick={handleDismiss}
              className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white text-white hover:text-slate-900 text-[11px] font-bold transition flex items-center gap-1 backdrop-blur-md"
            >
              <span>
                {isPromo
                  ? (isKhmer ? 'មើលប្រូម៉ូសិន' : 'Explore Promo')
                  : isUrgent
                  ? (isKhmer ? 'ព័ត៌មានលម្អិត' : 'Details')
                  : (isKhmer ? 'ស្វែងយល់បន្ថែម' : 'Learn More')}
              </span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="w-6 h-6 rounded-lg bg-black/10 hover:bg-black/25 flex items-center justify-center text-white transition active:scale-90"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
