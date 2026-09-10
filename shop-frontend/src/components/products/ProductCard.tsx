'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Star, Eye, Sparkles, Plus, Check } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice, getDiscountPercent } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/lib/api';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
}

export function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const router = useRouter();

  const discount = getDiscountPercent(product.price, product.comparePrice || 0);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock === 0 || isAddingToCart) return;

    setIsAddingToCart(true);
    try {
      await addItem(product.id, 1, undefined, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        comparePrice: product.comparePrice,
        thumbnail: product.thumbnail,
        stock: product.stock,
        isActive: product.isActive,
      });
      setJustAdded(true);
      toast.success(t(language, 'addedToCart'));
      setTimeout(() => setJustAdded(false), 1800);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t(language, 'failedAddToCart');
      toast.error(msg);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error(t(language, 'signInSaveItems'));
      return;
    }
    try {
      const { data } = await userApi.toggleWishlist(product.id);
      const inWishlist = Boolean(data?.inWishlist);
      setIsWishlisted(inWishlist);
      toast.success(inWishlist ? t(language, 'addedToWishlist') : t(language, 'removedFromWishlist'));
    } catch {
      toast.error(t(language, 'failedUpdateWishlist'));
    }
  };

  if (variant === 'compact') {
    return (
      <Link
        href={`/products/${product.slug}`}
        className="group flex gap-3 p-3 bg-white dark:bg-surface-900 hover:bg-gray-50 dark:hover:bg-surface-800 rounded-2xl border border-gray-200 dark:border-surface-750 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-surface-800">
          {product.thumbnail && (
            <Image src={product.thumbnail} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="64px" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary-600 transition-colors">{product.name}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatPrice(product.price, language)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-xs text-gray-400 dark:text-gray-500 line-through">{formatPrice(product.comparePrice, language)}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group relative flex flex-col justify-between h-full bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black/60 hover:border-primary-500/40 dark:hover:border-primary-500/50 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => router.push(`/products/${product.slug}`)}
    >
      {/* Top Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50 dark:bg-slate-850/80">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
            <ShoppingCart className="w-12 h-12 stroke-1" />
          </div>
        )}

        {/* Soft dark vignette on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Badges (Top Left) */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 flex flex-col items-start gap-1.5 pointer-events-none">
          {product.stock === 0 && (
            <span className="inline-flex items-center gap-1 bg-red-600/95 backdrop-blur-md text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 sm:py-1 rounded-full shadow-md shadow-red-500/30 tracking-tight">
              <span>{language === 'km' ? '⚠️ អស់ស្តុក' : language === 'zh' ? '缺货' : 'Out of Stock'}</span>
            </span>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="inline-flex items-center gap-1 bg-amber-500/95 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 sm:py-1 rounded-full shadow-md shadow-amber-500/30 tracking-tight animate-pulse">
              <span>{language === 'km' ? `🔥 នៅសល់តែ ${product.stock}` : `🔥 Only ${product.stock} left`}</span>
            </span>
          )}
          {discount > 0 && (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 sm:py-1 rounded-full shadow-md shadow-red-500/20 tracking-tight">
              <span>-{discount}%</span>
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 sm:py-0.5 rounded-full shadow-md shadow-amber-500/20 tracking-wide">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-100 fill-amber-100" />
              <span>{t(language, 'badgeFeatured')}</span>
            </span>
          )}
        </div>

        {/* Floating Quick Action Buttons (Top Right) */}
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 flex flex-col gap-1.5 sm:gap-2">
          {/* Wishlist Button */}
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleWishlist}
            aria-label="Add to wishlist"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow-md border transition-all duration-200 ${
              isWishlisted
                ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/30'
                : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-white/60 dark:border-white/10 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <Heart className={`w-4 h-4 transition-transform duration-200 ${isWishlisted ? 'fill-current scale-110' : ''}`} />
          </motion.button>

          {/* Quick View Button */}
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/products/${product.slug}`);
            }}
            aria-label="Quick view"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-white/60 dark:border-white/10 hover:text-primary-600 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center backdrop-blur-md shadow-md opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200"
          >
            <Eye className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Desktop Slide-up Quick Add Button */}
        <div className="absolute bottom-3 left-3 right-3 z-10 hidden sm:block opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out">
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || product.stock === 0}
            className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm shadow-xl backdrop-blur-md flex items-center justify-center gap-2 active:scale-98 transition-all duration-200 ${
              product.stock === 0
                ? 'bg-slate-800/90 text-slate-400 cursor-not-allowed'
                : justAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900/95 hover:bg-black text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4 text-white animate-scale-in" />
                <span>{t(language, 'addedToCart')}</span>
              </>
            ) : isAddingToCart ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>{t(language, 'adding')}</span>
              </span>
            ) : product.stock === 0 ? (
              <span>{t(language, 'outOfStock')}</span>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>{t(language, 'addToCart')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card Content & Details (Dark mode high-contrast background) */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5 sm:gap-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80">
        {/* Brand & Title */}
        <div className="space-y-1">
          {product.brand ? (
            <p className="text-[10px] sm:text-[11px] font-extrabold text-primary-600 dark:text-primary-400 uppercase tracking-wider line-clamp-1">
              {product.brand}
            </p>
          ) : (
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              SH-Shop
            </p>
          )}

          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors min-h-[2rem] sm:min-h-[2.5rem]">
            {product.name}
          </h3>
        </div>

        {/* Rating Row */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3 h-3 ${
                  product.reviewCount > 0 && s <= Math.round(product.rating || 0)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 dark:text-slate-700 fill-slate-200 dark:fill-slate-700'
                }`}
              />
            ))}
          </div>
          {product.reviewCount > 0 ? (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              ({product.reviewCount})
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              New
            </span>
          )}
        </div>

        {/* Price and Mobile Quick-Add Button Row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm sm:text-base md:text-lg font-black text-slate-950 dark:text-white tabular-nums tracking-tight">
                {formatPrice(product.price, language)}
              </span>
              {product.comparePrice && product.comparePrice > product.price && (
                <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 line-through tabular-nums">
                  {formatPrice(product.comparePrice, language)}
                </span>
              )}
            </div>

            {/* Low stock alert */}
            {product.stock > 0 && product.stock <= 5 && (
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {t(language, 'onlyLeft').replace('{count}', String(product.stock))}
              </span>
            )}
          </div>

          {/* Quick-Add Button (Always visible on mobile, icon button) */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleAddToCart}
            disabled={isAddingToCart || product.stock === 0}
            aria-label="Add to cart"
            className={`sm:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm ${
              product.stock === 0
                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                : justAdded
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-primary-600 text-white shadow-primary-600/20 hover:bg-primary-700 active:scale-95'
            }`}
          >
            {justAdded ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : isAddingToCart ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4 stroke-[2.5]" />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
