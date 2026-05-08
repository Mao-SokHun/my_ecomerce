'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, ShoppingBag, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import toast from 'react-hot-toast';

export function CartDrawer() {
  const { cart, isOpen, closeCart, updateItem, removeItem, isLoading } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const router = useRouter();

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
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
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-surface-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t(language, 'cart')} ({cart?.itemCount || 0})
                </h2>
              </div>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-gray-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto py-4 px-5 space-y-4">
              {cart?.items.length === 0 || !cart ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-1">{t(language, 'yourCartIsEmpty')}</p>
                  <p className="text-sm text-gray-400 mb-4">{t(language, 'addProductsToStart')}</p>
                  <Link href="/products" onClick={closeCart} className="btn-primary text-sm">
                    {t(language, 'browseProducts')}
                  </Link>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 bg-gray-50 dark:bg-surface-800 rounded-xl">
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-white">
                      {item.product.thumbnail ? (
                        <Image
                          src={item.product.thumbnail}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.product.slug}`}
                        onClick={closeCart}
                        className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sm font-semibold text-primary-600 mt-0.5">
                        {formatPrice(item.product.price)}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={isLoading || item.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center bg-white dark:bg-surface-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={isLoading || item.quantity >= item.product.stock}
                            className="w-7 h-7 flex items-center justify-center bg-white dark:bg-surface-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart && cart.items.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 p-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{t(language, 'subtotal')}</span>
                    <span>{formatPrice(cart.cartTotal)}</span>
                  </div>
                  {cart.cartTotal >= 50 ? (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t(language, 'freeShipping')}</span>
                      <span>$0.00</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{t(language, 'shipping')}</span>
                      <span>$9.99</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span>{t(language, 'total')}</span>
                    <span>{formatPrice(cart.cartTotal + (cart.cartTotal >= 50 ? 0 : 9.99))}</span>
                  </div>
                </div>

                {cart.cartTotal < 50 && (
                  <p className="text-xs text-center text-green-600">
                    {t(language, 'addMoreForFreeShipping').replace('{amount}', formatPrice(50 - cart.cartTotal))}
                  </p>
                )}

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
                  className="btn-primary w-full text-sm"
                  type="button"
                >
                  {t(language, 'proceedToCheckout')} <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="btn-secondary w-full text-sm"
                >
                  {t(language, 'viewFullCart')}
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
