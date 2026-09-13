'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShieldCheck, Truck, Sparkles, Star, Award, Compass } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { settingApi } from '@/lib/api';

export function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const { language } = useLanguageStore();
  const isKhmer = language === 'km';
  const [adminSlides, setAdminSlides] = useState<Array<{
    tag?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    cta?: string;
    ctaHref?: string;
    bg?: string;
    accent?: string;
    image?: string;
  }>>([]);

  const defaultLuxurySlides = [
    {
      id: 1,
      tag: isKhmer ? 'បណ្តុំទំនិញប្រណិត ២០២៦' : 'Bespoke Collection 2026',
      title: isKhmer ? 'ភាពប្រណិតឥតខ្ចោះ' : 'Timeless Elegance',
      subtitle: isKhmer ? 'និងសិល្បៈទាន់សម័យ' : '& Modern Craft',
      description: isKhmer
        ? 'ស្វែងរកទំនិញគុណភាពខ្ពស់ ម៉ូដទាន់សម័យ និងការរចនាបែបប្រណិតដែលផ្ដល់ជូននូវបទពិសោធន៍ទិញទំនិញដ៏វិសេសវិសាល។'
        : 'Discover exquisite curations, haute couture fashion, and timeless essentials meticulously crafted for the refined lifestyle.',
      cta: isKhmer ? 'ទស្សនាការប្រមូលផ្ដុំ' : 'Explore The Collection',
      ctaHref: '/products',
      accent: '#d4af37',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1800&auto=format&fit=crop&q=85',
    },
    {
      id: 2,
      tag: isKhmer ? 'បច្ចេកវិទ្យា & នាឡិកាប្រណិត' : 'Horlogerie & Precision Tech',
      title: isKhmer ? 'ភាពច្នៃប្រឌិតកម្រិតខ្ពស់' : 'Refined Innovation',
      subtitle: isKhmer ? 'ភាពជាក់លាក់ & ទំនើបកម្ម' : '& High Performance',
      description: isKhmer
        ? 'បណ្តុំឧបករណ៍អេឡិចត្រូនិក និងគ្រឿងតុបតែងលម្អិតលំដាប់អន្តរជាតិ ដែលរួមបញ្ចូលនូវសោភ័ណភាព និងប្រសិទ្ធភាពខ្ពស់។'
        : 'Elevate your daily ritual with state-of-the-art audio, luxury timepieces, and precision electronics made without compromise.',
      cta: isKhmer ? 'ស្វែងរកឧបករណ៍ប្រណិត' : 'Discover Innovations',
      ctaHref: '/products?category=electronics',
      accent: '#f59e0b',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1800&auto=format&fit=crop&q=85',
    },
    {
      id: 3,
      tag: isKhmer ? 'ការរស់នៅបែបទាន់សម័យ' : 'Haute Living & Signature Scents',
      title: isKhmer ? 'សោភ័ណភាពនៃគេហដ្ឋាន' : 'Artisanal Living',
      subtitle: isKhmer ? 'ការតុបតែង & ទឹកអប់ប្រណិត' : '& Exclusive Aromas',
      description: isKhmer
        ? 'លើកកម្ពស់បរិយាកាសគេហដ្ឋានរបស់អ្នកជាមួយសម្ភារៈតុបតែង និងផលិតផលថែរក្សាសម្រស់ដ៏កម្រ និងមានកិត្យានុភាព។'
        : 'Infuse your space with architectural decor, limited edition fragrances, and organic skincare formulated for pure radiance.',
      cta: isKhmer ? 'ទិញឥឡូវនេះ' : 'Shop Exclusives',
      ctaHref: '/products?category=clothing',
      accent: '#e2c299',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1800&auto=format&fit=crop&q=85',
    },
  ];

  useEffect(() => {
    const applySlides = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const d = raw as { footerInfo?: { homepage?: unknown } };
      const info = (d.footerInfo || {}) as { homepage?: unknown };
      const rows = (info.homepage as { heroSlides?: unknown } | undefined)?.heroSlides;
      if (Array.isArray(rows) && rows.length > 0) setAdminSlides(rows as Array<Record<string, string>>);
    };

    settingApi
      .get()
      .then(({ data }) => {
        applySlides(data?.data);
      })
      .catch(() => {});

    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        applySlides(customEvent.detail);
      }
    };

    window.addEventListener('settings:updated', handleSettingsUpdated);
    return () => window.removeEventListener('settings:updated', handleSettingsUpdated);
  }, []);

  const renderedSlides =
    adminSlides.length > 0
      ? adminSlides.map((s, i) => ({
          id: i + 1,
          tag: s.tag || (isKhmer ? 'បណ្តុំទំនិញប្រណិត' : 'Bespoke Selection'),
          title: s.title || (isKhmer ? 'ភាពប្រណិតឥតខ្ចោះ' : 'Timeless Elegance'),
          subtitle: s.subtitle || '',
          description: s.description || (isKhmer ? 'បទពិសោធន៍ទិញទំនិញប្រណិតលំដាប់ខ្ពស់។' : 'Curated premium essentials.'),
          cta: s.cta || (isKhmer ? 'ទស្សនាការប្រមូលផ្ដុំ' : 'Explore Collection'),
          ctaHref: s.ctaHref || '/products',
          accent: s.accent || '#d4af37',
          image: s.image || defaultLuxurySlides[i % defaultLuxurySlides.length].image,
        }))
      : defaultLuxurySlides;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % renderedSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [renderedSlides.length]);

  const slide = renderedSlides[current];

  return (
    <section className="relative min-h-[75vh] sm:min-h-[88vh] bg-[#090a0f] text-white overflow-hidden flex items-center transition-colors duration-700">
      {/* Background Image with Cinematic Luxury Vignette */}
      <div
        key={slide.image}
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105 animate-fade-in"
        style={{ backgroundImage: `url(${slide.image})` }}
      />

      {/* Multi-layered Obsidian Black & Golden Vignette */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#090a0f] via-[#090a0f]/85 to-transparent sm:w-[75%] z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-[#090a0f]/40 z-[1]" />
      
      {/* Ambient Champagne Gold Lighting Orbs */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 z-[2] transition-all duration-1000"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.6) 0%, rgba(180,130,20,0.15) 70%, transparent 100%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 z-[2]"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 70%)' }}
      />

      {/* Main Content Container */}
      <div className="relative z-10 page-container w-full py-16 sm:py-24">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                {/* Luxury Tag Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase border border-amber-400/30 bg-black/40 backdrop-blur-xl text-amber-300 mb-6 shadow-sm shadow-amber-500/10">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>{slide.tag}</span>
                </div>

                {/* Editorial Luxury Headline */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight">
                  <span className="block drop-shadow-lg">{slide.title}</span>
                  {slide.subtitle && (
                    <span className="block luxury-gold-text italic font-serif font-normal text-3xl sm:text-5xl lg:text-6xl mt-2 tracking-normal">
                      {slide.subtitle}
                    </span>
                  )}
                </h1>

                {/* Refined Description */}
                <p className="text-sm sm:text-lg text-slate-300/90 mt-5 sm:mt-7 leading-relaxed font-normal max-w-xl">
                  {slide.description}
                </p>

                {/* Bespoke Luxury Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 mt-8 sm:mt-10">
                  <Link
                    href={slide.ctaHref}
                    className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:to-yellow-400 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 active:scale-95"
                  >
                    <span>{slide.cta}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </Link>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold text-sm sm:text-base text-white/90 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-amber-400/40 backdrop-blur-xl transition-all duration-300 active:scale-95"
                  >
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>{t(language, 'browseAll')}</span>
                  </Link>
                </div>

                {/* Luxury Credentials / Metrics Strip */}
                <div className="flex flex-wrap items-center gap-8 sm:gap-12 mt-10 pt-8 border-t border-white/10">
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">10K+</p>
                    <p className="text-xs text-amber-200/70 uppercase tracking-wider font-semibold mt-0.5">
                      {t(language, 'statProducts')}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-white/10 hidden sm:block" />
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">50K+</p>
                    <p className="text-xs text-amber-200/70 uppercase tracking-wider font-semibold mt-0.5">
                      {t(language, 'statCustomers')}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-white/10 hidden sm:block" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">4.9</p>
                      <div className="flex text-amber-400">
                        <Star className="w-4 h-4 fill-amber-400" />
                      </div>
                    </div>
                    <p className="text-xs text-amber-200/70 uppercase tracking-wider font-semibold mt-0.5">
                      {t(language, 'statRating')} (VIP Quality)
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Luxury Floating Concierge Cards (Desktop Only) */}
          <div className="lg:col-span-4 hidden lg:flex flex-col gap-3.5 items-end">
            <div className="w-72 p-4 rounded-2xl bg-black/40 border border-amber-500/20 backdrop-blur-2xl shadow-xl shadow-black/40 flex items-center gap-3.5 transition-all hover:border-amber-400/40 hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-600/30 flex items-center justify-center border border-amber-400/30 text-amber-300 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white tracking-wide">{t(language, 'freeShipping50')}</p>
                <p className="text-[11px] text-amber-300/70">White-Glove Priority Dispatch</p>
              </div>
            </div>

            <div className="w-72 p-4 rounded-2xl bg-black/40 border border-amber-500/20 backdrop-blur-2xl shadow-xl shadow-black/40 flex items-center gap-3.5 transition-all hover:border-amber-400/40 hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-600/30 flex items-center justify-center border border-amber-400/30 text-amber-300 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white tracking-wide">{t(language, 'securePayment')}</p>
                <p className="text-[11px] text-amber-300/70">100% Encrypted & Authenticated</p>
              </div>
            </div>

            <div className="w-72 p-4 rounded-2xl bg-black/40 border border-amber-500/20 backdrop-blur-2xl shadow-xl shadow-black/40 flex items-center gap-3.5 transition-all hover:border-amber-400/40 hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-600/30 flex items-center justify-center border border-amber-400/30 text-amber-300 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white tracking-wide">Certified Luxury Authenticity</p>
                <p className="text-[11px] text-amber-300/70">Verified Sourcing Standard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Champagne Slide Indicator Lines */}
        <div className="flex items-center gap-2 mt-8 sm:mt-12">
          {renderedSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === current
                  ? 'w-12 bg-gradient-to-r from-amber-300 to-yellow-500 shadow-sm shadow-amber-400/50'
                  : 'w-3 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

