'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star, ShoppingCart, Heart, Truck, ShieldCheck, RefreshCw,
  Minus, Plus, Share2, ChevronRight, CheckCircle, Copy, Check, X, Send as TelegramIcon, Facebook,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, Review } from '@/types';
import { ProductCard } from '@/components/products/ProductCard';
import { productApi, reviewApi, userApi } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { formatPrice, getDiscountPercent, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const { addItem, isLoading: cartLoading } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const isKhmer = language === 'km';

  useEffect(() => {
    setLoading(true);
    productApi.getBySlug(slug)
      .then(async ({ data }) => {
        const prod = data.data;
        setProduct(prod);
        if (prod?.category?.id) {
          productApi.getAll({ category: prod.category.id, limit: 6 })
            .then(({ data: relData }) => {
              setRelated(relData.data?.filter((p: Product) => p.id !== prod.id).slice(0, 6) || []);
            }).catch(() => {});
        }
        if (prod?.id) {
          reviewApi.getByProduct(prod.id)
            .then(({ data: revData }) => setReviews(revData.data || []))
            .catch(() => {});
        }
        if (isAuthenticated && prod?.id) {
          userApi.getWishlist()
            .then(({ data: wData }) => {
              const inList = wData.data?.some((item: { product?: { id: string }; productId?: string }) =>
                (item.product?.id || item.productId) === prod.id
              );
              setIsWishlisted(Boolean(inList));
            }).catch(() => {});
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug, isAuthenticated]);

  const variantGroups = product?.variants?.reduce((acc, v) => {
    if (!acc[v.name]) acc[v.name] = [];
    acc[v.name].push(v);
    return acc;
  }, {} as Record<string, typeof product.variants>) || {};

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      const chosenVariant = product.variants?.find(
        v => Object.entries(selectedVariants).every(([name, val]) => v.name === name && v.value === val)
      );
      await addItem(product.id, quantity, chosenVariant?.id, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: calculatedPrice,
        comparePrice: product.comparePrice,
        thumbnail: product.thumbnail,
        stock: product.stock,
        isActive: product.isActive,
      });
      toast.success(isKhmer ? 'បានបន្ថែមទៅកន្ត្រកជោគជ័យ!' : 'Added to cart!');
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add');
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) { toast.error(isKhmer ? 'សូមចូលគណនីជាមុនសិន' : 'Please sign in first'); return; }
    try {
      const { data } = await userApi.toggleWishlist(product!.id);
      const inWishlist = Boolean(data?.inWishlist);
      setIsWishlisted(inWishlist);
      toast.success(inWishlist ? (isKhmer ? 'Added to wishlist' : 'Added to wishlist') : (isKhmer ? 'Removed from wishlist' : 'Removed from wishlist'));
    } catch { toast.error('Failed to update wishlist'); }
  };

  const handleShare = async () => {
    if (!product) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: product.name,
      text: `${product.name} - ${formatPrice(calculatedPrice)} on SH-Shop`,
      url,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to modal if dismissed or error
      }
    }

    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success(isKhmer ? '🔗 បានចម្លងតំណភ្ជាប់ទំនិញជោគជ័យ!' : '🔗 Product link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error('Please sign in to review'); return; }
    setSubmittingReview(true);
    try {
      await reviewApi.create(product!.id, reviewForm);
      const res = await reviewApi.getByProduct(product!.id);
      setReviews(res.data.data || []);
      setReviewForm({ rating: 5, title: '', comment: '' });
      toast.success('Review submitted!');
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container py-8">
        <div className="grid lg:grid-cols-2 gap-10 animate-pulse">
          <div className="space-y-3">
            <div className="aspect-square bg-gray-200 dark:bg-surface-800 rounded-2xl" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => <div key={`thumb-skeleton-${i}`} className="aspect-square bg-gray-200 dark:bg-surface-800 rounded-xl" />)}
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => <div key={`text-skeleton-${i}`} className={`h-6 bg-gray-200 dark:bg-surface-800 rounded w-${['1/3', '2/3', 'full', '1/2', '1/4'][i - 1]}`} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!product) return (
    <div className="page-container py-20 text-center">
      <h2 className="text-xl font-semibold">{t(language, 'productNotFound')}</h2>
      <Link href="/products" className="btn-primary mt-4 inline-flex">{t(language, 'browseAll')}</Link>
    </div>
  );

  const images = product.images.length > 0 ? product.images : [product.thumbnail || ''];
  const discount = getDiscountPercent(product.price, product.comparePrice || 0);

  const selectedVariantObjects = product.variants?.filter(v => selectedVariants[v.name] === v.value) || [];
  const calculatedPrice = product.price + selectedVariantObjects.reduce((sum, v) => sum + (v.price || 0), 0);

  return (
    <div className="page-container py-6 sm:py-8 pb-28 sm:pb-8">
      {/* Breadcrumb */}
      <nav className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600">{t(language, 'home')}</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/products" className="hover:text-primary-600">{t(language, 'products')}</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-primary-600">
          {product.category.name}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-white truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main product section */}
      <div className="grid lg:grid-cols-2 gap-10 mb-16">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 dark:bg-surface-800">
            <Image
              src={images[selectedImage]}
              alt={product.name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {discount > 0 && (
              <div className="absolute top-4 left-4">
                <span className="badge bg-red-500 text-white text-sm px-3 py-1">-{discount}%</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    i === selectedImage ? 'border-primary-600' : 'border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" sizes="100px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          {product.brand && (
            <Link href={`/products?brand=${product.brand}`} className="text-sm font-semibold text-primary-600 hover:underline">
              {product.brand}
            </Link>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-2 leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${s <= Math.round(product.rating) ? 'text-amber-400 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{product.rating.toFixed(1)}</span>
            <button
              onClick={() => setActiveTab('reviews')}
              className="text-sm text-primary-600 hover:underline"
            >
              {product.reviewCount} reviews
            </button>
            {product.soldCount > 0 && (
              <span className="text-sm text-gray-400">{product.soldCount} sold</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mt-5">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {formatPrice(calculatedPrice)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>
                <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  Save {formatPrice(product.comparePrice - product.price)}
                </span>
              </>
            )}
          </div>

          {product.shortDesc && (
            <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm leading-relaxed">
              {product.shortDesc}
            </p>
          )}

          {/* Variants */}
          {Object.entries(variantGroups).map(([variantName, variants]) => (
            <div key={variantName} className="mt-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {variantName}: <span className="font-normal text-gray-500">{selectedVariants[variantName] || t(language, 'select')}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {variants?.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariants((prev) => ({ ...prev, [variantName]: v.value }))}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-all ${
                      selectedVariants[variantName] === v.value
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:text-gray-300'
                    }`}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div className="mt-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t(language, 'quantity')}</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {product.stock > 0 ? (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {product.stock <= 10 ? `Only ${product.stock} left!` : t(language, 'inStock')}
                </span>
              ) : (
                <span className="text-sm text-red-500">{t(language, 'outOfStock')}</span>
              )}
            </div>
          </div>

          {/* Actions — desktop */}
          <div className="hidden sm:flex gap-3 mt-6">
            <button
              onClick={handleAddToCart}
              disabled={cartLoading || product.stock === 0}
              className="btn-primary flex-1 py-3 text-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartLoading ? t(language, 'adding') : t(language, 'addToCart')}
            </button>
            <button
              onClick={handleWishlist}
              className={`w-12 h-12 flex items-center justify-center border rounded-xl transition-all ${
                isWishlisted
                  ? 'border-red-500 bg-red-50 text-red-500 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Heart className="w-5 h-5" fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleShare}
              type="button"
              aria-label="Share product"
              className="w-12 h-12 flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600 hover:border-primary-300 dark:hover:border-primary-500 rounded-xl transition-all active:scale-95"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Benefits */}
          <div className="mt-6 space-y-2.5 p-4 bg-gray-50 dark:bg-surface-800 rounded-2xl">
            {[
              { icon: Truck, text: 'Free delivery on orders over $50' },
              { icon: ShieldCheck, text: '2-year warranty included' },
              { icon: RefreshCw, text: '30-day hassle-free returns' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Icon className="w-4 h-4 text-primary-600 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs: Description & Reviews */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex gap-6">
          {(['description', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'description' ? t(language, 'description') : t(language, 'reviews')} {tab === 'reviews' && `(${product.reviewCount})`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'description' ? (
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {product.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-surface-800 text-sm text-gray-600 dark:text-gray-400 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Review summary */}
          <div className="flex flex-col sm:flex-row gap-8 mb-8 p-5 bg-gray-50 dark:bg-surface-800 rounded-2xl">
            <div className="text-center">
              <p className="text-5xl font-black text-gray-900 dark:text-white">{product.rating.toFixed(1)}</p>
              <div className="flex justify-center gap-0.5 my-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(product.rating) ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-sm text-gray-500">{product.reviewCount} reviews</p>
            </div>
          </div>

          {/* Reviews list */}
          <div className="space-y-5 mb-8">
            {reviews.map((review) => (
              <div key={review.id} className="p-5 bg-white dark:bg-surface-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {review.user.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{review.user.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                {review.title && (
                  <p className="font-semibold text-sm text-gray-900 dark:text-white mt-3">{review.title}</p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">{review.comment}</p>
                {review.isVerified && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-600">
                    <CheckCircle className="w-3 h-3" /> Verified Purchase
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Write review */}
          {isAuthenticated && (
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t(language, 'writeReview')}</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: s }))}
                      >
                        <Star className={`w-7 h-7 transition-colors ${s <= reviewForm.rating ? 'text-amber-400 fill-current' : 'text-gray-300 hover:text-amber-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title (Optional)</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Summarize your review"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Review</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                    placeholder="Share your experience with this product..."
                    rows={4}
                    required
                    className="input resize-none"
                  />
                </div>
                <button type="submit" disabled={submittingReview} className="btn-primary text-sm">
                  {submittingReview ? t(language, 'submitting') : t(language, 'submitReview')}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Sticky add-to-cart — mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-surface-950/95 backdrop-blur-md px-3 py-3 safe-bottom">
        <div className="flex items-center gap-2 max-w-7xl mx-auto">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums leading-tight">
              {formatPrice(calculatedPrice)}
            </p>
            {product.stock > 0 && product.stock <= 10 && (
              <p className="text-[11px] text-orange-500 truncate">{t(language, 'onlyLeft').replace('{count}', String(product.stock))}</p>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={cartLoading || product.stock === 0}
            className="btn-primary flex-1 max-w-[11rem] py-2.5 text-sm shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartLoading ? t(language, 'adding') : t(language, 'addToCart')}
          </button>
          <button
            onClick={handleWishlist}
            type="button"
            className={`w-10 h-10 shrink-0 flex items-center justify-center border rounded-xl ${
              isWishlisted
                ? 'border-red-500 bg-red-50 text-red-500'
                : 'border-gray-200 dark:border-gray-700 text-gray-500'
            }`}
            aria-label={t(language, 'wishlist')}
          >
            <Heart className="w-4.5 h-4.5" fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleShare}
            type="button"
            className="w-10 h-10 shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600 rounded-xl"
            aria-label="Share"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-12 sm:mt-16">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-5 sm:mb-6">Related Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Share Modal Dialog */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-surface-900 p-6 shadow-2xl border border-slate-100 dark:border-surface-800"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-surface-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isKhmer ? 'ចែករំលែកទំនិញ' : 'Share Product'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 text-slate-500 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* 1-Click Social Shares */}
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`${product.name} - ${formatPrice(calculatedPrice)} on SH-Shop`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold transition shadow-sm"
                  >
                    <TelegramIcon className="w-4 h-4" />
                    <span>Telegram</span>
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold transition shadow-sm"
                  >
                    <Facebook className="w-4 h-4" />
                    <span>Facebook</span>
                  </a>
                </div>

                {/* Copy Link Input */}
                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    {isKhmer ? 'តំណភ្ជាប់ទំនិញ' : 'Product URL'}
                  </p>
                  <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-700">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? window.location.href : ''}
                      className="flex-1 bg-transparent px-2.5 text-xs text-slate-700 dark:text-slate-300 truncate focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="py-2 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>{isKhmer ? 'បានចម្លង!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isKhmer ? 'ចម្លង Link' : 'Copy Link'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
