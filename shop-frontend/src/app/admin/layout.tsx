'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag,
  LogOut, Menu, X, Store, Settings, FolderTree, Sun, Moon, ChevronDown, Globe, PanelLeftClose,
  Mail, MessageSquare, Sliders, Phone, Compass, Image as ImageIcon, FileText, Receipt,
  Bell, AlertTriangle, Flame, ArrowRight, CheckCircle2, BellRing, CircleDollarSign, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { authApi } from '@/lib/api';
import { adminT } from '@/lib/admin-i18n';
import { adminApi } from '@/lib/api';
import { useRealtime } from '@/providers/RealtimeProvider';
import { playMessageAlertChime } from '@/lib/soundAlert';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, key: 'navDashboard' },
  { href: '/admin/products', icon: Package, key: 'navProducts' },
  { href: '/admin/categories', icon: FolderTree, key: 'navCategories' },
  { href: '/admin/orders', icon: ShoppingCart, key: 'navOrders' },
  { href: '/admin/analytics', icon: CircleDollarSign, key: 'navAnalytics' },
  { href: '/admin/users', icon: Users, key: 'navUsers' },
  { href: '/admin/leads', icon: Mail, key: 'navLeads' },
  { href: '/admin/support-inbox', icon: MessageSquare, key: 'navSupportInbox' },
  { href: '/admin/notifications', icon: BellRing, key: 'navNotifications' },
  { href: '/admin/coupons', icon: Tag, key: 'navCoupons' },
  { href: '/admin/settings', icon: Settings, key: 'navSettings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthChecked } = useAuthStore();
  const { isDark, setTheme } = useThemeStore();
  const { language, setLanguage } = useAdminLanguageStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDirectAdmin = user?.role === 'ADMIN';
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [liveCounts, setLiveCounts] = useState<{ orders: number | null; users: number | null; leads: number | null; lowStock: number | null; support: number | null }>({
    orders: null,
    users: null,
    leads: null,
    lowStock: null,
    support: null,
  });
  const [badgeFlash, setBadgeFlash] = useState<{ orders: boolean; users: boolean; leads: boolean; support: boolean }>({
    orders: false,
    users: false,
    leads: false,
    support: false,
  });
  /** Bumped when visiting a section (mark-seen) so in-flight poll responses cannot overwrite fresh counts. */
  const unreadPullGenerationRef = useRef(0);

  useEffect(() => {
    // Hydrate from localStorage on client mount
    try {
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.user?.role === 'ADMIN') {
          setAdminUser(parsed.state.user);
          setIsCheckingAccess(false);
        }
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthChecked) return;

    if (!user && !adminUser) {
      router.push('/login');
      setIsCheckingAccess(false);
      return;
    }

    if (user && user.role !== 'ADMIN') {
      router.push('/');
      setIsCheckingAccess(false);
      return;
    }

    let isSubscribed = true;
    authApi
      .getMe()
      .then(({ data }) => {
        if (!isSubscribed) return;
        const me = data.data as { name: string; role: string };
        if (me?.role !== 'ADMIN') {
          router.push('/');
          return;
        }
        setAdminUser(me);
      })
      .catch(() => {
        if (!isSubscribed) return;
        if (!user || user.role !== 'ADMIN') {
          router.push('/login');
        }
      })
      .finally(() => {
        if (isSubscribed) setIsCheckingAccess(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [mounted, isAuthChecked, user, adminUser, router]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    if (!isAuthChecked || (!adminUser && user?.role !== 'ADMIN')) return;
    let mounted = true;
    let prevLeads = -1;
    let prevOrders = -1;
    let prevUsers = -1;
    let prevSupport = -1;
    const pull = async () => {
      const gen = ++unreadPullGenerationRef.current;
      try {
        const { data } = await adminApi.getUnreadCounts();
        if (!mounted || gen !== unreadPullGenerationRef.current) return;
        const counts = data.data || {};
        const nextOrders = Number(counts.orders || 0);
        const nextUsers = Number(counts.users || 0);
        const nextLeads = Number(counts.leads || 0);
        const nextSupport = Number(counts.support || 0);
        setLiveCounts({
          orders: nextOrders,
          users: nextUsers,
          leads: nextLeads,
          lowStock: Number(counts.lowStock || 0),
          support: nextSupport,
        });
        if (prevOrders >= 0 && nextOrders > prevOrders) {
          setBadgeFlash((prev) => ({ ...prev, orders: true }));
          setTimeout(() => setBadgeFlash((prev) => ({ ...prev, orders: false })), 1200);
        }
        if (prevUsers >= 0 && nextUsers > prevUsers) {
          setBadgeFlash((prev) => ({ ...prev, users: true }));
          setTimeout(() => setBadgeFlash((prev) => ({ ...prev, users: false })), 1200);
        }
        if (prevLeads >= 0 && nextLeads > prevLeads) {
          setBadgeFlash((prev) => ({ ...prev, leads: true }));
          setTimeout(() => setBadgeFlash((prev) => ({ ...prev, leads: false })), 1200);
        }
        if (prevSupport >= 0 && nextSupport > prevSupport) {
          setBadgeFlash((prev) => ({ ...prev, support: true }));
          setTimeout(() => setBadgeFlash((prev) => ({ ...prev, support: false })), 1200);
        }
        if (prevLeads >= 0 && Number(counts.leads || 0) > prevLeads) {
          toast.success(language === 'km' ? 'មាន subscriber ថ្មី' : language === 'zh' ? '有新的订阅用户' : 'New subscriber arrived');
        }
        prevOrders = nextOrders;
        prevUsers = nextUsers;
        prevLeads = nextLeads;
        prevSupport = nextSupport;
      } catch {
        // ignore
      }
    };
    pull();
    const timer = setInterval(pull, 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [isAuthChecked, adminUser, user?.role, language]);

  const { socket } = useRealtime();

  // Instant real-time alert for Admin when customer creates support inquiry
  useEffect(() => {
    if (!socket) return;
    const handleInquiry = (inquiry: any) => {
      if (!pathname.startsWith('/admin/support-inbox')) {
        playMessageAlertChime();
        toast(`💬 សំណួរ Chat ថ្មីពី ${inquiry?.name || 'អតិថិជន'}!`, { icon: '🔔', id: 'admin-live-inquiry' });
      }
      adminApi.getUnreadCounts().then(({ data }) => {
        const counts = data.data || {};
        setLiveCounts((prev) => ({
          ...prev,
          support: Number(counts.support || 0),
        }));
      }).catch(() => {});
    };

    socket.on('SUPPORT_INQUIRY_CREATED', handleInquiry);
    return () => {
      socket.off('SUPPORT_INQUIRY_CREATED', handleInquiry);
    };
  }, [socket, pathname]);

  useEffect(() => {
    if (!isAuthChecked || (!adminUser && user?.role !== 'ADMIN')) return;
    const type =
      pathname === '/admin/orders' || pathname.startsWith('/admin/orders/')
        ? 'orders'
        : pathname === '/admin/users' || pathname.startsWith('/admin/users/')
          ? 'users'
          : pathname === '/admin/leads' || pathname.startsWith('/admin/leads/')
            ? 'leads'
            : pathname === '/admin/support-inbox' || pathname.startsWith('/admin/support-inbox/')
              ? 'support'
              : null;
    if (!type) return;

    let cancelled = false;
    unreadPullGenerationRef.current += 1;
    (async () => {
      try {
        await adminApi.markSeen(type);
        const { data } = await adminApi.getUnreadCounts();
        if (cancelled) return;
        const counts = data.data || {};
        setLiveCounts({
          orders: Number(counts.orders || 0),
          users: Number(counts.users || 0),
          leads: Number(counts.leads || 0),
          lowStock: Number(counts.lowStock || 0),
          support: Number(counts.support || 0),
        });
      } catch {
        // keep last known counts
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, isAuthChecked, adminUser, user?.role]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleCompactSidebar = () => {
    setCompactSidebar((prev) => !prev);
  };

  const hasAdminAccess = user?.role === 'ADMIN' || adminUser?.role === 'ADMIN';

  if (!mounted || (!hasAdminAccess && (!isAuthChecked || isCheckingAccess))) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-surface-950 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center shadow-lg animate-pulse">
            <Store className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
            {language === 'km' ? 'កំពុងផ្ទៀងផ្ទាត់សិទ្ធិ...' : 'Authenticating...'}
          </p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) return null;
  const activeUser = user || adminUser;
  const langLabel = language === 'km' ? 'ខ្មែរ' : language === 'zh' ? '中文' : 'English';
  const settingsActive = pathname.startsWith('/admin/settings');
  const isKhmer = language === 'km';
  const currentNav =
    navItems.find((item) => item.href === pathname) ||
    navItems.find((item) => item.href !== '/admin' && pathname.startsWith(`${item.href}/`)) ||
    (pathname.startsWith('/admin/settings') ? navItems.find((i) => i.href === '/admin/settings') : undefined);
  const pageTitle = adminT(language, currentNav?.key || 'navDashboard');

  return (
    <div
      className="min-h-screen bg-slate-100 dark:bg-surface-950 flex relative overflow-x-hidden font-sans"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      <div className="pointer-events-none absolute -top-20 -right-16 w-80 h-80 rounded-full bg-primary-200/40 dark:bg-primary-900/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-indigo-200/30 dark:bg-indigo-900/20 blur-3xl" />
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 ${
          compactSidebar ? 'w-[92px]' : 'w-[280px]'
        } bg-white/95 dark:bg-[#12151c] backdrop-blur-2xl border-r border-slate-200/90 dark:border-white/[0.08] shadow-xl shadow-slate-300/30 dark:shadow-black/50 transform transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header Brand Bar */}
          <div className={`p-4 border-b border-slate-200/80 dark:border-white/[0.08] ${compactSidebar ? 'space-y-3' : ''}`}>
            <div className={`flex items-center ${compactSidebar ? 'justify-center' : 'justify-between'} gap-2`}>
              <Link href="/" className={`flex items-center ${compactSidebar ? 'justify-center' : ''} gap-3 group`}>
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-primary-500/25 group-hover:scale-105 transition-transform">
                  <Store className="w-5 h-5" />
                </span>
                {!compactSidebar && (
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight">
                      SH Shop
                    </span>
                    <span className="text-[10.5px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                      Admin Console
                    </span>
                  </div>
                )}
              </Link>
              {!compactSidebar && (
                <button
                  type="button"
                  onClick={toggleCompactSidebar}
                  className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200/60 dark:border-white/[0.08] transition-all"
                  title="Compact sidebar"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Compact</span>
                </button>
              )}
            </div>
            {compactSidebar && (
              <button
                type="button"
                onClick={toggleCompactSidebar}
                className="hidden lg:inline-flex mx-auto px-2.5 py-1 text-[11px] font-semibold rounded-lg text-slate-600 hover:text-primary-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] transition-all"
                title="Expand sidebar"
              >
                Expand
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3.5 space-y-1.5 overscroll-contain">
            {!compactSidebar && (
              <div className="px-2.5 pt-1 pb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-400/90">
                  {isKhmer ? 'មុខងារសំខាន់' : 'Main Menu'}
                </span>
              </div>
            )}
            {navItems.map(({ href, icon: Icon, key }) => {
              const label = adminT(language, key);
              const isActive = pathname === href;
              const badgeCount =
                href === '/admin/orders'
                  ? (liveCounts.orders ?? 0)
                  : href === '/admin/users'
                    ? (liveCounts.users ?? 0)
                    : href === '/admin/leads'
                      ? (liveCounts.leads ?? 0)
                      : href === '/admin/support-inbox'
                        ? (liveCounts.support ?? 0)
                        : 0;
              const hasBadge = badgeCount > 0;
              const isFlashing =
                (href === '/admin/orders' && badgeFlash.orders) ||
                (href === '/admin/users' && badgeFlash.users) ||
                (href === '/admin/leads' && badgeFlash.leads) ||
                (href === '/admin/support-inbox' && badgeFlash.support);

              if (href === '/admin/settings') {
                const settingsSubmenu = [
                  { section: 'core', key: 'settingsMenuCore', Icon: Sliders },
                  { section: 'contact', key: 'settingsMenuContact', Icon: Phone },
                  { section: 'header', key: 'settingsMenuHeader', Icon: Compass },
                  { section: 'homepage', key: 'settingsMenuHomepage', Icon: ImageIcon },
                  { section: 'footer', key: 'settingsMenuFooter', Icon: FileText },
                  { section: 'invoice', key: 'settingsMenuInvoice', Icon: Receipt },
                ];

                if (compactSidebar) {
                  return (
                    <Link
                      key={href}
                      href="/admin/settings"
                      onClick={() => setSidebarOpen(false)}
                      title={label}
                      className={`group relative flex items-center justify-center h-12 rounded-2xl text-sm font-semibold transition-all ${
                        settingsActive
                          ? 'bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-primary-500/25'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                          settingsActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100/90 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.05]'
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </span>
                      <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition shadow-lg z-50">
                        {label}
                      </span>
                    </Link>
                  );
                }

                return (
                  <div key={href} className="space-y-1">
                    <div
                      className={`flex items-center justify-between rounded-2xl transition-all ${
                        settingsActive && !settingsOpen
                          ? 'bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-primary-500/25'
                          : settingsActive
                            ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200/80 dark:border-primary-800/40'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Link
                        href="/admin/settings"
                        onClick={() => setSidebarOpen(false)}
                        className="flex-1 h-11 flex items-center gap-3 px-2.5 text-[13.5px] font-semibold"
                      >
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                            settingsActive && !settingsOpen
                              ? 'bg-white/20 text-white'
                              : settingsActive
                                ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400'
                                : 'bg-slate-100/90 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.05]'
                          }`}
                        >
                          <Icon className="w-[18px] h-[18px]" />
                        </span>
                        <span className="truncate">{label}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen((v) => !v)}
                        className={`p-2 mr-1.5 rounded-xl transition-all ${
                          settingsActive && !settingsOpen
                            ? 'text-white/80 hover:text-white hover:bg-white/10'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.08]'
                        }`}
                        title={settingsOpen ? 'Collapse' : 'Expand'}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Clean Inline Submenu */}
                    {settingsOpen && (
                      <div className="ml-5 pl-3 border-l-2 border-primary-300 dark:border-primary-700/60 space-y-0.5 py-1">
                        {settingsSubmenu.map(({ section, key, Icon: SubIcon }) => (
                          <Link
                            key={section}
                            href={`/admin/settings?section=${section}`}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            <span>{adminT(language, key)}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  title={compactSidebar ? label : undefined}
                  className={`group relative flex items-center ${
                    compactSidebar ? 'justify-center h-12' : 'gap-3 px-2.5 h-11'
                  } rounded-2xl text-[13.5px] font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-primary-500/25'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/[0.06] hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100/90 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 group-hover:bg-primary-50 dark:group-hover:bg-primary-500/20 group-hover:text-primary-600 dark:group-hover:text-primary-300 border border-slate-200/60 dark:border-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>

                  {!compactSidebar && (
                    <span className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{label}</span>
                      {hasBadge && (
                        <span
                          className={`ml-2 min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center transition-all ${
                            isActive
                              ? 'bg-white text-primary-700 shadow-sm'
                              : 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                          } ${isFlashing ? 'animate-pulse ring-2 ring-rose-400/50' : ''}`}
                        >
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </span>
                  )}

                  {compactSidebar && hasBadge && (
                    <span
                      className={`absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold inline-flex items-center justify-center bg-rose-500 text-white ring-2 ring-white dark:ring-[#12151c] ${
                        isFlashing ? 'animate-pulse' : ''
                      }`}
                    >
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}

                  {compactSidebar && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition shadow-lg z-50">
                      {label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout Area */}
          <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.08] space-y-2 bg-slate-50/50 dark:bg-black/20">
            <div
              className={`flex items-center ${
                compactSidebar ? 'justify-center p-1.5' : 'gap-3 p-2'
              } rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] shadow-sm`}
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {activeUser?.name?.[0] || 'A'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#12151c] rounded-full" />
              </div>
              {!compactSidebar && (
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-white truncate leading-tight">
                    {activeUser?.name || 'Admin'}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {adminT(language, 'administrator')}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => { logout(); router.push('/'); }}
              className={`flex items-center ${
                compactSidebar ? 'justify-center' : 'justify-center gap-2'
              } w-full h-9 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl border border-rose-200/70 dark:border-rose-500/20 transition-all`}
              title={compactSidebar ? adminT(language, 'signOut') : undefined}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {!compactSidebar && <span>{adminT(language, 'signOut')}</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className={`flex-1 ${compactSidebar ? 'lg:ml-[92px]' : 'lg:ml-[280px]'} flex flex-col relative z-10 transition-all duration-300`}>
        <header
          className={`sticky top-0 z-30 px-5 h-[68px] flex items-center gap-4 transition-all duration-200 ${
            isScrolled
              ? 'bg-white/96 dark:bg-surface-900/96 backdrop-blur-xl border-b border-slate-200/80 dark:border-gray-800 shadow-md shadow-slate-200/30 dark:shadow-black/15'
              : 'bg-white/94 dark:bg-surface-900/92 backdrop-blur-xl border-b border-slate-100/90 dark:border-gray-800'
          }`}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1 min-w-0">
            {/* Main Page Title + Live Badge */}
            <div className="flex items-center gap-2">
              <h1
                className={`text-slate-900 dark:text-white font-extrabold truncate leading-tight ${
                  isKhmer ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl tracking-tight'
                }`}
              >
                {pageTitle}
              </h1>
              {pathname === '/admin' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-50/80 dark:bg-surface-800/70 border border-slate-200/70 dark:border-gray-700/70">
            {/* Notification Bell with Dynamic Low Stock & Orders Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className={`relative p-2 rounded-xl transition ${
                  (liveCounts.lowStock ?? 0) > 0
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
                    : (liveCounts.orders ?? 0) > 0
                    ? 'bg-primary-50 hover:bg-primary-100 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-surface-700'
                }`}
                title={isKhmer ? 'ការជូនដំណឹង & ការព្រមានស្តុក' : 'Notifications & Stock Alerts'}
              >
                <Bell className="w-4 h-4" />
                {((liveCounts.lowStock ?? 0) > 0 || (liveCounts.orders ?? 0) > 0) && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-surface-900 animate-pulse">
                    {(liveCounts.lowStock ?? 0) + (liveCounts.orders ?? 0)}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-surface-900 shadow-2xl overflow-hidden z-40">
                  <div className="p-3.5 bg-gradient-to-r from-slate-50 to-indigo-50/50 dark:from-surface-850 dark:to-surface-850 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {isKhmer ? 'មជ្ឈមណ្ឌលជូនដំណឹង (Alerts)' : 'Notifications & Alerts'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-3 space-y-2.5 max-h-80 overflow-y-auto">
                    {/* Stock Alert Item */}
                    {(liveCounts.lowStock ?? 0) > 0 ? (
                      <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              {isKhmer
                                ? `⚠️ ការព្រមាន: មាន ${liveCounts.lowStock} មុខទំនិញសល់ស្តុកតិច (≤5) ឬអស់ស្តុក!`
                                : `⚠️ Alert: ${liveCounts.lowStock} products have low stock (≤5) or are out of stock!`}
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                              {isKhmer ? 'សូមពិនិត្យ និងបំពេញស្តុកទំនិញឡើងវិញ' : 'Please check and restock these products'}
                            </p>
                            <Link
                              href="/admin/products?filter=low_stock"
                              onClick={() => setNotifOpen(false)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline mt-2"
                            >
                              <span>{isKhmer ? 'គ្រប់គ្រងស្តុកទំនិញ' : 'Manage & Restock Products'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{isKhmer ? 'ស្តុកទំនិញទាំងអស់មានគ្រប់គ្រាន់' : 'All product stock is healthy'}</span>
                      </div>
                    )}

                    {/* Orders Alert Item */}
                    {(liveCounts.orders ?? 0) > 0 ? (
                      <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                        <div className="flex items-start gap-2.5">
                          <ShoppingCart className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                              {isKhmer
                                ? `🛒 មាន ${liveCounts.orders} ការបញ្ជាទិញថ្មីមិនទាន់ពិនិត្យ`
                                : `🛒 You have ${liveCounts.orders} new unread orders`}
                            </p>
                            <Link
                              href="/admin/orders"
                              onClick={() => setNotifOpen(false)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:underline mt-1.5"
                            >
                              <span>{isKhmer ? 'ពិនិត្យមើល Orders' : 'View Orders'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Support Inbox Link */}
                    <Link
                      href="/admin/support-inbox"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 hover:bg-slate-100 dark:hover:bg-surface-750 text-xs text-gray-700 dark:text-gray-300 transition"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary-500" />
                        <span>{isKhmer ? 'ប្រអប់សារ Live Chat គាំទ្រ' : 'Live Support Inbox'}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="inline-flex items-center gap-2 text-sm bg-white dark:bg-surface-800/90 border border-slate-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:border-primary-300 dark:hover:border-primary-700 transition"
              >
                <Globe className="w-4 h-4 text-primary-500" />
                {langLabel}
                <ChevronDown className={`w-4 h-4 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-surface-900/95 backdrop-blur shadow-xl overflow-hidden z-30">
                  {[
                    { id: 'km', label: 'ខ្មែរ' },
                    { id: 'en', label: 'English' },
                    { id: 'zh', label: '中文' },
                  ].map((item) => {
                    const active = language === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setLanguage(item.id as 'km' | 'en' | 'zh');
                          setLangOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition ${
                          active
                            ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dark/Light Mode */}
            <div className="flex items-center bg-white dark:bg-surface-800 border border-slate-200 dark:border-gray-700 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setTheme(false)}
                className={`px-2.5 py-1.5 rounded-xl transition ${!isDark ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-surface-700'}`}
                title="Light mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTheme(true)}
                className={`px-2.5 py-1.5 rounded-xl transition ${isDark ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-surface-700'}`}
                title="Dark mode"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <Link href="/" className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 bg-white dark:bg-surface-800 border border-slate-200 dark:border-gray-700 px-3 py-1.5 rounded-xl transition">← {adminT(language, 'backToStore')}</Link>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full">{children}</main>
      </div>
    </div>
  );
}
