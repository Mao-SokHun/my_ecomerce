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
  CheckCircle2,
  RotateCcw,
  Lock,
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
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[90]"
          />

          {/* Luxury Slide-over Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-[100] h-full w-full max-w-md sm:max-w-lg bg-white/95 dark:bg-[#11141b]/98 backdrop-blur-2xl shadow-[-25px_0_60px_rgba(0,0,0,0.35)] flex flex-col border-l border-slate-200/80 dark:border-white/[0.08]"
          >
            {/* Header: Glassmorphism with Item Count Pill */}
            <div className="relative px-5 py-4 bg-gradient-to-r from-slate-50/90 via-white/90 to-indigo-50/40 dark:from-[#151922] dark:via-[#11141b] dark:to-primary-950/20 border-b border-slate-200/80 dark:border-white/[0.08] shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-primary-500/25">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  {cart && cart.items.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#11141b] rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {isKhmer ? 'កន្ត្រកទំនិញ' : 'Shopping Bag'}
                    </h2>
                    <span className="px-2.5 py-0.5 text-xs font-black font-mono rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/50">
                      {cart?.itemCount || 0} {isKhmer ? 'មុខ' : (cart?.itemCount === 1 ? 'item' : 'items')}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    {isKhmer ? 'ទំនិញដែលបានជ្រើសរើសក្នុងកន្ត្រករបស់អ្នក' : 'Review your selected items'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="w-9 h-9 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-all border border-slate-200/60 dark:border-white/[0.08] active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Free Shipping Dynamic Meter */}
            {cart && cart.items.length > 0 && (
              <div className="px-5 py-3 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-primary-50/70 dark:from-[#181c26] dark:via-[#161a24] dark:to-[#181c26] border-b border-indigo-100/60 dark:border-white/[0.06] shrink-0">
                <div className="flex items-center justify-between text-xs mb-2 font-medium">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${isFreeShipping ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-primary-100 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400'}`}>
                      {isFreeShipping ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs">
                      {isFreeShipping ? (
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {isKhmer ? '🎉 អ្នកទទួលបានការដឹកជញ្ជូនឥតគិតថ្លៃ!' : '🎉 Free Shipping Unlocked!'}
                        </strong>
                      ) : (
                        <span>
                          {isKhmer ? (
                            <>ថែម <strong className="text-primary-600 dark:text-primary-400 font-mono font-bold">{formatPrice(freeShippingRemaining, language)}</strong> ទៀត ដើម្បីទទួលបាន <strong className="text-emerald-600 dark:text-emerald-400 font-bold">ដឹកជញ្ជូនឥតគិតថ្លៃ</strong></>
                          ) : (
                            <>Add <strong className="text-primary-600 dark:text-primary-400 font-mono font-bold">{formatPrice(freeShippingRemaining, language)}</strong> more for <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Free Shipping</strong></>
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 font-mono">
                    {freeShippingProgress}%
                  </span>
                </div>

                {/* Progress Track */}
                <div className="w-full h-2 bg-slate-200/80 dark:bg-surface-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-white/[0.04]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${freeShippingProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full rounded-full transition-all ${
                      isFreeShipping
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-xs shadow-emerald-500/50'
                        : 'bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500 shadow-xs shadow-primary-500/40'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 custom-scrollbar overscroll-contain">
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
                        className="group relative flex gap-3.5 p-3.5 bg-white dark:bg-[#151922] hover:bg-slate-50/90 dark:hover:bg-[#181d28] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] transition-all shadow-xs hover:shadow-md"
                      >
                        {/* Thumbnail with Luxury Glass Mask */}
                        <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 rounded-2xl overflow-hidden bg-slate-100 dark:bg-surface-800 border border-slate-200/60 dark:border-white/[0.06] shadow-xs">
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
                                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 transition-colors leading-snug"
                              >
                                {item.product.name}
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleRemove(item.id)}
                                aria-label="Remove item"
                                title={isKhmer ? 'លុបចេញពីកន្ត្រក' : 'Remove item'}
                                className="w-7 h-7 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 flex items-center justify-center transition-all shrink-0 active:scale-90"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Stock Warning Tag */}
                            {isLowStock && (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/60 px-2 py-0.5 rounded-md mt-1 border border-amber-200/60 dark:border-amber-800/40">
                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>{isKhmer ? `នៅសល់តែ ${item.product.stock} គ្រឿង` : `Only ${item.product.stock} left`}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-150/80 dark:border-white/[0.06]">
                            {/* Price */}
                            <div>
                              <p className="text-sm font-black text-primary-600 dark:text-primary-400 font-mono tracking-tight tabular-nums">
                                {formatPrice(item.product.price * item.quantity, language)}
                              </p>
                              {item.quantity > 1 && (
                                <p className="text-[10px] font-medium text-slate-400 font-mono">
                                  {formatPrice(item.product.price, language)} {isKhmer ? '/ឯកតា' : 'each'}
                                </p>
                              )}
                            </div>

                            {/* Capsule Stepper */}
                            <div className="flex items-center bg-slate-100/90 dark:bg-surface-800 border border-slate-200/80 dark:border-white/[0.08] rounded-xl p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={isLoading || item.quantity <= 1}
                                aria-label="Decrease quantity"
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-surface-700 hover:shadow-xs disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-90"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-black font-mono text-slate-900 dark:text-white tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1, item.product.stock)}
                                disabled={isLoading || item.quantity >= item.product.stock}
                                aria-label="Increase quantity"
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-surface-700 hover:shadow-xs disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Trust & Guarantee Strip */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-[#151922] dark:to-primary-950/20 border border-slate-200/60 dark:border-white/[0.06] space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{isKhmer ? 'ទំនិញសុទ្ធ ១០០%' : '100% Authentic'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{isKhmer ? 'ប្តូរវិញក្នុង ៧ថ្ងៃ' : '7-Day Easy Returns'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {cart && cart.items.length > 0 && (
              <div className="border-t border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#12151c]/95 backdrop-blur-2xl p-5 sm:p-6 space-y-4 shrink-0 shadow-[0_-12px_35px_rgba(0,0,0,0.08)] dark:shadow-[0_-12px_35px_rgba(0,0,0,0.4)]">
                {/* Cost Breakdown Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span>{isKhmer ? 'សរុបរង (Subtotal)' : 'Subtotal'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatPrice(cart.cartTotal, language)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-600 dark:text-slate-400">{isKhmer ? 'ថ្លៃដឹកជញ្ជូន (Delivery)' : 'Estimated Delivery'}</span>
                    {isFreeShipping ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                        {isKhmer ? 'ឥតគិតថ្លៃ ($0.00)' : 'FREE ($0.00)'}
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatPrice(9.99, language)}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/80 dark:border-white/[0.08]">
                    <div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {isKhmer ? 'សរុបរួម (Total)' : 'Total'}
                      </span>
                      <p className="text-[10px] font-medium text-slate-400">
                        {isKhmer ? 'រួមបញ្ចូលពន្ធ VAT' : 'Including VAT'}
                      </p>
                    </div>
                    <span className="text-xl sm:text-2xl font-mono text-primary-600 dark:text-primary-400 font-black tabular-nums tracking-tight">
                      {formatPrice(cart.cartTotal + (isFreeShipping ? 0 : 9.99), language)}
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
                    className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                    type="button"
                  >
                    <span>{isKhmer ? 'បន្តទៅទូទាត់ប្រាក់' : 'Proceed to Checkout'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 border border-slate-200/60 dark:border-white/[0.08]"
                  >
                    <span>{isKhmer ? 'មើលកន្ត្រកពេញ (View Full Cart)' : 'View Full Cart'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>

                {/* Security Trust Badges & Verified Payment Logos */}
                <div className="pt-1 flex items-center justify-between border-t border-slate-150 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <Lock className="w-3 h-3 text-emerald-500" />
                    <span>{isKhmer ? 'ទូទាត់សុវត្ថិភាព' : 'Secure Checkout'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06]">
                      VISA
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06]">
                      KHQR
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/[0.08] text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                      SSL
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
