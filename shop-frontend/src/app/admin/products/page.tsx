'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Eye, Upload, Loader2, X, Package } from 'lucide-react';
import { Product, Category } from '@/types';
import { productApi, adminApi, uploadApi } from '@/lib/api';
import { formatPrice, normalizeImageListToFullUrls, resolveToFullImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';

export default function AdminProductsPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const modalLabelCls = `block mb-1.5 text-slate-600 dark:text-slate-300 ${
    isKhmer ? 'text-[13px] font-medium' : 'text-[11px] font-semibold uppercase tracking-[0.06em]'
  }`;
  const modalInputCls = 'input text-sm min-h-[44px]';
  const modalGridCls = 'grid sm:grid-cols-2 gap-4 sm:gap-5';
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_products');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_categories');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_products');
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
    }
    return true;
  });
  const [isFetching, setIsFetching] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'featured' | 'low_stock' | 'out_of_stock' | 'active' | 'inactive'>('all');
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const [isRestocking, setIsRestocking] = useState(false);

  useEffect(() => {
    // Only show full skeleton loader if we have no products displayed at all
    if (products.length === 0) {
      setLoading(true);
    } else {
      setIsFetching(true);
    }

    const params: Record<string, unknown> = {
      limit: 100,
      search: search.trim() || undefined,
    };
    if (filterMode === 'featured') params.featured = 'true';
    if (filterMode === 'active') params.active = 'true';
    if (filterMode === 'inactive') params.active = 'false';

    Promise.all([adminApi.getProducts(params), adminApi.getCategories()])
      .then(([prodRes, catRes]) => {
        let list: Product[] = prodRes.data.data || [];
        if (filterMode === 'low_stock') {
          list = list.filter((p) => p.stock > 0 && p.stock <= 5);
        } else if (filterMode === 'out_of_stock') {
          list = list.filter((p) => p.stock <= 0);
        }
        setProducts(list);
        const cats = catRes.data.data || [];
        setCategories(cats);

        if (!search.trim() && filterMode === 'all') {
          try {
            sessionStorage.setItem('admin_cached_products', JSON.stringify(list));
            sessionStorage.setItem('admin_cached_categories', JSON.stringify(cats));
          } catch {}
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setIsFetching(false);
      });
  }, [search, filterMode]);

  const openRestock = (product: Product) => {
    setRestockingProduct(product);
    setRestockAmount(product.stock);
  };

  const handleQuickRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingProduct) return;
    setIsRestocking(true);
    try {
      await productApi.update(restockingProduct.id, {
        stock: Math.max(0, Number(restockAmount)),
      });
      toast.success(isKhmer ? `បានធ្វើបច្ចុប្បន្នភាពស្តុក (${restockAmount})` : `Stock updated to ${restockAmount}`);
      setProducts((prev) =>
        prev.map((p) => (p.id === restockingProduct.id ? { ...p, stock: Math.max(0, Number(restockAmount)) } : p))
      );
      setRestockingProduct(null);
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការកែប្រែស្តុក' : 'Failed to update stock');
    } finally {
      setIsRestocking(false);
    }
  };
  const [form, setForm] = useState({
    name: '', description: '', price: '', comparePrice: '', stock: '',
    categoryId: '', brand: '', thumbnail: '', isFeatured: false, isActive: true,
    tags: '', shortDesc: '', imagesStr: '',
    variants: [] as { id?: string; name: string; value: string; stock: string; price: string }[],
  });
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const thumbPreviewUrl = useMemo(
    () => (form.thumbnail.trim() ? resolveToFullImageUrl(form.thumbnail.trim()) : ''),
    [form.thumbnail]
  );

  const galleryPreviewUrls = useMemo(
    () => normalizeImageListToFullUrls(form.imagesStr),
    [form.imagesStr]
  );

  const handleThumbnailFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadBusy(true);
    try {
      const { data } = await uploadApi.uploadProductImage(file, 'products');
      setForm((p) => ({ ...p, thumbnail: data.data.url }));
      toast.success('រូបតូចបានផ្ទុករួច / Thumbnail uploaded');
    } catch {
      toast.error('ផ្ទុករូបភាពបរាជ័យ / Upload failed');
    } finally {
      setUploadBusy(false);
    }
  };

  const handleGalleryFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;
    setUploadBusy(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const { data } = await uploadApi.uploadProductImage(file, 'products');
        urls.push(data.data.url);
      }
      setForm((p) => ({
        ...p,
        imagesStr: p.imagesStr ? `${p.imagesStr}, ${urls.join(', ')}` : urls.join(', '),
      }));
      toast.success(
        urls.length === 1
          ? 'រូបបានបន្ថែម / Image added'
          : `${urls.length} រូបបានបន្ថែម / images added`
      );
    } catch {
      toast.error('ផ្ទុករូបភាពបរាជ័យ / Upload failed');
    } finally {
      setUploadBusy(false);
    }
  };


  const openCreate = () => {
    setEditingProduct(null);
    setForm({
      name: '', description: '', price: '', comparePrice: '', stock: '', categoryId: '', brand: '', thumbnail: '', isFeatured: false, isActive: true, tags: '', shortDesc: '', imagesStr: '', variants: [],
    });
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name, description: product.description, price: String(product.price),
      comparePrice: String(product.comparePrice || ''), stock: String(product.stock),
      categoryId: product.categoryId, brand: product.brand || '', thumbnail: product.thumbnail || '',
      isFeatured: product.isFeatured, isActive: product.isActive,
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      shortDesc: product.shortDesc || '',
      imagesStr: product.images?.join(', ') || '',
      variants: product.variants?.map(v => ({ id: v.id, name: v.name, value: v.value, stock: String(v.stock), price: v.price ? String(v.price) : '' })) || [],
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name: form.name,
        description: form.description,
        shortDesc: form.shortDesc || undefined,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        stock: Number(form.stock),
        categoryId: form.categoryId,
        brand: form.brand || undefined,
        thumbnail: form.thumbnail.trim() ? resolveToFullImageUrl(form.thumbnail.trim()) : undefined,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        images: normalizeImageListToFullUrls(form.imagesStr),
        variants: form.variants.map((v) => ({
          name: v.name,
          value: v.value,
          stock: Number(v.stock) || 0,
          price: v.price ? Number(v.price) : undefined,
        })),
      };

      if (editingProduct) {
        await productApi.update(editingProduct.id, data);
        toast.success('Product updated');
      } else {
        await productApi.create(data);
        toast.success('Product created');
      }

      setShowModal(false);
      const res = await adminApi.getProducts({ limit: 100 });
      setProducts(res.data.data || []);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await productApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const totalCount = products.length;
  const activeCount = products.filter((p) => p.isActive).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const featuredCount = products.filter((p) => p.isFeatured).length;

  return (
    <div
      className="space-y-6"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`flex flex-col p-4 rounded-2xl border transition-all text-left ${
            filterMode === 'all'
              ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-500/40 shadow-sm ring-1 ring-primary-500/20'
              : 'bg-white/80 dark:bg-surface-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isKhmer ? 'ទំនិញសរុប' : 'Total Catalog'}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</span>
            <span className="text-xs text-slate-400">{isKhmer ? 'មុខ' : 'items'}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('active')}
          className={`flex flex-col p-4 rounded-2xl border transition-all text-left ${
            filterMode === 'active'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
              : 'bg-white/80 dark:bg-surface-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {isKhmer ? 'កំពុងលក់ (Active)' : 'Active Selling'}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{activeCount}</span>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('low_stock')}
          className={`flex flex-col p-4 rounded-2xl border transition-all text-left ${
            filterMode === 'low_stock'
              ? 'bg-amber-500/15 dark:bg-amber-950/50 border-amber-500/50 shadow-sm ring-2 ring-amber-500/30'
              : 'bg-white/80 dark:bg-surface-900/80 border-slate-200/80 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span>⚠️</span>
            <span>{isKhmer ? 'សល់ស្តុកតិច (≤5)' : 'Low Stock (≤5)'}</span>
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{lowStockCount}</span>
            {lowStockCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                {isKhmer ? 'ប្រញាប់' : 'Urgent'}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('out_of_stock')}
          className={`flex flex-col p-4 rounded-2xl border transition-all text-left ${
            filterMode === 'out_of_stock'
              ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-500/50 shadow-sm ring-2 ring-rose-500/30'
              : 'bg-white/80 dark:bg-surface-900/80 border-slate-200/80 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <span>🔴</span>
            <span>{isKhmer ? 'អស់ស្តុក (0)' : 'Out of Stock'}</span>
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-700 dark:text-rose-300">{outOfStockCount}</span>
            {outOfStockCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300">
                {isKhmer ? 'ដាច់ស្តុក' : 'Restock'}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('featured')}
          className={`flex flex-col p-4 rounded-2xl border transition-all text-left col-span-2 sm:col-span-1 ${
            filterMode === 'featured'
              ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500/40 shadow-sm ring-1 ring-purple-500/20'
              : 'bg-white/80 dark:bg-surface-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <span>⭐</span>
            <span>{isKhmer ? 'ទំនិញលេចធ្លោ' : 'Featured'}</span>
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-purple-700 dark:text-purple-300">{featuredCount}</span>
            <span className="text-xs text-slate-400">{isKhmer ? 'មុខ' : 'items'}</span>
          </div>
        </button>
      </div>

      {/* Main Controls Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-surface-900/95 shadow-sm p-4 sm:p-5 backdrop-blur-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          {/* Search bar with instant clear */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកតាមឈ្មោះ, Brand, Category...' : 'Search products by name, brand, category...'}
              className="input pl-10 pr-9 text-sm w-full h-11 rounded-2xl bg-slate-50 dark:bg-surface-800/80 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-surface-800"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white font-semibold text-sm shadow-md shadow-primary-500/25 transition-all duration-200 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isKhmer ? 'បន្ថែមទំនិញថ្មី' : 'Add New Product'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 mr-1.5">{isKhmer ? 'តម្រង៖' : 'Filter:'}</span>
          {(['all', 'featured', 'low_stock', 'out_of_stock', 'active', 'inactive'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all duration-150 ${
                filterMode === mode
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100/80 dark:bg-surface-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-surface-700'
              }`}
            >
              {mode === 'all' ? (isKhmer ? `ទាំងអស់ (${totalCount})` : `All (${totalCount})`) :
               mode === 'featured' ? `⭐ Featured (${featuredCount})` :
               mode === 'low_stock' ? `⚠️ ${isKhmer ? 'សល់ស្តុកតិច' : 'Low Stock'} (${lowStockCount})` :
               mode === 'out_of_stock' ? `🔴 ${isKhmer ? 'អស់ស្តុក' : 'Out of Stock'} (${outOfStockCount})` :
               mode === 'active' ? (isKhmer ? `សកម្ម (${activeCount})` : `Active (${activeCount})`) :
               (isKhmer ? `អសកម្ម (${totalCount - activeCount})` : `Inactive (${totalCount - activeCount})`)}
            </button>
          ))}
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-surface-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-slate-200/70 dark:border-gray-700/70"
          >
            <div className="p-6">
              <h2 className={`text-gray-900 dark:text-white mb-5 ${isKhmer ? 'text-[24px] font-bold' : 'text-xl font-extrabold tracking-tight'}`}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <form onSubmit={handleSave} className="space-y-5">
                <div className={modalGridCls}>
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Product Name *</label>
                    <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className={modalInputCls} placeholder="iPhone 16 Pro Max" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Short Description</label>
                    <input value={form.shortDesc} onChange={(e) => setForm((p) => ({ ...p, shortDesc: e.target.value }))} className={modalInputCls} placeholder="A18 Pro chip, 48MP Camera" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Full Description *</label>
                    <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required rows={3} className="input text-sm resize-none min-h-[96px]" />
                  </div>
                  <div>
                    <label className={modalLabelCls}>Price *</label>
                    <input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required className={modalInputCls} placeholder="99.99" />
                  </div>
                  <div>
                    <label className={modalLabelCls}>Compare At Price</label>
                    <input type="number" value={form.comparePrice} onChange={(e) => setForm((p) => ({ ...p, comparePrice: e.target.value }))} className={modalInputCls} placeholder="129.99" />
                  </div>
                  <div>
                    <label className={modalLabelCls}>Stock *</label>
                    <input type="number" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} required className={modalInputCls} placeholder="100" />
                  </div>
                  <div>
                    <label className={modalLabelCls}>Category *</label>
                    <select value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))} required className={modalInputCls}>
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parent ? `${c.parent.name} › ${c.name}` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={modalLabelCls}>Brand</label>
                    <input value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} className={modalInputCls} placeholder="Apple" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Thumbnail</label>
                    <p className="text-xs text-gray-500 mb-2">
                      ជ្រើសរើសរូបពីទូរស័ព្ទ ឬកុំព្យូទ័រ — ឬវាយ URL / Choose a photo or paste a link below
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <label className="btn-secondary text-sm cursor-pointer inline-flex items-center gap-2">
                        {uploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>ផ្ទុករូប / Upload</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleThumbnailFile}
                          disabled={uploadBusy}
                        />
                      </label>
                    </div>
                    <input
                      value={form.thumbnail}
                      onChange={(e) => setForm((p) => ({ ...p, thumbnail: e.target.value }))}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v) return;
                        setForm((p) => ({ ...p, thumbnail: resolveToFullImageUrl(v) }));
                      }}
                      className={modalInputCls}
                      placeholder="https://... or /uploads/... (បំពេញជា full URL / saved as full URL)"
                    />
                    {thumbPreviewUrl ? (
                      <div className="relative w-full max-h-64 min-h-[120px] mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/40 flex items-center justify-center p-2">
                        <Image
                          src={thumbPreviewUrl}
                          alt=""
                          width={960}
                          height={540}
                          className="w-full h-auto max-h-64 object-contain"
                          unoptimized
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Gallery images</label>
                    <p className="text-xs text-gray-500 mb-2">
                      ជ្រើសរើសរូបច្រើនពីឧបករណ៍ — ឬកែ URL ខាងក្រោម / Picker supports multiple photos; URLs still work
                    </p>
                    <label className="btn-secondary text-sm cursor-pointer inline-flex items-center gap-2 mb-2">
                      {uploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>បន្ថែមរូបពពួកគ្នា / Add photos</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryFiles}
                        disabled={uploadBusy}
                      />
                    </label>
                    <textarea
                      value={form.imagesStr}
                      onChange={(e) => setForm((p) => ({ ...p, imagesStr: e.target.value }))}
                      onBlur={(e) => {
                        const v = e.target.value;
                        const list = normalizeImageListToFullUrls(v);
                        setForm((p) => ({ ...p, imagesStr: list.join(', ') }));
                      }}
                      className="input text-sm resize-y min-h-[90px]"
                      placeholder="https://... or /uploads/... (full URL on save / blur)"
                    />
                    {galleryPreviewUrls.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {galleryPreviewUrls.map((url, i) => (
                          <div
                            key={`${url}-${i}`}
                            className="relative w-[88px] h-[88px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 shrink-0"
                          >
                            <Image src={url} alt="" fill className="object-cover" unoptimized sizes="88px" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2 border-t dark:border-gray-800 pt-4 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className={modalLabelCls}>Product Variants</label>
                      <button type="button" onClick={() => setForm(p => ({ ...p, variants: [...p.variants, { name: 'Color', value: '', stock: '0', price: '' }] }))} className="btn-secondary text-xs px-2 py-1">
                        + Add Variant
                      </button>
                    </div>
                    {form.variants.map((v, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center mb-3">
                        <input value={v.name} onChange={e => { const nv = [...form.variants]; nv[i].name = e.target.value; setForm(p => ({ ...p, variants: nv })) }} placeholder="Type (e.g. Color)" className="input text-sm min-h-[42px] col-span-12 sm:col-span-3" />
                        <input value={v.value} onChange={e => { const nv = [...form.variants]; nv[i].value = e.target.value; setForm(p => ({ ...p, variants: nv })) }} placeholder="Value (e.g. Red)" className="input text-sm min-h-[42px] col-span-12 sm:col-span-3" />
                        <input type="number" value={v.stock} onChange={e => { const nv = [...form.variants]; nv[i].stock = e.target.value; setForm(p => ({ ...p, variants: nv })) }} placeholder="Stock" className="input text-sm min-h-[42px] col-span-6 sm:col-span-2" />
                        <input type="number" value={v.price} onChange={e => { const nv = [...form.variants]; nv[i].price = e.target.value; setForm(p => ({ ...p, variants: nv })) }} placeholder="Price offset (Opt.)" className="input text-sm min-h-[42px] col-span-6 sm:col-span-3" />
                        <button type="button" onClick={() => setForm(p => ({ ...p, variants: p.variants.filter((_, index) => index !== i) }))} className="text-red-500 hover:text-red-700 col-span-12 sm:col-span-1 sm:justify-self-end">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Tags (comma separated)</label>
                    <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className={modalInputCls} placeholder="apple, iphone, smartphone" />
                  </div>
                  <div className="flex flex-wrap items-center gap-6 sm:col-span-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium dark:text-gray-300">Featured (home &amp; “featured” listings)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium dark:text-gray-300">Active (visible in store)</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 min-h-[44px]">{isKhmer ? 'បោះបង់' : 'Cancel'}</button>
                  <button type="submit" disabled={saving || uploadBusy} className="btn-primary flex-1 min-h-[44px]">
                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Restock Modal */}
      {restockingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-surface-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-surface-750"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {isKhmer ? 'គ្រប់គ្រង & បំពេញស្តុកទំនិញ' : 'Manage & Restock Product'}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-1">{restockingProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setRestockingProduct(null)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-surface-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {isKhmer ? 'ចំនួនស្តុកសរុបថ្មី' : 'New Total Stock'}:
                </label>
                <input
                  type="number"
                  min={0}
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="input text-lg font-mono font-bold text-center w-full"
                  required
                  autoFocus
                />
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2">{isKhmer ? 'ប៊ូតុងបន្ថែមលឿន (Quick Add)' : 'Quick Add'}:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setRestockAmount((prev) => prev + qty)}
                      className="py-1.5 px-2 bg-gray-100 hover:bg-primary-50 dark:bg-surface-800 dark:hover:bg-primary-950/40 hover:text-primary-600 rounded-xl text-xs font-bold font-mono transition border border-transparent hover:border-primary-300"
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockingProduct(null)}
                  className="btn-secondary flex-1 text-xs"
                >
                  {isKhmer ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="btn-primary flex-1 text-xs"
                >
                  {isRestocking ? (isKhmer ? 'កំពុងរក្សាទុក...' : 'Updating...') : (isKhmer ? 'រក្សាទុកស្តុក' : 'Save Stock')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
