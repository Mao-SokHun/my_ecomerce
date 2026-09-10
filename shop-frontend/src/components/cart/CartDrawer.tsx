'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  X,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  Truck,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import toast from 'react-hot-toast';

const FREE_SHIPPING_THRESHOLD = 50;

export function CartDrawer() {
  const { cart, isOpen, closeCart, updateItem, removeItem, isLoading } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const router = useRouter();

  const isKhmer = language === 'km';
  const cartTotal = cart?.cartTotal || 0;
  const freeShippingProgress = Math.min(100, Math.round((cartTotal / FREE_SHIPPING_THRESHOLD) * 100));
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const isFreeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD;

  const handleQuantityChange = async (itemId: string, newQty: number, maxStock?: number) => {
    if (newQty < 1) return;
    if (maxStock !== undefined && newQty > maxStock) {
      toast.error(isKhmer ? `សុំទោស ស្តុកនៅសល់ត្រឹមតែ ${maxStock} ប៉ុណ្ណោះ` : `Only ${maxStock} items in stock`);
      return;
    }
    try {
      await updateItem(itemId, newQty);
    } catch {
      toast.error(t(language, 'failedUpdateQuantity'));
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast.success(t(language, 'itemRemoved'));
    } catch {
      toast.error(t(language, 'failedRemoveItem'));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex justify-end overflow-hidden"
          style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
        >
          {/* Backdrop with Smooth Frosted Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[90]"
          />

          {/* Luxury Slide-over Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-[100] h-full w-full max-w-md sm:max-w-lg bg-white dark:bg-surface-900 shadow-[-20px_0_50px_rgba(0,0,0,0.25)] flex flex-col border-l border-slate-100 dark:border-surface-800"
          >
            {/* Header: Glassmorphism with Item Count Pill */}
            <div className="relative px-6 py-4.5 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 dark:from-surface-900 dark:via-surface-900 dark:to-primary-950/20 border-b border-slate-150 dark:border-surface-800 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-primary-500/25">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {isKhmer ? 'កន្ត្រកទំនិញ' : 'Shopping Cart'}
                    </h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                      {cart?.itemCount || 0} {isKhmer ? 'មុខ' : (cart?.itemCount === 1 ? 'item' : 'items')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isKhmer ? 'ពិនិត្យទំនិញ និងទូទាត់ប្រាក់' : 'Review items & checkout securely'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-750 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Free Shipping Dynamic Meter */}
            {cart && cart.items.length > 0 && (
              <div className="px-6 py-3 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-primary-50/80 dark:from-surface-850 dark:via-surface-850 dark:to-surface-850 border-b border-indigo-100/60 dark:border-surface-800 shrink-0">
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Truck className={`w-4 h-4 ${isFreeShipping ? 'text-emerald-500' : 'text-primary-600'}`} />
                    <span>
                      {isFreeShipping ? (
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {isKhmer ? '🎉 អ្នកទទួលបានការដឹកជញ្ជូនឥតគិតថ្លៃ!' : '🎉 Free Shipping Unlocked!'}
                        </strong>
                      ) : (
                        <span>
                          {isKhmer ? (
                            <>ថែម <strong className="text-primary-600 dark:text-primary-400 font-mono">{formatPrice(freeShippingRemaining)}</strong> ទៀតដើម្បីទទួលបាន <strong className="text-emerald-600 dark:text-emerald-400">ដឹកជញ្ជូនឥតគិតថ្លៃ</strong></>
                          ) : (
                            <>Add <strong className="text-primary-600 font-mono">{formatPrice(freeShippingRemaining)}</strong> more for <strong className="text-emerald-600">Free Shipping</strong></>
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                    {freeShippingProgress}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-200 dark:bg-surface-750 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${freeShippingProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full rounded-full transition-all ${
                      isFreeShipping
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                        : 'bg-gradient-to-r from-primary-500 to-indigo-600'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 custom-scrollbar">
              {cart?.items.length === 0 || !cart ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="relative mb-5">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-primary-50 to-indigo-100 dark:from-surface-800 dark:to-surface-750 flex items-center justify-center shadow-inner">
                      <ShoppingBag className="w-11 h-11 text-primary-400 dark:text-primary-500" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-white dark:border-surface-900 flex items-center justify-center text-amber-500 shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                    {isKhmer ? 'កន្ត្រករបស់អ្នកកំពុងទទេ' : 'Your cart is empty'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
                    {isKhmer
                      ? 'រកមើលផលិតផលគុណភាពខ្ពស់ និងប្រូម៉ូសិនពិសេសៗនៅក្នុងហាងយើងខ្ញុំ!'
                      : 'Explore top products, great deals and fill your bag with great finds.'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-xs">
                    {[
                      { name: isKhmer ? 'ស្មាតហ្វូន' : 'Phones', href: '/products?category=smartphones' },
                      { name: isKhmer ? 'កុំព្យូទ័រ' : 'Laptops', href: '/products?category=laptops' },
                      { name: isKhmer ? 'កាសស្តាប់' : 'Audio', href: '/products?category=audio' },
                      { name: isKhmer ? 'ប្រូម៉ូសិន' : 'Deals', href: '/products?deals=true' },
                    ].map((cat) => (
                      <Link
                        key={cat.name}
                        href={cat.href}
                        onClick={closeCart}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-700 dark:text-slate-300 hover:text-primary-600 text-xs font-medium transition"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>

                  <Link
                    href="/products"
                    onClick={closeCart}
                    className="btn-primary text-xs px-6 py-3 rounded-2xl shadow-lg shadow-primary-500/25 flex items-center gap-2"
                  >
                    <span>{isKhmer ? 'ទៅកាន់ទំព័រទំនិញ' : 'Browse Products'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.items.map((item) => {
                    const isLowStock = item.product.stock <= 5 && item.product.stock > 0;
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={item.id}
                        className="group relative flex gap-3.5 p-3.5 bg-slate-50/70 hover:bg-slate-50 dark:bg-surface-850 dark:hover:bg-surface-800/90 rounded-2xl border border-slate-150/80 dark:border-surface-750 transition-all shadow-xs hover:shadow-md"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 rounded-xl overflow-hidden bg-white dark:bg-surface-800 border border-slate-100 dark:border-surface-700 shadow-xs">
                          {item.product.thumbnail ? (
                            <Image
                              src={item.product.thumbnail}
                              alt={item.product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="90px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-surface-800">
                              <ShoppingBag className="w-7 h-7 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                href={`/products/${item.product.slug}`}
                                onClick={closeCart}
                                className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 transition-colors leading-snug"
                              >
                                {item.product.name}
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleRemove(item.id)}
                                aria-label="Remove item"
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Stock Warning Tag */}
                            {isLowStock && (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md mt-1">
                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>{isKhmer ? `នៅសល់តែ ${item.product.stock}` : `Only ${item.product.stock} left`}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-200/50 dark:border-surface-750">
                            {/* Price */}
                            <div>
                              <p className="text-sm font-black text-primary-600 dark:text-primary-400 font-mono tracking-tight">
                                {formatPrice(item.product.price * item.quantity)}
                              </p>
                              {item.quantity > 1 && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {formatPrice(item.product.price)} {isKhmer ? '/ឯកតា' : 'each'}
                                </p>
                              )}
                            </div>

                            {/* Capsule Stepper */}
                            <div className="flex items-center bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-700 rounded-xl p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={isLoading || item.quantity <= 1}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-700 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-90"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-bold font-mono text-slate-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1, item.product.stock)}
                                disabled={isLoading || item.quantity >= item.product.stock}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-700 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {cart && cart.items.length > 0 && (
              <div className="border-t border-slate-200/80 dark:border-surface-800 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl p-5 sm:p-6 space-y-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.06)]">
                {/* Cost Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                    <span>{isKhmer ? 'សរុបរង (Subtotal)' : 'Subtotal'}</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatPrice(cart.cartTotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{isKhmer ? 'ថ្លៃដឹកជញ្ជូន (Delivery)' : 'Estimated Delivery'}</span>
                    {isFreeShipping ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        {isKhmer ? 'ឥតគិតថ្លៃ ($0.00)' : 'FREE ($0.00)'}
                      </span>
                    ) : (
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">$9.99</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-sm sm:text-base font-black text-slate-900 dark:text-white pt-2.5 border-t border-slate-200/70 dark:border-surface-800">
                    <div>
                      <span>{isKhmer ? 'សរុបរួម (Total)' : 'Total'}</span>
                      <p className="text-[10px] font-normal text-slate-400">{isKhmer ? 'រួមបញ្ចូលពន្ធ VAT' : 'Including VAT'}</p>
                    </div>
                    <span className="text-lg sm:text-xl font-mono text-primary-600 dark:text-primary-400 font-black">
                      {formatPrice(cart.cartTotal + (isFreeShipping ? 0 : 9.99))}
                    </span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      closeCart();
                      if (!isAuthenticated) {
                        toast.error(t(language, 'signInToContinue'));
                        router.push('/login?redirect=/checkout');
                        return;
                      }
                      router.push('/checkout');
                    }}
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                    type="button"
                  >
                    <span>{isKhmer ? 'បន្តទៅទូទាត់ប្រាក់' : 'Proceed to Checkout'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-750 text-slate-700 dark:text-slate-300 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>{isKhmer ? 'មើលកន្ត្រកពេញ (View Full Cart)' : 'View Full Cart'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>

                {/* Security Trust Badges */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    {isKhmer ? 'សុវត្ថិភាព 100%' : '100% Secure'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-primary-500" />
                    {isKhmer ? 'ដឹកជញ្ជូនរហ័ស' : 'Fast Delivery'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {isKhmer ? 'គាំទ្រ 24/7' : '24/7 Support'}
                  </span>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
