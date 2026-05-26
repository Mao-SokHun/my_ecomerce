'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, ShieldCheck, Truck } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { settingApi } from '@/lib/api';

export function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const { language } = useLanguageStore();
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

  const slides = [
    {
      id: 1,
      tag: t(language, 'heroTagNewSeason'),
      title: t(language, 'heroTitlePremium'),
      subtitle: t(language, 'heroSubtitleFast'),
      description: t(language, 'heroDescPremium'),
      cta: t(language, 'heroCtaShopNow'),
      ctaHref: '/products',
      bg: 'from-primary-900 via-primary-800 to-indigo-900',
      accent: '#6366f1',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop',
    },
    {
      id: 2,
      tag: t(language, 'heroTagBigSale'),
      title: t(language, 'heroTitleUpTo'),
      subtitle: t(language, 'heroSubtitleElectronics'),
      description: t(language, 'heroDescElectronics'),
      cta: t(language, 'heroCtaViewDeals'),
      ctaHref: '/products?category=electronics',
      bg: 'from-slate-900 via-gray-900 to-zinc-900',
      accent: '#f97316',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format&fit=crop',
    },
    {
      id: 3,
      tag: t(language, 'heroTagNewArrivals'),
      title: t(language, 'heroTitleFashion'),
      subtitle: t(language, 'heroSubtitleSeason'),
      description: t(language, 'heroDescFashion'),
      cta: t(language, 'heroCtaExplore'),
      ctaHref: '/products?category=clothing',
      bg: 'from-rose-900 via-pink-900 to-fuchsia-900',
      accent: '#f43f5e',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format&fit=crop',
    },
  ];
  useEffect(() => {
    settingApi
      .get()
      .then(({ data }) => {
        const info = (data.data?.footerInfo || {}) as { homepage?: unknown };
        const rows = (info.homepage as { heroSlides?: unknown } | undefined)?.heroSlides;
        if (Array.isArray(rows)) setAdminSlides(rows as Array<Record<string, string>>);
      })
      .catch(() => {});
  }, []);
  const renderedSlides =
    adminSlides.length > 0
      ? adminSlides.map((s, i) => ({
          id: i + 1,
          tag: s.tag || t(language, 'heroTagNewSeason'),
          title: s.title || t(language, 'heroTitlePremium'),
          subtitle: s.subtitle || t(language, 'heroSubtitleFast'),
          description: s.description || t(language, 'heroDescPremium'),
          cta: s.cta || t(language, 'heroCtaShopNow'),
          ctaHref: s.ctaHref || '/products',
          bg: s.bg || 'from-primary-900 via-primary-800 to-indigo-900',
          accent: s.accent || '#6366f1',
          image:
            s.image ||
            'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop',
        }))
      : slides;
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % renderedSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [renderedSlides.length]);

  const slide = renderedSlides[current];

  return (
    <section className={`relative min-h-[70vh] sm:min-h-[85vh] bg-gradient-to-br ${slide.bg} overflow-hidden transition-all duration-500 ease-smooth-out`}>
      {/* Background image */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10 bg-cover bg-center transition-all duration-500 ease-smooth-out"
        style={{ backgroundImage: `url(${slide.image})` }}
      />

      {/* Noise texture overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-5" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.4\'/%3E%3C/svg%3E")'
      }} />

      {/* Glow orbs */}
      <div className="pointer-events-none absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: slide.accent }} />
      <div className="pointer-events-none absolute bottom-10 left-10 w-64 h-64 rounded-full blur-3xl opacity-15"
        style={{ backgroundColor: slide.accent }} />

      <div className="relative z-10 page-container flex flex-col justify-center min-h-[70vh] sm:min-h-[85vh] pb-16 sm:pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6"
              style={{ backgroundColor: `${slide.accent}33`, color: slide.accent, border: `1px solid ${slide.accent}55` }}
            >
              <Sparkles className="w-4 h-4" />
              {slide.tag}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl sm:text-5xl lg:text-7xl xl:text-8xl font-black text-white leading-[1.1] tracking-normal"
            >
              {slide.title}
              <br />
              <span className="text-white/60">{slide.subtitle}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm sm:text-xl text-white/70 mt-4 sm:mt-8 leading-relaxed max-w-lg font-medium"
            >
              {slide.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-3 sm:gap-4 mt-6 sm:mt-10"
            >
              <Link
                href={slide.ctaHref}
                className="btn-primary px-6 py-3 text-sm sm:px-8 sm:py-4 sm:text-lg active:scale-95 group"
                style={{ backgroundColor: slide.accent }}
              >
                {slide.cta} 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200 ease-smooth-out" />
              </Link>
              <Link
                href="/products"
                className="btn-secondary px-6 py-3 text-sm sm:px-8 sm:py-4 sm:text-lg bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-white transition-all duration-200 ease-smooth-out motion-reduce:transition-none"
              >
                {t(language, 'browseAll')}
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-5 sm:gap-8 mt-8 sm:mt-12"
            >
              {[
                { value: '10K+', label: t(language, 'statProducts') },
                { value: '50K+', label: t(language, 'statCustomers') },
                { value: '4.9★', label: t(language, 'statRating') },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-lg sm:text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-white/50">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {renderedSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ease-smooth-out ${
                i === current ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Feature badges */}
        <div className="absolute bottom-8 right-0 hidden lg:flex flex-col gap-3">
          {[
            { icon: Truck, text: t(language, 'freeShipping50') },
            { icon: ShieldCheck, text: t(language, 'securePayment') },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-l-xl text-white/80 text-sm">
              <Icon className="w-4 h-4" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
