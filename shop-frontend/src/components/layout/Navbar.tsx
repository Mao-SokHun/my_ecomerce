'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Menu, X, Sun, Moon,
  Heart, LogOut, Settings, Package, LayoutDashboard, ChevronDown, Check,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useThemeStore } from '@/store/themeStore';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { settingApi, categoryApi } from '@/lib/api';
import {
  STATIC_SHOP_NAV_CATEGORIES,
  shopCategoryIcon,
  shopCategoryLabel,
  type ShopNavCategory,
} from '@/lib/shopCategoryNav';
import { NavbarSearchProvider, NavbarSearchDesktop, NavbarSearchMobile } from './NavbarSearch';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearch = useSearchParams();
  const [hasMounted, setHasMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const [headerInfo, setHeaderInfo] = useState<{
    siteName?: string;
    logoLetter?: string;
    navLinks?: Array<{ label?: string; href?: string }>;
  }>({});
  const userMenuRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const shopMenuRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout } = useAuthStore();
  const { openCart, getItemCount } = useCartStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();

  const itemCount = getItemCount();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  /** Sync search box with `/products?search=` or clear when leaving products */
  useEffect(() => {
    if (pathname === '/products') {
      setSearchQuery(urlSearch.get('search') ?? '');
    } else {
      setSearchQuery('');
    }
  }, [pathname, urlSearch]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(e.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
      if (shopMenuRef.current && !shopMenuRef.current.contains(e.target as Node)) {
        setIsShopMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [shopNavCategories, setShopNavCategories] = useState<ShopNavCategory[]>(STATIC_SHOP_NAV_CATEGORIES);

  useEffect(() => {
    categoryApi
      .getAll()
      .then(({ data }) => {
        const rows = data?.data as Array<{ slug: string; name: string }> | undefined;
        if (!Array.isArray(rows) || rows.length === 0) return;
        setShopNavCategories(
          rows.map((c) => ({
            slug: String(c.slug),
            name: String(c.name || ''),
          })),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    settingApi
      .get()
      .then(({ data }) => {
        const info = (data.data?.footerInfo || {}) as { header?: unknown };
        if (info.header && typeof info.header === 'object') {
          setHeaderInfo(info.header as { siteName?: string; logoLetter?: string; navLinks?: Array<{ label?: string; href?: string }> });
        }
      })
      .catch(() => {});
  }, []);

  const submitProductSearch = (q: string) => {
    const params = new URLSearchParams();
    params.set('search', q);
    params.set('sort', 'relevance');
    params.set('order', 'desc');
    router.push(`/products?${params.toString()}`);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const prefetchRoute = (href: string) => {
    const cleanHref = href.split('?')[0];
    if (!cleanHref) return;
    router.prefetch(cleanHref);
  };

  const extraNavLinks =
    Array.isArray(headerInfo.navLinks)
      ? headerInfo.navLinks
          .filter((x) => x?.label && x?.href)
          .filter((x) => String(x.href).toLowerCase() !== '/blog')
          .slice(0, 4)
      : [];
  const brandName = headerInfo.siteName || 'SH-Shop';
  const logoLetter = (headerInfo.logoLetter || brandName.slice(0, 1) || 'S').slice(0, 1).toUpperCase();

  const languageOptions: Array<{ value: 'km' | 'en' | 'zh'; label: string }> = [
    { value: 'km', label: 'ខ្មែរ' },
    { value: 'en', label: 'EN' },
    { value: 'zh', label: '中文' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ease-smooth-out ${
        isScrolled
          ? 'glass shadow-premium'
          : 'bg-transparent'
      }`}
    >
      <nav className="page-container">
        <NavbarSearchProvider
          language={language}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSubmitSearch={submitProductSearch}
        >
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 rounded-lg transition-opacity duration-200 ease-smooth-out hover:opacity-90 active:opacity-80">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{logoLetter}</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
              {brandName}
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-2 ml-8">
            <Link
              href="/"
              onMouseEnter={() => prefetchRoute('/')}
              onFocus={() => prefetchRoute('/')}
              className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 ease-smooth-out"
            >
              {t(language, 'navHome')}
            </Link>

            {/* Shop Dropdown */}
            <div className="relative" ref={shopMenuRef}>
              <button
                onMouseEnter={() => setIsShopMenuOpen(true)}
                onClick={() => setIsShopMenuOpen(!isShopMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 ease-smooth-out"
              >
                {t(language, 'navShop')}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ease-smooth-out ${isShopMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isShopMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    onMouseLeave={() => setIsShopMenuOpen(false)}
                    className="absolute top-full left-0 mt-2 min-w-[17rem] w-max max-w-[min(22rem,calc(100vw-2rem))] max-h-[min(70vh,26rem)] overflow-y-auto overflow-x-hidden glass shadow-premium rounded-2xl border border-gray-100 dark:border-gray-800 py-2 z-50"
                  >
                    <Link
                      href="/products"
                      onMouseEnter={() => prefetchRoute('/products')}
                      onFocus={() => prefetchRoute('/products')}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:text-primary-600 transition-colors duration-200 ease-smooth-out"
                      onClick={() => setIsShopMenuOpen(false)}
                    >
                      <Package className="w-4.5 h-4.5" />
                      <div className="flex flex-col">
                        <span className="font-bold">{t(language, 'allProducts')}</span>
                        <span className="text-[10px] text-gray-400">{t(language, 'browseAll')}</span>
                      </div>
                    </Link>
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-4 shrink-0" />
                    {shopNavCategories.map((cat) => {
                      const href = `/products?category=${encodeURIComponent(cat.slug)}`;
                      return (
                        <Link
                          key={cat.slug}
                          href={href}
                          onMouseEnter={() => prefetchRoute(href)}
                          onFocus={() => prefetchRoute(href)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-800 hover:text-primary-600 transition-colors duration-200 ease-smooth-out"
                          onClick={() => setIsShopMenuOpen(false)}
                        >
                          <span className="text-lg leading-none w-8 flex justify-center shrink-0" aria-hidden>
                            {shopCategoryIcon(cat.slug)}
                          </span>
                          <span className="leading-snug">{shopCategoryLabel(language, cat.slug, cat.name)}</span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/products?featured=true"
              onMouseEnter={() => prefetchRoute('/products?featured=true')}
              onFocus={() => prefetchRoute('/products?featured=true')}
              className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 ease-smooth-out"
            >
              {t(language, 'navDeals')}
            </Link>
            {extraNavLinks.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={String(item.href)}
                onMouseEnter={() => prefetchRoute(String(item.href))}
                onFocus={() => prefetchRoute(String(item.href))}
                className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 ease-smooth-out"
              >
                {String(item.label)}
              </Link>
            ))}
          </div>

          <NavbarSearchDesktop />

          {/* Actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-all duration-200 ease-smooth-out"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-all duration-200 ease-smooth-out"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {hasMounted && itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-xs font-bold text-white bg-primary-600 rounded-full flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
            <div className="relative hidden sm:block" ref={languageMenuRef}>
              <button
                type="button"
                onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-surface-800 hover:bg-gray-200 dark:hover:bg-surface-700 rounded-xl transition-all duration-200 ease-smooth-out"
                aria-label="Select language"
              >
                <span>{languageOptions.find((option) => option.value === language)?.label || 'EN'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ease-smooth-out ${isLanguageMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isLanguageMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-surface-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-50"
                  >
                    {languageOptions.map((option) => (
                      <button
                        key={`lang-${option.value}`}
                        type="button"
                        onClick={() => {
                          setLanguage(option.value);
                          setIsLanguageMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors duration-200 ease-smooth-out ${
                          language === option.value
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-surface-800'
                        }`}
                      >
                        <span>{option.label}</span>
                        {language === option.value && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User menu */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-all duration-200 ease-smooth-out"
                  type="button"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  aria-label={t(language, 'account')}
                >
                  <UserAvatar name={user.name} src={user.avatar} size="sm" photoAlt="" />
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block transition-transform duration-200 ease-smooth-out" />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden py-1 z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors duration-200 ease-smooth-out"
                        >
                          <Settings className="w-4 h-4" /> {t(language, 'account')}
                        </Link>
                        <Link
                          href="/dashboard/orders"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors duration-200 ease-smooth-out"
                        >
                          <Package className="w-4 h-4" /> {t(language, 'myOrders')}
                        </Link>
                        <Link
                          href="/dashboard/wishlist"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors duration-200 ease-smooth-out"
                        >
                          <Heart className="w-4 h-4" /> {t(language, 'wishlist')}
                        </Link>
                        {user.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-200 ease-smooth-out"
                          >
                            <LayoutDashboard className="w-4 h-4" /> {t(language, 'adminPanel')}
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-800 pt-1 pb-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 ease-smooth-out"
                        >
                          <LogOut className="w-4 h-4" /> {t(language, 'signOut')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  onMouseEnter={() => prefetchRoute('/login')}
                  onFocus={() => prefetchRoute('/login')}
                  className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-all duration-200 ease-smooth-out"
                >
                  {t(language, 'signIn')}
                </Link>
                <Link
                  href="/register"
                  onMouseEnter={() => prefetchRoute('/register')}
                  onFocus={() => prefetchRoute('/register')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all duration-200 ease-smooth-out"
                >
                  {t(language, 'signUp')}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-all duration-200 ease-smooth-out"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <NavbarSearchMobile />

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden glass shadow-premium rounded-3xl mt-2 mx-2 py-4 space-y-1 overflow-hidden z-50 origin-top"
            >
              <div className="flex flex-col gap-1 px-2">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 rounded-2xl transition-all duration-200 ease-smooth-out"
                >
                  {t(language, 'navHome')}
                </Link>
                <Link
                  href="/products"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 rounded-2xl transition-all duration-200 ease-smooth-out"
                >
                  {t(language, 'navShop')}
                </Link>
                <div className="ml-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-1">
                  {shopNavCategories.map((cat) => {
                    const href = `/products?category=${encodeURIComponent(cat.slug)}`;
                    return (
                      <Link
                        key={cat.slug}
                        href={href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-primary-600 transition-colors duration-200 ease-smooth-out"
                      >
                        <span className="text-base leading-none w-7 flex justify-center shrink-0" aria-hidden>
                          {shopCategoryIcon(cat.slug)}
                        </span>
                        <span>{shopCategoryLabel(language, cat.slug, cat.name)}</span>
                      </Link>
                    );
                  })}
                </div>
                <Link
                  href="/products?featured=true"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 rounded-2xl transition-all duration-200 ease-smooth-out"
                >
                  {t(language, 'navDeals')}
                </Link>
                {!isAuthenticated && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      delay: 0.05 * Math.max(shopNavCategories.length, 4),
                      duration: 0.2,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="pt-2 px-2"
                  >
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="btn-primary w-full py-3 shadow-lg"
                    >
                      {t(language, 'signIn')}
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </NavbarSearchProvider>
      </nav>
    </header>
  );
}
