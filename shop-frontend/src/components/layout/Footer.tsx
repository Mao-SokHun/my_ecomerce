'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Globe,
  Mail,
  Phone,
  MapPin,
  Send,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Clock,
  ArrowRight,
  ChevronRight,
  Headphones,
  ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { leadApi, settingApi } from '@/lib/api';

/** Pick icon from admin "Social name" + URL */
function socialIconFor(link: { name?: string; url?: string }): LucideIcon {
  const raw = `${link.name || ''} ${link.url || ''}`.toLowerCase();
  if (/facebook|fb\.com|\.facebook\./.test(raw)) return Facebook;
  if (/instagram|instagr\.am/.test(raw)) return Instagram;
  if (/twitter\.com|x\.com|\btwitter\b|\bx\b/.test(raw)) return Twitter;
  if (/youtube|youtu\.be/.test(raw)) return Youtube;
  if (/linkedin/.test(raw)) return Linkedin;
  if (/telegram|t\.me/.test(raw)) return Send;
  return Globe;
}

export function Footer() {
  const { language } = useLanguageStore();
  const isKhmer = language === 'km';

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterPhone, setNewsletterPhone] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [footerInfo, setFooterInfo] = useState<{
    brandName?: string;
    brandDescription?: string;
    address?: string;
    phones?: string[];
    email?: string;
    socialLinks?: Array<{ name?: string; url?: string }>;
    shopLinks?: Array<{ label?: string; href?: string }>;
    accountLinks?: Array<{ label?: string; href?: string }>;
    legalLinks?: Array<{ label?: string; href?: string }>;
    paymentBadges?: string[];
    copyright?: string;
  }>({});

  useEffect(() => {
    const applyFooterSettings = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const d = raw as { siteName?: string; footerInfo?: { footer?: unknown } };
      const info = (d.footerInfo || {}) as { footer?: unknown };
      if (info.footer && typeof info.footer === 'object') {
        const f = info.footer as {
          brandName?: string;
          brandDescription?: string;
          address?: string;
          phones?: string[];
          email?: string;
          socialLinks?: Array<{ name?: string; url?: string }>;
          shopLinks?: Array<{ label?: string; href?: string }>;
          accountLinks?: Array<{ label?: string; href?: string }>;
          legalLinks?: Array<{ label?: string; href?: string }>;
          paymentBadges?: string[];
          copyright?: string;
        };
        setFooterInfo({
          ...f,
          brandName: f.brandName || d.siteName,
        });
      } else if (d.siteName) {
        setFooterInfo((prev) => ({ ...prev, brandName: d.siteName }));
      }
    };

    settingApi
      .get()
      .then(({ data }) => {
        applyFooterSettings(data?.data);
      })
      .catch(() => {});

    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        applyFooterSettings(customEvent.detail);
      }
    };

    window.addEventListener('settings:updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings:updated', handleSettingsUpdated);
  }, []);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) {
      toast.error(isKhmer ? 'សូមបញ្ចូលអ៊ីមែលរបស់អ្នក' : 'Please enter your email');
      return;
    }
    setIsSubscribing(true);
    try {
      await leadApi.subscribe({ email: newsletterEmail.trim(), phone: newsletterPhone.trim() || undefined });
      toast.success(isKhmer ? '🎉 អរគុណសម្រាប់ការជាវព័ត៌មានពី SH-Shop!' : t(language, 'newsletterThanks'));
      setNewsletterEmail('');
      setNewsletterPhone('');
    } catch {
      toast.error(isKhmer ? 'ចុះឈ្មោះមិនបានជោគជ័យ សូមព្យាយាមម្តងទៀត' : language === 'zh' ? '订阅失败' : 'Subscribe failed');
    } finally {
      setIsSubscribing(false);
    }
  };

  const brandName = footerInfo.brandName || 'SH-Shop';
  const brandDescription = footerInfo.brandDescription || (isKhmer ? 'គោលដៅទិញទំនិញអនឡាញឈានមុខគេ ជាមួយទំនិញគុណភាពខ្ពស់ តម្លៃសមរម្យ និងសេវាកម្មដឹកជញ្ជូនរហ័សទាន់ចិត្តដល់គេហដ្ឋាន។' : t(language, 'footerBrandDesc'));

  const fallbackShopLinks = [
    { href: '/products', label: isKhmer ? 'ទំនិញទាំងអស់' : t(language, 'footerAllProducts') },
    { href: '/products?featured=true', label: isKhmer ? 'ប្រូម៉ូសិនពិសេស' : t(language, 'footerFeaturedDeals') },
    { href: '/products?category=smartphones', label: isKhmer ? 'ស្មាតហ្វូន & ថេប្លេត' : 'Smartphones & Tablets' },
    { href: '/products?category=laptops', label: isKhmer ? 'កុំព្យូទ័រ & គ្រឿងបន្លាស់' : 'Laptops & Computers' },
    { href: '/products?category=audio', label: isKhmer ? 'កាសស្តាប់ & ឧបករណ៍បំពងសំឡេង' : 'Headphones & Audio' },
    { href: '/products?sort=createdAt&order=desc', label: isKhmer ? 'ទំនិញទើបមកដល់ថ្មី' : t(language, 'footerNewArrivals') },
  ];

  const fallbackAccountLinks = [
    { href: '/dashboard', label: isKhmer ? 'គណនីរបស់ខ្ញុំ' : t(language, 'footerMyAccount') },
    { href: '/dashboard/orders', label: isKhmer ? 'ប្រវត្តិបញ្ជាទិញ' : t(language, 'footerMyOrders') },
    { href: '/dashboard/wishlist', label: isKhmer ? 'បញ្ជីទំនិញចង់បាន' : t(language, 'footerWishlist') },
    { href: '/login', label: isKhmer ? 'ចូលគណនី' : t(language, 'signIn') },
    { href: '/register', label: isKhmer ? 'បង្កើតគណនីថ្មី' : t(language, 'signUp') },
  ];

  const fallbackLegalLinks = [
    { href: '/legal/privacy', label: isKhmer ? 'គោលការណ៍ឯកជនភាព' : t(language, 'footerPrivacy') },
    { href: '/legal/terms', label: isKhmer ? 'លក្ខខណ្ឌប្រើប្រាស់' : t(language, 'footerTerms') },
    { href: '/legal/cookies', label: isKhmer ? 'គោលការណ៍ខូគី' : t(language, 'footerCookie') },
  ];

  const shopLinks =
    Array.isArray(footerInfo.shopLinks) && footerInfo.shopLinks.length > 0
      ? footerInfo.shopLinks.filter((x) => x?.label && x?.href).map((x) => ({ href: String(x.href), label: String(x.label) }))
      : fallbackShopLinks;
  const accountLinks =
    Array.isArray(footerInfo.accountLinks) && footerInfo.accountLinks.length > 0
      ? footerInfo.accountLinks.filter((x) => x?.label && x?.href).map((x) => ({ href: String(x.href), label: String(x.label) }))
      : fallbackAccountLinks;
  const legalLinks =
    Array.isArray(footerInfo.legalLinks) && footerInfo.legalLinks.length > 0
      ? footerInfo.legalLinks.filter((x) => x?.label && x?.href).map((x) => ({ href: String(x.href), label: String(x.label) }))
      : fallbackLegalLinks;

  const phones =
    Array.isArray(footerInfo.phones) && footerInfo.phones.length > 0
      ? footerInfo.phones.filter(Boolean)
      : ['097 494 4390', '088 545 9115'];
  const email = footerInfo.email || 'shshopbyonline@gmail.com';
  const address = footerInfo.address || '247 Beong Salang St, Toul Kork, Phnom Penh, Cambodia';

  const socialLinks =
    Array.isArray(footerInfo.socialLinks) && footerInfo.socialLinks.length > 0
      ? footerInfo.socialLinks.filter(
          (x) => x?.url && String(x.url).trim() !== '' && String(x.url).trim() !== '#',
        )
      : [
          { name: 'Facebook', url: 'https://facebook.com/maosokhun' },
          { name: 'Telegram', url: 'https://t.me/+855974944390' },
        ];

  return (
    <footer
      className="relative bg-slate-950 text-slate-300 mt-16 sm:mt-24 border-t border-slate-800/70 overflow-hidden"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      {/* Ambient Lighting Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none translate-y-1/3" />

      {/* Top VIP Newsletter Banner */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-surface-900 to-slate-900">
        <div className="page-container py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-950/80 border border-primary-800/60 text-primary-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                <span>{isKhmer ? 'ការផ្តល់ជូនពិសេស & កាដូស្វាគមន៍' : 'Special Offers & News'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isKhmer ? 'ទទួលបានដំណឹងប្រូម៉ូសិន និងទំនិញថ្មីៗមុនគេ' : 'Subscribe to get 10% off your first order'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
                {isKhmer
                  ? 'ចុះឈ្មោះអ៊ីមែលរបស់អ្នកដើម្បីទទួលបានប័ណ្ណបញ្ចុះតម្លៃ និងការផ្តល់ជូនពិសេសៗប្រចាំសប្តាហ៍!'
                  : 'Join our community for weekly discounts, new arrivals and member-only promotions.'}
              </p>
            </div>

            <div className="lg:col-span-6">
              <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-inner"
                    />
                  </div>
                  <div className="relative sm:w-44">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={newsletterPhone}
                      onChange={(e) => setNewsletterPhone(e.target.value)}
                      placeholder={isKhmer ? 'ទូរស័ព្ទ (ជម្រើស)' : 'Phone (opt.)'}
                      className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group shrink-0 active:scale-95 disabled:opacity-50"
                >
                  <span>{isSubscribing ? (isKhmer ? 'កំពុងជាវ...' : 'Subscribing...') : (isKhmer ? 'ជាវព័ត៌មាន' : 'Subscribe')}</span>
                  <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Information */}
      <div className="page-container py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Col 1: Brand & Bio (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-white font-black text-xl tracking-tight block">{brandName}</span>
                <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider block">
                  Official Online Store
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {brandDescription}
            </p>

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-400 mb-2.5">
                  {isKhmer ? 'តាមដានបណ្តាញសង្គមយើងខ្ញុំ' : 'Connect With Us'}
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  {socialLinks.map((link, i) => {
                    const Icon = socialIconFor(link);
                    return (
                      <a
                        key={`social-${i}-${link.url}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.name || 'Social'}
                        title={link.name || 'Social'}
                        className="w-9 h-9 bg-slate-900 hover:bg-primary-600 border border-slate-800 hover:border-primary-500 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all duration-200 shadow-xs hover:shadow-md hover:scale-105"
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quality Guarantee Mini Pill */}
            <div className="inline-flex items-center gap-2 p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isKhmer ? 'ទំនិញសុទ្ធ 100% ធានាគុណភាព និងទំនុកចិត្ត' : '100% Authentic Quality Guaranteed'}</span>
            </div>
          </div>

          {/* Col 2: Shop & Categories (2.5 cols) */}
          <div className="lg:col-span-2.5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {isKhmer ? 'ហាងទំនិញ' : t(language, 'footerShop')}
              </h4>
            </div>
            <ul className="space-y-2.5">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-sm text-slate-400 hover:text-white flex items-center gap-1.5 group transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Account & Support (2.5 cols) */}
          <div className="lg:col-span-2.5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {isKhmer ? 'គណនី & សេវាកម្ម' : t(language, 'footerAccount')}
              </h4>
            </div>
            <ul className="space-y-2.5">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-sm text-slate-400 hover:text-white flex items-center gap-1.5 group transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact & Hours (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {isKhmer ? 'ទំនាក់ទំនង' : t(language, 'footerContact')}
              </h4>
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-xs sm:text-sm text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-primary-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="leading-relaxed">{address}</span>
              </li>

              <li className="flex items-center gap-3 text-xs sm:text-sm text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-primary-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  {phones.map((phone, idx) => (
                    <a
                      key={idx}
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="hover:text-white hover:underline transition-colors font-mono"
                    >
                      {phone}
                    </a>
                  ))}
                </div>
              </li>

              <li className="flex items-center gap-3 text-xs sm:text-sm text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-primary-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <a
                  href={`mailto:${email}`}
                  className="hover:text-white hover:underline transition-colors truncate font-mono text-xs"
                >
                  {email}
                </a>
              </li>

              <li className="flex items-center gap-3 text-xs sm:text-sm text-slate-400 pt-1">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span>{isKhmer ? 'ច័ន្ទ - អាទិត្យ: 8:00 AM - 9:00 PM' : 'Mon - Sun: 8:00 AM - 9:00 PM'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Legal & Verified Payment Badges */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
          {/* Copyright */}
          <div className="text-xs text-slate-500">
            <p>{footerInfo.copyright || `© ${new Date().getFullYear()} ${brandName}. ${isKhmer ? 'រក្សាសិទ្ធិគ្រប់យ៉ាង។' : 'All rights reserved.'}`}</p>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Payment Badges */}
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Visa</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-rose-400 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Bakong (KHQR)</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-emerald-400 flex items-center gap-1 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SSL 256-bit</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

