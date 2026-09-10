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
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  Zap,
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
    settingApi
      .get()
      .then(({ data }) => {
        const info = (data.data?.footerInfo || {}) as { footer?: unknown };
        if (info.footer && typeof info.footer === 'object') {
          setFooterInfo(info.footer as typeof footerInfo);
        }
      })
      .catch(() => {});
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
      toast.error(isKhmer ? 'ចុះឈ្មោះមិនបានជោគជ័យ សូមព្យាយាមម្តងទៀត' : 'Subscribe failed');
    } finally {
      setIsSubscribing(false);
    }
  };

  const brandName = footerInfo.brandName || 'SH-Shop';
  const brandDescription =
    footerInfo.brandDescription ||
    (isKhmer
      ? 'គោលដៅទិញទំនិញអនឡាញឈានមុខគេ ជាមួយទំនិញគុណភាពខ្ពស់ តម្លៃសមរម្យ និងសេវាកម្មដឹកជញ្ជូនរហ័ស។'
      : t(language, 'footerBrandDesc'));

  const fallbackShopLinks = [
    { href: '/products', label: isKhmer ? 'ទំនិញទាំងអស់' : t(language, 'footerAllProducts') },
    { href: '/products?featured=true', label: isKhmer ? 'ប្រូម៉ូសិនពិសេស' : t(language, 'footerFeaturedDeals') },
    { href: '/products?category=smartphones', label: isKhmer ? 'ស្មាតហ្វូន & ថេប្លេត' : 'Smartphones & Tablets' },
    { href: '/products?category=laptops', label: isKhmer ? 'កុំព្យូទ័រ & គ្រឿងបន្លាស់' : 'Laptops & Computers' },
    { href: '/products?category=audio', label: isKhmer ? 'កាសស្តាប់ & ឧបករណ៍' : 'Headphones & Audio' },
    { href: '/products?sort=createdAt&order=desc', label: isKhmer ? 'ទំនិញទើបមកដល់ថ្មី' : t(language, 'footerNewArrivals') },
  ];

  const fallbackAccountLinks = [
    { href: '/dashboard', label: isKhmer ? 'គណនីរបស់ខ្ញុំ' : t(language, 'footerMyAccount') },
    { href: '/dashboard/orders', label: isKhmer ? 'ប្រវត្តិបញ្ជាទិញ' : t(language, 'footerMyOrders') },
    { href: '/dashboard/wishlist', label: isKhmer ? 'បញ្ជីចង់បាន' : t(language, 'footerWishlist') },
    { href: '/login', label: isKhmer ? 'ចូលគណនី' : t(language, 'signIn') },
    { href: '/register', label: isKhmer ? 'បង្កើតគណនីថ្មី' : t(language, 'signUp') },
    { href: '/legal/privacy', label: isKhmer ? 'គោលការណ៍ឯកជនភាព' : t(language, 'footerPrivacy') },
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
  const email = footerInfo.email || 'sokhunmao390@gmail.com';
  const address = footerInfo.address || '247 Beong Salang St, Toul Kork, Phnom Penh, Cambodia';

  const socialLinks =
    Array.isArray(footerInfo.socialLinks) && footerInfo.socialLinks.length > 0
      ? footerInfo.socialLinks.filter((x) => x?.url && String(x.url).trim() !== '' && String(x.url).trim() !== '#')
      : [
          { name: 'Facebook', url: 'https://facebook.com/maosokhun' },
          { name: 'Telegram', url: 'https://t.me/+855974944390' },
        ];

  return (
    <footer
      className="relative bg-[#0a0f1e] text-slate-300 mt-16 sm:mt-24 overflow-hidden"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[500px] h-[500px] bg-primary-600/8 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-indigo-600/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-[600px] h-[300px] bg-violet-600/5 rounded-full blur-3xl -translate-x-1/2" />
        {/* Horizontal separator line glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
      </div>

      {/* ── NEWSLETTER BANNER ── */}
      <div className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary-600/20 via-indigo-600/15 to-violet-600/10 border border-primary-500/20 p-6 sm:p-10 overflow-hidden">
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary-600/5 to-indigo-600/5 pointer-events-none" />
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Text Side */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/15 border border-primary-400/30 text-primary-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isKhmer ? 'ការផ្តល់ជូនពិសេស' : 'Exclusive Members Only'}</span>
                </div>
                <h3 className={`font-extrabold text-white leading-tight ${isKhmer ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl tracking-tight'}`}>
                  {isKhmer
                    ? 'ទទួលបានដំណឹងប្រូម៉ូសិន & ទំនិញថ្មីៗ មុនគេ!'
                    : <>Get <span className="text-primary-400">10% off</span> your first order</>}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                  {isKhmer
                    ? 'ចុះឈ្មោះអ៊ីមែលដើម្បីទទួលបានប័ណ្ណបញ្ចុះតម្លៃ និងការផ្តល់ជូនពិសេសប្រចាំសប្តាហ៍!'
                    : 'Join 5,000+ members for weekly deals, new arrivals & member-only promotions.'}
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  {[
                    isKhmer ? '✓ ឥតគិតថ្លៃ' : '✓ Free to join',
                    isKhmer ? '✓ លុបចោលបានគ្រប់ពេល' : '✓ Unsubscribe anytime',
                    isKhmer ? '✓ ទទួលបានភ្លាមៗ' : '✓ Instant access',
                  ].map((item) => (
                    <span key={item} className="text-xs text-emerald-400 font-medium">{item}</span>
                  ))}
                </div>
              </div>

              {/* Form Side */}
              <form onSubmit={handleNewsletter} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3.5 text-sm bg-slate-900/70 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 transition-all"
                    />
                  </div>
                  <div className="relative sm:w-40">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={newsletterPhone}
                      onChange={(e) => setNewsletterPhone(e.target.value)}
                      placeholder={isKhmer ? 'ទូរស័ព្ទ' : 'Phone (opt.)'}
                      className="w-full pl-10 pr-4 py-3.5 text-sm bg-slate-900/70 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-500 hover:via-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-60"
                >
                  {isSubscribing
                    ? (isKhmer ? 'កំពុងជាវ...' : 'Subscribing...')
                    : (isKhmer ? 'ជាវព័ត៌មាន' : 'Subscribe & Save 10%')}
                  {!isSubscribing && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN FOOTER BODY ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          {/* ── COL 1: Brand ── */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-5">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 group-hover:scale-105 transition-all duration-200">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-white font-black text-xl tracking-tight block leading-tight">{brandName}</span>
                <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest">Official Online Store</span>
              </div>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed">{brandDescription}</p>

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  {isKhmer ? 'បណ្តាញសង្គម' : 'Follow Us'}
                </p>
                <div className="flex items-center gap-2.5">
                  {socialLinks.map((link, i) => {
                    const Icon = socialIconFor(link);
                    return (
                      <a
                        key={`social-${i}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.name || 'Social'}
                        title={link.name}
                        className="w-9 h-9 bg-slate-800/80 hover:bg-primary-600 border border-slate-700/60 hover:border-primary-500 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md hover:shadow-primary-500/20"
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trust Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="font-medium">{isKhmer ? 'ទំនិញ 100% ធានាគុណភាព' : '100% Authentic & Quality Guaranteed'}</span>
            </div>
          </div>

          {/* ── COL 2: Shop Links ── */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary-500 to-indigo-500" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {isKhmer ? 'ហាងទំនិញ' : t(language, 'footerShop')}
              </h4>
            </div>
            <ul className="space-y-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors duration-150"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── COL 3: Account & Legal ── */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {isKhmer ? 'គណនី & សេវាកម្ម' : t(language, 'footerAccount')}
              </h4>
            </div>
            <ul className="space-y-3">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors duration-150"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── COL 4: Contact ── */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {isKhmer ? 'ទំនាក់ទំនង' : t(language, 'footerContact')}
              </h4>
            </div>

            <ul className="space-y-4">
              {/* Address */}
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-primary-400" />
                </div>
                <span className="text-sm text-slate-400 leading-relaxed">{address}</span>
              </li>

              {/* Phone */}
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex flex-col gap-1">
                  {phones.map((phone, idx) => (
                    <a
                      key={idx}
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="text-sm text-slate-400 hover:text-white transition-colors font-mono hover:underline underline-offset-2"
                    >
                      {phone}
                    </a>
                  ))}
                </div>
              </li>

              {/* Email */}
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-primary-400" />
                </div>
                <a
                  href={`mailto:${email}`}
                  className="text-sm text-slate-400 hover:text-white transition-colors hover:underline underline-offset-2 break-all"
                >
                  {email}
                </a>
              </li>

              {/* Hours */}
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-sm text-slate-400">
                  <span className="text-emerald-400 font-semibold text-xs">● {isKhmer ? 'បើកធ្វើការ' : 'Open'}</span>
                  <p>{isKhmer ? 'ច័ន្ទ – អាទិត្យ: 8:00 AM – 9:00 PM' : 'Mon – Sun: 8:00 AM – 9:00 PM'}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* ── STATS STRIP ── */}
        <div className="mt-14 mb-0 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: ShoppingBag, value: '5,000+', label: isKhmer ? 'ទំនិញ' : 'Products', color: 'text-primary-400' },
            { icon: Zap, value: '24/7', label: isKhmer ? 'ដឹកជញ្ជូន' : 'Delivery', color: 'text-indigo-400' },
            { icon: ShieldCheck, value: '100%', label: isKhmer ? 'ធានាគុណភាព' : 'Authentic', color: 'text-emerald-400' },
            { icon: CreditCard, value: '3+', label: isKhmer ? 'វិធីបង់ប្រាក់' : 'Payment Methods', color: 'text-violet-400' },
          ].map(({ icon: Icon, value, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl hover:border-slate-600/60 transition-colors"
            >
              <Icon className={`w-5 h-5 shrink-0 ${color}`} />
              <div>
                <p className={`text-base font-extrabold ${color} leading-none`}>{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Copyright */}
            <p className="text-xs text-slate-500 text-center sm:text-left order-3 sm:order-1">
              {footerInfo.copyright ||
                `© ${new Date().getFullYear()} ${brandName}. ${isKhmer ? 'រក្សាសិទ្ធិគ្រប់យ៉ាង។' : 'All rights reserved.'}`}
            </p>

            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 order-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors hover:underline underline-offset-4"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Payment & Security Badges */}
            <div className="flex items-center gap-2 order-1 sm:order-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] font-bold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Visa
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] font-bold text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                KHQR
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] font-bold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                SSL
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
