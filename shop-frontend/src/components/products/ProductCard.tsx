'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Star, Eye } from 'lucide-react';
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
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const router = useRouter();

  const discount = getDiscountPercent(product.price, product.comparePrice || 0);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      toast.success(t(language, 'addedToCart'));
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
        className="group flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
      >
        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {product.thumbnail && (
            <Image src={product.thumbnail} alt={product.name} fill className="object-cover" sizes="64px" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{product.name}</p>
          <p className="text-sm font-semibold text-primary-600 mt-0.5">{formatPrice(product.price)}</p>
        </div>
      </Link>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative h-full card hover:shadow-2xl transition-all duration-500 cursor-pointer"
      onClick={() => router.push(`/products/${product.slug}`)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingCart className="w-12 h-12" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge bg-red-500 text-white text-xs">-{discount}%</span>
          )}
          {product.isFeatured && (
            <span className="badge bg-primary-600 text-white text-xs">{t(language, 'productsFeaturedOnlyLabel')}</span>
          )}
          {product.stock === 0 && (
            <span className="badge bg-gray-800/80 text-white text-xs">{t(language, 'outOfStock')}</span>
          )}
        </div>

        {/* Visual hover tint only — must not capture taps while invisible (mobile) */}
        <div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 z-10">
          <motion.button
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleWishlist}
            className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition-all ${
              isWishlisted
                ? 'bg-red-500 text-white'
                : 'glass text-gray-600 dark:text-gray-300 hover:text-red-500'
            }`}
          >
            <Heart className="w-4.5 h-4.5" fill={isWishlisted ? 'currentColor' : 'none'} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.15, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); router.push(`/products/${product.slug}`); }}
            className="w-10 h-10 glass rounded-2xl shadow-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-all"
          >
            <Eye className="w-4.5 h-4.5" />
          </motion.button>
        </div>

        {/* Quick add — hidden from pointer events until hover (touch: passes through to card) */}
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 z-10">
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || product.stock === 0}
            className="w-full btn-primary py-3 active:scale-[0.98] group/btn"
          >
            <ShoppingCart className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform mr-1" />
            {isAddingToCart ? t(language, 'adding') : product.stock === 0 ? t(language, 'outOfStock') : t(language, 'addToCart')}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        {product.brand && (
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{product.brand}</p>
        )}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3 h-3 ${s <= Math.round(product.rating) ? 'text-amber-400 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">({product.reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {formatPrice(product.price)}
          </span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>

        {product.stock > 0 && product.stock <= 10 && (
          <p className="text-xs text-orange-500 mt-1">{t(language, 'onlyLeft').replace('{count}', String(product.stock))}</p>
        )}
      </div>
    </motion.div>
  );
}
