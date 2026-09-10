'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag,
  LogOut, Menu, X, Store, Settings, FolderTree, Sun, Moon, ChevronDown, ChevronRight, Globe, PanelLeftClose,
  Mail, MessageSquare, Sliders, Phone, Compass, Image as ImageIcon, FileText, Receipt,
  Bell, AlertTriangle, Flame, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { authApi } from '@/lib/api';
import { adminT } from '@/lib/admin-i18n';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, key: 'navDashboard' },
  { href: '/admin/products', icon: Package, key: 'navProducts' },
  { href: '/admin/categories', icon: FolderTree, key: 'navCategories' },
  { href: '/admin/orders', icon: ShoppingCart, key: 'navOrders' },
  { href: '/admin/users', icon: Users, key: 'navUsers' },
  { href: '/admin/leads', icon: Mail, key: 'navLeads' },
  { href: '/admin/support-inbox', icon: MessageSquare, key: 'navSupportInbox' },
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
  const [isCheckingAccess, setIsCheckingAccess] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.state?.user?.role === 'ADMIN') return false;
        }
      } catch {}
    }
    return !isDirectAdmin;
  });
  const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.state?.user?.role === 'ADMIN') return parsed.state.user;
        }
      } catch {}
    }
    return null;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [liveCounts, setLiveCounts] = useState<{ orders: number | null; users: number | null; leads: number | null; lowStock: number | null; chat: number | null }>({
    orders: null,
    users: null,
    leads: null,
    lowStock: null,
    chat: null,
  });
  const [badgeFlash, setBadgeFlash] = useState<{ orders: boolean; users: boolean; leads: boolean; chat: boolean }>({
    orders: false,
    users: false,
    leads: false,
    chat: false,
  });
  /** Bumped when visiting a section (mark-seen) so in-flight poll responses cannot overwrite fresh counts. */
  const unreadPullGenerationRef = useRef(0);

  useEffect(() => {
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

    let mounted = true;
    authApi
      .getMe()
      .then(({ data }) => {
        if (!mounted) return;
        const me = data.data as { name: string; role: string };
        if (me?.role !== 'ADMIN') {
          router.push('/');
          return;
        }
        setAdminUser(me);
      })
      .catch(() => {
        if (!mounted) return;
        if (!user || user.role !== 'ADMIN') {
          router.push('/login');
        }
      })
      .finally(() => {
        if (mounted) setIsCheckingAccess(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthChecked, user, adminUser, router]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    if (!isAuthChecked || (!adminUser && user?.role !== 'ADMIN')) return;
    let mounted = true;
    let prevLeads = -1;
    let prevOrders = -1;
    let prevUsers = -1;
    let prevChat = -1;
    const pull = async () => {
      const gen = ++unreadPullGenerationRef.current;
      try {
        const { data } = await adminApi.getUnreadCounts();
        if (!mounted || gen !== unreadPullGenerationRef.current) return;
        const counts = data.data || {};
        setLiveCounts({
          orders: Number(counts.orders || 0),
          users: Number(counts.users || 0),
          leads: Number(counts.leads || 0),
          lowStock: Number(counts.lowStock || 0),
          chat: Number(counts.chat || 0),
        });
        const nextOrders = Number(counts.orders || 0);
        const nextUsers = Number(counts.users || 0);
        const nextLeads = Number(counts.leads || 0);
        const nextChat = Number(counts.chat || 0);

        if (prevOrders >= 0 && nextOrders > prevOrders) {
          setBadgeFlash((prev) => ({ ...prev, orders: true }));
          setTimeout(() => setBadgeFlash((prev) => ({ ...prev, orders: false })), 1200);
          toast(
            language === 'km' ? `🛒 មានការបញ្ជាទិញថ្មី ${nextOrders - prevOrders} !` : `🛒 ${nextOrders - prevOrders} new order(s)!`,
            { icon: '📦', duration: 5000, id: 'new-order-alert', style: { fontWeight: 600 } }
          );
        }
        if (prevUsers >= 0 && nextUsers > prevUsers) {
          setBadgeFlash((prev) => ({ ...prev, users: true }));
          setTimeout(() => setBadgeFlash((prev) => ({ ...prev, users: false })), 1200);
          toast(
            language === 'km' ? `👤 អតិថិជនថ្មី ${nextUsers - prevUsers} នាក់ !` : `👤 ${nextUsers - prevUsers} new user(s) registered!`,
            { icon: '🎉', duration: 4000, id: 'new-user-alert' }
          );
        }
        if (prevLeads >= 0 && nextLeads > prevLeads) {
          setBadgeFlash((prev) => ({ ...prev, leads: true }));
          setTimeout(() => setBadgeFlash((prev) => ({ ...prev, leads: false })), 1200);
          toast(
            language === 'km' ? `📧 មាន subscriber ថ្មី ${nextLeads - prevLeads} !` : `📧 ${nextLeads - prevLeads} new subscriber(s)!`,
            { icon: '✉️', duration: 4000, id: 'new-lead-alert' }
          );
        }
        if (prevChat >= 0 && nextChat > prevChat) {
          setBadgeFlash((prev) => ({ ...prev, chat: true }));
          setTimeout(() => setBadgeFlash((prev) => ({ ...prev, chat: false })), 2000);
          toast(
            language === 'km'
              ? `💬 អតិថិជនផ្ញើសារថ្មី ${nextChat - prevChat} !`
              : `💬 ${nextChat - prevChat} new chat message(s)!`,
            { icon: '🆘', duration: 6000, id: 'new-chat-alert', style: { fontWeight: 700, background: '#fef3c7', color: '#92400e' } }
          );
        }
        prevOrders = nextOrders;
        prevUsers = nextUsers;
        prevLeads = nextLeads;
        prevChat = nextChat;
      } catch {
        // ignore
      }
    };
    pull();
    const timer = setInterval(pull, 6000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [isAuthChecked, adminUser, user?.role, language]);

  useEffect(() => {
    if (!isAuthChecked || (!adminUser && user?.role !== 'ADMIN')) return;
    const type =
      pathname === '/admin/orders' || pathname.startsWith('/admin/orders/')
        ? 'orders'
        : pathname === '/admin/users' || pathname.startsWith('/admin/users/')
          ? 'users'
          : pathname === '/admin/leads' || pathname.startsWith('/admin/leads/')
            ? 'leads'
            : pathname === '/admin/support-inbox'
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
          chat: Number(counts.chat || 0),
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

  if (!hasAdminAccess && (!isAuthChecked || isCheckingAccess)) {
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
      <aside className={`fixed inset-y-0 left-0 z-40 ${compactSidebar ? 'w-[92px]' : 'w-[280px]'} bg-white/92 dark:bg-surface-900/92 backdrop-blur-xl border-r border-white/70 dark:border-gray-800/80 shadow-xl shadow-slate-300/50 dark:shadow-black/20 transform transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b border-gray-100/80 dark:border-gray-800 ${compactSidebar ? 'space-y-3' : ''}`}>
            <div className={`flex items-center ${compactSidebar ? 'justify-center' : 'justify-between'} gap-2`}>
              <Link href="/" className={`flex items-center ${compactSidebar ? 'justify-center' : ''} gap-2.5`}>
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Store className="w-4.5 h-4.5" />
                </span>
                {!compactSidebar && (
                  <span className={`font-semibold text-gray-900 dark:text-white text-[15px] ${isKhmer ? '' : 'tracking-tight'}`}>
                    SH Shop Admin
                  </span>
                )}
              </Link>
              {!compactSidebar && (
                <button
                  type="button"
                  onClick={toggleCompactSidebar}
                  className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-800 border border-gray-200 dark:border-gray-700"
                  title="Compact"
                >
                  <PanelLeftClose className="w-4 h-4" />
                  Compact
                </button>
              )}
            </div>
            {compactSidebar && (
              <button
                type="button"
                onClick={toggleCompactSidebar}
                className="hidden lg:inline-flex mx-auto px-2.5 py-1 text-[11px] font-medium rounded-md text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-surface-800 border border-gray-200 dark:border-gray-700"
                title="Expand sidebar"
              >
                Expand
              </button>
            )}
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-2 overscroll-contain">
            {!compactSidebar && (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide uppercase text-gray-400">
                {isKhmer ? 'មុខងារសំខាន់' : 'Main Navigation'}
              </p>
            )}
            {navItems.map(({ href, icon: Icon, key }) => {
              const label = adminT(language, key);
              const isActive = pathname === href;
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
                      className={`group relative flex items-center justify-center h-11 rounded-xl text-sm font-medium transition-all ${
                        settingsActive
                          ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-50">
                        {label}
                      </span>
                    </Link>
                  );
                }

                return (
                  <div key={href} className="space-y-1">
                    <div
                      className={`flex items-center justify-between rounded-xl transition-all ${
                        settingsActive && !settingsOpen
                          ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white shadow-sm'
                          : settingsActive
                          ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Link
                        href="/admin/settings"
                        onClick={() => setSidebarOpen(false)}
                        className="flex-1 h-11 flex items-center gap-3 px-3 text-sm font-medium"
                      >
                        <span className={`w-6 h-6 flex items-center justify-center ${settingsActive && !settingsOpen ? 'text-white' : settingsActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}>
                          <Icon className="w-[18px] h-[18px]" />
                        </span>
                        <span>{label}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen((v) => !v)}
                        className="p-2.5 mr-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-transform"
                        title={settingsOpen ? 'Collapse' : 'Expand'}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Clean Inline Submenu (Natural vertical flow without covering other items!) */}
                    {settingsOpen && (
                      <div className="ml-3 pl-3 border-l-2 border-primary-200 dark:border-primary-900/60 space-y-0.5 py-1">
                        {settingsSubmenu.map(({ section, key, Icon: SubIcon }) => (
                          <Link
                            key={section}
                            href={`/admin/settings?section=${section}`}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
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
                  className={`group relative flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50/90 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`w-6 h-6 flex items-center justify-center ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200'}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  {!compactSidebar && (
                    <span className="flex items-center justify-between w-full">
                      <span>{label}</span>
                      {(href === '/admin/orders' || href === '/admin/users' || href === '/admin/leads') && (
                        <span
                          className={`ml-2 min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold inline-flex items-center justify-center ${
                            ((href === '/admin/orders' ? (liveCounts.orders ?? 0) : href === '/admin/users' ? (liveCounts.users ?? 0) : (liveCounts.leads ?? 0)) > 0)
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-surface-800 dark:text-gray-400'
                          }`}
                        >
                          <span
                            className={
                              (href === '/admin/orders' && badgeFlash.orders) ||
                              (href === '/admin/users' && badgeFlash.users) ||
                              (href === '/admin/leads' && badgeFlash.leads)
                                ? 'animate-pulse'
                                : ''
                            }
                          >
                          {href === '/admin/orders'
                            ? (liveCounts.orders ?? 0)
                            : href === '/admin/users'
                              ? (liveCounts.users ?? 0)
                              : (liveCounts.leads ?? 0)}
                          </span>
                        </span>
                      )}
                    </span>
                  )}
                  {compactSidebar && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded-lg bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                      {label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {activeUser?.name?.[0] || 'A'}
              </div>
              {!compactSidebar && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white truncate">{activeUser?.name}</p>
                  <p className="text-xs text-gray-400">{adminT(language, 'administrator')}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => { logout(); router.push('/'); }}
              className={`flex items-center ${compactSidebar ? 'justify-center' : 'gap-2'} w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors`}
            >
              <LogOut className="w-4 h-4" /> {!compactSidebar && adminT(language, 'signOut')}
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
            {/* Clean Breadcrumb Hierarchy */}
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
              <Link
                href="/admin"
                className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1 shrink-0"
              >
                <span>{language === 'km' ? 'ផ្ទាំងគ្រប់គ្រង' : language === 'zh' ? '管理后台' : 'Admin'}</span>
              </Link>
              {pathname !== '/admin' && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[140px] sm:max-w-none">
                    {pageTitle}
                  </span>
                </>
              )}
            </div>

            {/* Main Page Title + Live Badge */}
            <div className="flex items-center gap-2 mt-0.5">
              <h1
                className={`text-slate-900 dark:text-white font-extrabold truncate leading-tight ${
                  isKhmer ? 'text-base sm:text-lg' : 'text-lg sm:text-xl tracking-tight'
                }`}
              >
                {pageTitle}
              </h1>
              {pathname === '/admin' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
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
                {((liveCounts.lowStock ?? 0) > 0 || (liveCounts.orders ?? 0) > 0 || (liveCounts.chat ?? 0) > 0) && (
                  <span className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-surface-900 ${
                    (liveCounts.chat ?? 0) > 0 ? 'bg-amber-500 animate-bounce' : 'bg-rose-500 animate-pulse'
                  }`}>
                    {(liveCounts.chat ?? 0) + (liveCounts.lowStock ?? 0) + (liveCounts.orders ?? 0)}
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
                  {/* Chat Messages Alert */}
                    {(liveCounts.chat ?? 0) > 0 ? (
                      <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60">
                        <div className="flex items-start gap-2.5">
                          <MessageSquare className={`w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 ${badgeFlash.chat ? 'animate-bounce' : ''}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              {isKhmer
                                ? `💬 មានសារ Live Chat ថ្មី ${liveCounts.chat} !`
                                : `💬 ${liveCounts.chat} unread chat message(s) from customers!`}
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                              {isKhmer ? 'អតិថិជនកំពុងរង់ចាំការឆ្លើយតប — ចូលទៅ Support Inbox ដើម្បីជួយ' : 'Customers are waiting for your reply'}
                            </p>
                            <Link
                              href="/admin/support-inbox"
                              onClick={() => setNotifOpen(false)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline mt-2"
                            >
                              <span>{isKhmer ? 'ចូល Support Inbox ឆ្លើយ' : 'Open Support Inbox'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-100 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{isKhmer ? 'មិនមានសារ Chat ថ្មីទេ' : 'No new chat messages'}</span>
                      </div>
                    )}

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
