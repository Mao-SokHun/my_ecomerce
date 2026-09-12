'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Upload,
  Loader2,
  X,
  Package,
  Star,
  CheckCircle2,
  ArrowRight,
  Minus,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Boxes,
  Layers,
  Tag,
  DollarSign,
  Check,
} from 'lucide-react';
import { Product, Category } from '@/types';
import { productApi, adminApi, uploadApi } from '@/lib/api';
import { formatPrice, normalizeImageListToFullUrls, resolveToFullImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';
import { useRealtime } from '@/providers/RealtimeProvider';

export default function AdminProductsPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const modalLabelCls = `block mb-1.5 text-slate-600 dark:text-slate-300 ${isKhmer ? 'text-[13px] font-medium' : 'text-[11px] font-semibold uppercase tracking-[0.06em]'
    }`;
  const modalInputCls = 'input text-sm min-h-[44px]';
  const modalGridCls = 'grid sm:grid-cols-2 gap-4 sm:gap-5';

  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_products');
        if (cached) return JSON.parse(cached);
      } catch { }
    }
    return [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_categories');
        if (cached) return JSON.parse(cached);
      } catch { }
    }
    return [];
  });
  const hasCachedData = typeof window !== 'undefined' && (() => {
    try {
      const cached = sessionStorage.getItem('admin_cached_products');
      return !!(cached && JSON.parse(cached).length > 0);
    } catch { return false; }
  })();
  const [loading, setLoading] = useState(!hasCachedData);
  const [isFetching, setIsFetching] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'featured' | 'low_stock' | 'out_of_stock' | 'active' | 'inactive'>('all');

  // Quick Restock State
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [restockMode, setRestockMode] = useState<'add' | 'set' | 'deduct'>('add');
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockCostPrice, setRestockCostPrice] = useState<string>('');
  const [restockReason, setRestockReason] = useState<string>('shipment');
  const [isRestocking, setIsRestocking] = useState(false);

  // Edit/Create Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    stock: '',
    categoryId: '',
    brand: '',
    thumbnail: '',
    isFeatured: false,
    isActive: true,
    tags: '',
    shortDesc: '',
    imagesStr: '',
    variants: [] as { id?: string; name: string; value: string; stock: string; price: string }[],
  });
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  // Read URL filter params on mount (e.g. from low stock notification link)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlFilter = new URLSearchParams(window.location.search).get('filter');
      if (
        urlFilter &&
        ['all', 'featured', 'low_stock', 'out_of_stock', 'active', 'inactive'].includes(urlFilter)
      ) {
        setFilterMode(urlFilter as any);
      }
    }
  }, []);

  // Category lookup map for high performance
  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Computed final stock based on mode and product
  const calculatedStock = useMemo(() => {
    if (!restockingProduct) return { finalStock: 0, diff: 0 };
    const current = Number(restockingProduct.stock) || 0;
    const qty = Math.max(0, Number(restockQty) || 0);

    if (restockMode === 'add') {
      const finalStock = current + qty;
      return { finalStock, diff: qty };
    }
    if (restockMode === 'deduct') {
      const actualDeduct = Math.min(current, qty);
      const finalStock = Math.max(0, current - actualDeduct);
      return { finalStock, diff: -actualDeduct };
    }
    // 'set' mode:
    const finalStock = qty;
    return { finalStock, diff: finalStock - current };
  }, [restockingProduct, restockMode, restockQty]);

  // Listen to Escape key to close Restock modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && restockingProduct) {
        setRestockingProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restockingProduct]);

  useEffect(() => {
    setLoading((prev) => {
      // Only show full loading spinner if we have no data yet
      if (prev) return true;
      return false;
    });
    setIsFetching(true);

    const params: Record<string, unknown> = {
      limit: 150,
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
          } catch { }
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setIsFetching(false);
      });
  }, [search, filterMode]);

  const { socket } = useRealtime();

  // Instant Real-time WebSocket listener for products & stock updates
  useEffect(() => {
    if (!socket) return;

    const handleProductCreated = (newProd: Product) => {
      if (!newProd || !newProd.id) return;
      setProducts((prev) => {
        const exists = prev.some((p) => p.id === newProd.id);
        if (exists) return prev.map((p) => (p.id === newProd.id ? { ...p, ...newProd } : p));
        return [newProd, ...prev];
      });
    };

    const handleProductUpdated = (updatedProd: Product) => {
      if (!updatedProd || !updatedProd.id) return;
      setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? { ...p, ...updatedProd } : p)));
    };

    const handleStockChanged = (data: { productId: string; stock: number }) => {
      if (!data || !data.productId) return;
      setProducts((prev) =>
        prev.map((p) => (p.id === data.productId ? { ...p, stock: data.stock } : p))
      );
    };

    const handleProductDeleted = (data: { id: string }) => {
      if (!data || !data.id) return;
      setProducts((prev) => prev.filter((p) => p.id !== data.id));
    };

    socket.on('PRODUCT_CREATED', handleProductCreated);
    socket.on('PRODUCT_UPDATED', handleProductUpdated);
    socket.on('STOCK_CHANGED', handleStockChanged);
    socket.on('PRODUCT_DELETED', handleProductDeleted);

    return () => {
      socket.off('PRODUCT_CREATED', handleProductCreated);
      socket.off('PRODUCT_UPDATED', handleProductUpdated);
      socket.off('STOCK_CHANGED', handleStockChanged);
      socket.off('PRODUCT_DELETED', handleProductDeleted);
    };
  }, [socket]);

  // Open Quick Restock Modal
  const openRestock = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRestockingProduct(product);
    setRestockMode('add');
    setRestockQty(10);
    setRestockReason('shipment');
    setRestockCostPrice(product.costPrice != null ? String(product.costPrice) : '');
  };

  const handleQuickRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingProduct) return;
    setIsRestocking(true);
    const { finalStock, diff } = calculatedStock;
    try {
      const updatePayload: Record<string, unknown> = {
        stock: Math.max(0, finalStock),
      };
      if (restockCostPrice.trim() !== '') {
        updatePayload.costPrice = Number(restockCostPrice);
      }
      await productApi.update(restockingProduct.id, updatePayload);

      const reasonLabels: Record<string, { km: string; en: string }> = {
        shipment: { km: '📦 នាំចូលថ្មី', en: '📦 New Shipment' },
        audit: { km: '🔍 រាប់ស្តុកឡើងវិញ', en: '🔍 Stock Audit' },
        damaged: { km: '⚠️ ខូចខាត/បាត់បង់', en: '⚠️ Damaged/Loss' },
        return: { km: '🔄 អតិថិជនប្តូរ', en: '🔄 Customer Return' },
      };
      const reasonText = reasonLabels[restockReason]
        ? ` · ${isKhmer ? reasonLabels[restockReason].km : reasonLabels[restockReason].en}`
        : '';

      const diffText = diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : '';

      toast.success(
        isKhmer
          ? `បានកែសម្រួលស្តុក "${restockingProduct.name}" ទៅ ${finalStock} គ្រឿង ${diffText}${reasonText} ✅`
          : `Stock for "${restockingProduct.name}" updated to ${finalStock} ${diffText}${reasonText} ✅`
      );
      setProducts((prev) =>
        prev.map((p) =>
          p.id === restockingProduct.id
            ? {
              ...p,
              stock: Math.max(0, finalStock),
              costPrice: restockCostPrice.trim() !== '' ? Number(restockCostPrice) : p.costPrice,
            }
            : p
        )
      );
      setRestockingProduct(null);
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការកែប្រែស្តុក' : 'Failed to update stock');
    } finally {
      setIsRestocking(false);
    }
  };

  // Toggle Featured directly from Table
  const handleToggleFeatured = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !product.isFeatured;
    // Optimistic UI update
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isFeatured: nextVal } : p)));
    try {
      await productApi.update(product.id, { isFeatured: nextVal });
      toast.success(
        nextVal
          ? (isKhmer ? `បានដាក់ "${product.name}" ជា Featured ⭐` : `Marked "${product.name}" as Featured ⭐`)
          : (isKhmer ? `បានដក "${product.name}" ចេញពី Featured` : `Removed "${product.name}" from Featured`)
      );
    } catch {
      // Revert on error
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isFeatured: !nextVal } : p)));
      toast.error('Failed to update featured status');
    }
  };

  // Toggle Active directly from Table
  const handleToggleActive = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !product.isActive;
    // Optimistic UI update
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive: nextVal } : p)));
    try {
      await productApi.update(product.id, { isActive: nextVal });
      toast.success(
        nextVal
          ? (isKhmer ? `បានបើកលក់ "${product.name}" 🟢` : `"${product.name}" is now Active 🟢`)
          : (isKhmer ? `បានបិទលក់ "${product.name}" (Draft) ⚪` : `"${product.name}" is now Inactive (Draft) ⚪`)
      );
    } catch {
      // Revert on error
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive: !nextVal } : p)));
      toast.error('Failed to update active status');
    }
  };

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
      toast.success(isKhmer ? 'រូបតូចបានផ្ទុករួចរាល់' : 'Thumbnail uploaded');
    } catch {
      toast.error(isKhmer ? 'ផ្ទុករូបភាពបរាជ័យ' : 'Upload failed');
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
          ? (isKhmer ? 'រូបភាពបានបន្ថែម' : 'Image added')
          : (isKhmer ? `${urls.length} រូបភាពបានបន្ថែម` : `${urls.length} images added`)
      );
    } catch {
      toast.error(isKhmer ? 'ផ្ទុករូបភាពបរាជ័យ' : 'Upload failed');
    } finally {
      setUploadBusy(false);
    }
  };

  const openCreate = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      description: '',
      price: '',
      comparePrice: '',
      costPrice: '',
      stock: '',
      categoryId: '',
      brand: '',
      thumbnail: '',
      isFeatured: false,
      isActive: true,
      tags: '',
      shortDesc: '',
      imagesStr: '',
      variants: [],
    });
    setShowModal(true);
  };

  const openEdit = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      comparePrice: String(product.comparePrice || ''),
      costPrice: String(product.costPrice != null ? product.costPrice : ''),
      stock: String(product.stock),
      categoryId: product.categoryId,
      brand: product.brand || '',
      thumbnail: product.thumbnail || '',
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      shortDesc: product.shortDesc || '',
      imagesStr: product.images?.join(', ') || '',
      variants:
        product.variants?.map((v) => ({
          id: v.id,
          name: v.name,
          value: v.value,
          stock: String(v.stock),
          price: v.price ? String(v.price) : '',
        })) || [],
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
        costPrice: form.costPrice !== '' ? Number(form.costPrice) : undefined,
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
        toast.success(isKhmer ? 'បានកែប្រែទំនិញជោគជ័យ' : 'Product updated');
      } else {
        await productApi.create(data);
        toast.success(isKhmer ? 'បានបន្ថែមទំនិញថ្មីជោគជ័យ' : 'Product created');
      }

      setShowModal(false);
      const res = await adminApi.getProducts({ limit: 150 });
      setProducts(res.data.data || []);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm(isKhmer ? `តើអ្នកពិតជាចង់លុបទំនិញ "${name}" មែនទេ?` : `Delete "${name}"?`)) return;
    try {
      await productApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success(isKhmer ? 'បានលុបទំនិញជោគជ័យ' : 'Product deleted');
    } catch {
      toast.error(isKhmer ? 'បរាជ័យក្នុងការលុប' : 'Failed to delete');
    }
  };

  // Filtered Products by search & category
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    return list;
  }, [products, selectedCategory]);

  const totalCount = products.length;
  const activeCount = products.filter((p) => p.isActive).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const featuredCount = products.filter((p) => p.isFeatured).length;

  const totalStockUnits = useMemo(() => products.reduce((acc, p) => acc + (p.stock || 0), 0), [products]);
  const totalCostValue = useMemo(
    () => products.reduce((acc, p) => acc + (p.stock || 0) * (p.costPrice || 0), 0),
    [products]
  );
  const totalRetailValue = useMemo(
    () => products.reduce((acc, p) => acc + (p.stock || 0) * (p.price || 0), 0),
    [products]
  );
  const totalEstimatedProfit = useMemo(() => Math.max(0, totalRetailValue - totalCostValue), [totalRetailValue, totalCostValue]);

  // Category Dropdown options (clean & compact)
  const categoryOptions: DropdownOption[] = useMemo(() => [
    { value: 'all', label: isKhmer ? 'គ្រប់ប្រភេទទាំងអស់' : 'All Categories' },
    ...categories.map((c) => ({
      value: c.id,
      label: c.parent ? `${c.parent.name} › ${c.name}` : c.name,
    })),
  ], [categories, isKhmer]);

  return (
    <div
      className="space-y-4"
      style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}
    >
      {/* ========================================================================= */}
      {/* KPI STATS CARDS (COMPACT & SLEEK) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* 1. Total Catalog */}
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`group relative p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 overflow-hidden hover:-translate-y-0.5 shadow-2xs ${filterMode === 'all'
              ? 'bg-gradient-to-br from-indigo-50/90 to-white dark:from-indigo-950/40 dark:to-surface-900 border-indigo-500/50 shadow-sm ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-750 hover:border-indigo-300 dark:hover:border-indigo-800'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isKhmer ? 'ទំនិញសរុប' : 'Total Catalog'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/40">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {totalCount}
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-300">
              {isKhmer ? 'មុខ' : 'items'}
            </span>
          </div>
        </button>

        {/* 2. Active Selling */}
        <button
          type="button"
          onClick={() => setFilterMode('active')}
          className={`group relative p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 overflow-hidden hover:-translate-y-0.5 shadow-2xs ${filterMode === 'active'
              ? 'bg-gradient-to-br from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-surface-900 border-emerald-500/50 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-750 hover:border-emerald-300 dark:hover:border-emerald-800'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isKhmer ? 'កំពុងលក់' : 'Active'}</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {activeCount}
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              {isKhmer ? 'សកម្ម' : 'live'}
            </span>
          </div>
        </button>

        {/* 3. Low Stock */}
        <button
          type="button"
          onClick={() => setFilterMode('low_stock')}
          className={`group relative p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 overflow-hidden hover:-translate-y-0.5 shadow-2xs ${filterMode === 'low_stock'
              ? 'bg-gradient-to-br from-amber-50/90 to-white dark:from-amber-950/40 dark:to-surface-900 border-amber-500/50 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-750 hover:border-amber-300 dark:hover:border-amber-800'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {isKhmer ? 'សល់ស្តុកតិច' : 'Low Stock'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {lowStockCount}
            </span>
            <span className={`text-[11px] font-semibold px-1.5 py-0.2 rounded-md ${lowStockCount > 0
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse'
                : 'bg-slate-100 dark:bg-surface-800 text-slate-500'
              }`}>
              {lowStockCount > 0 ? (isKhmer ? 'ប្រញាប់' : 'urgent') : (isKhmer ? 'ល្អ' : 'ok')}
            </span>
          </div>
        </button>

        {/* 4. Out of Stock */}
        <button
          type="button"
          onClick={() => setFilterMode('out_of_stock')}
          className={`group relative p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 overflow-hidden hover:-translate-y-0.5 shadow-2xs ${filterMode === 'out_of_stock'
              ? 'bg-gradient-to-br from-rose-50/90 to-white dark:from-rose-950/40 dark:to-surface-900 border-rose-500/50 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-750 hover:border-rose-300 dark:hover:border-rose-800'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              {isKhmer ? 'អស់ស្តុក (0)' : 'Out of Stock'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
              {outOfStockCount}
            </span>
            <span className={`text-[11px] font-semibold px-1.5 py-0.2 rounded-md ${outOfStockCount > 0
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                : 'bg-slate-100 dark:bg-surface-800 text-slate-500'
              }`}>
              {outOfStockCount > 0 ? (isKhmer ? 'ដាច់ស្តុក' : 'restock') : '0'}
            </span>
          </div>
        </button>

        {/* 5. Featured Products */}
        <button
          type="button"
          onClick={() => setFilterMode('featured')}
          className={`group relative p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left col-span-2 sm:col-span-1 transition-all duration-200 overflow-hidden hover:-translate-y-0.5 shadow-2xs ${filterMode === 'featured'
              ? 'bg-gradient-to-br from-purple-50/90 to-white dark:from-purple-950/40 dark:to-surface-900 border-purple-500/50 shadow-sm ring-2 ring-purple-500/20'
              : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-750 hover:border-purple-300 dark:hover:border-purple-800'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              {isKhmer ? 'ទំនិញលេចធ្លោ' : 'Featured'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/40">
              <Star className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums tracking-tight">
              {featuredCount}
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-md bg-purple-100/70 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
              {isKhmer ? 'លើ Home' : 'on home'}
            </span>
          </div>
        </button>
      </div>

      {/* Financial & Inventory Valuation Accounting Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-indigo-950/95 text-white shadow-sm border border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">
              {isKhmer ? 'ដើមទុនក្នុងស្តុកសរុប (Inventory Cost)' : 'Total Inventory Cost'}
            </p>
            <p className="text-base sm:text-lg font-black font-mono text-amber-300">
              {formatPrice(totalCostValue, language)}
              <span className="text-xs font-normal text-slate-400 ml-1.5">({totalStockUnits} {isKhmer ? 'គ្រឿង' : 'units'})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">
              {isKhmer ? 'ចំណូលលក់ប៉ាន់ស្មាន (Retail Valuation)' : 'Estimated Retail Value'}
            </p>
            <p className="text-base sm:text-lg font-black font-mono text-sky-300">
              {formatPrice(totalRetailValue, language)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">
              {isKhmer ? 'ប្រាក់ចំណេញប៉ាន់ស្មាន (Est. Gross Profit)' : 'Estimated Gross Profit'}
            </p>
            <p className="text-base sm:text-lg font-black font-mono text-emerald-400">
              +{formatPrice(totalEstimatedProfit, language)}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN SEARCH & FILTERS TOOLBAR (COMPACT & SLEEK) */}
      {/* ========================================================================= */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-surface-750 bg-white dark:bg-surface-900 shadow-2xs p-3 sm:p-3.5 space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកតាមឈ្មោះ, Brand, Category...' : 'Search products by name, brand, category...'}
              style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
              className="w-full h-10 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition shadow-inner"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-surface-700 transition z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Category Dropdown & Add Product Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {categories.length > 0 && (
              <CustomDropdown
                size="md"
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={categoryOptions}
                icon={<Layers className="w-4 h-4 text-primary-500 shrink-0" />}
                className="w-auto min-w-[170px] sm:min-w-[210px]"
                buttonClassName="bg-slate-50 dark:bg-surface-800 border-slate-200 dark:border-surface-700 hover:border-primary-400 font-semibold text-slate-800 dark:text-slate-100 shadow-inner"
              />
            )}

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 h-10 rounded-xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white font-bold text-xs sm:text-sm shadow-sm shadow-primary-500/25 transition-all duration-200 active:scale-95 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isKhmer ? 'បន្ថែមទំនិញថ្មី' : 'Add Product'}</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Total Count Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-surface-800">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>{isKhmer ? 'តម្រង៖' : 'Filter:'}</span>
            </span>
            {(['all', 'featured', 'low_stock', 'out_of_stock', 'active', 'inactive'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 flex items-center gap-1.5 ${filterMode === mode
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs ring-1 ring-slate-900/10'
                    : 'bg-slate-100/80 dark:bg-surface-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-surface-700'
                  }`}
              >
                <span>
                  {mode === 'all'
                    ? isKhmer ? 'ទាំងអស់' : 'All'
                    : mode === 'featured'
                      ? '⭐ Featured'
                      : mode === 'low_stock'
                        ? `⚠️ ${isKhmer ? 'សល់ស្តុកតិច' : 'Low Stock'}`
                        : mode === 'out_of_stock'
                          ? `🔴 ${isKhmer ? 'អស់ស្តុក' : 'Out of Stock'}`
                          : mode === 'active'
                            ? isKhmer ? 'សកម្ម' : 'Active'
                            : isKhmer ? 'អសកម្ម' : 'Inactive'}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${filterMode === mode
                    ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                    : 'bg-slate-200 dark:bg-surface-700 text-slate-600 dark:text-slate-300'
                  }`}>
                  {mode === 'all'
                    ? totalCount
                    : mode === 'featured'
                      ? featuredCount
                      : mode === 'low_stock'
                        ? lowStockCount
                        : mode === 'out_of_stock'
                          ? outOfStockCount
                          : mode === 'active'
                            ? activeCount
                            : totalCount - activeCount}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            {isKhmer
              ? `បង្ហាញ ${filteredProducts.length} នៃ ${totalCount} មុខ`
              : `Showing ${filteredProducts.length} of ${totalCount} items`}
          </div>
        </div>
      </div>

      {/* Luxury Product Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-surface-900/95 shadow-sm overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500 animate-pulse">
              {isKhmer ? 'កំពុងផ្ទុកបញ្ជីទំនិញ...' : 'Loading products catalog...'}
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-surface-800 flex items-center justify-center mx-auto text-slate-400">
              <Package className="w-6 h-6 stroke-1" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {isKhmer ? 'រកមិនឃើញទំនិញឡើយ' : 'No products found'}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isKhmer
                ? 'សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬចុច "បន្ថែមទំនិញថ្មី" ដើម្បីបង្កើតទំនិញដំបូង'
                : 'Try adjusting your search or filters, or add a new product to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-surface-850/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="py-2.5 px-3 sm:px-4">{isKhmer ? 'ទំនិញ' : 'Product'}</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">{isKhmer ? 'ប្រភេទ' : 'Category'}</th>
                  <th className="py-2.5 px-3">{isKhmer ? 'តម្លៃ' : 'Price'}</th>
                  <th className="py-2.5 px-3">{isKhmer ? 'ស្តុក' : 'Stock'}</th>
                  <th className="py-2.5 px-3 text-center">{isKhmer ? 'Featured (Home)' : 'Featured'}</th>
                  <th className="py-2.5 px-3 text-center">{isKhmer ? 'ស្ថានភាព' : 'Status'}</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">{isKhmer ? 'សកម្មភាព' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs sm:text-sm">
                {filteredProducts.map((product) => {
                  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
                  const isLow = product.stock > 0 && product.stock <= 5;
                  const isOut = product.stock <= 0;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-surface-850/50 transition-colors group"
                    >
                      {/* Product Name & Thumbnail */}
                      <td className="py-2.5 px-3 sm:px-4">
                        <div className="flex items-center gap-2.5">
                          <Link
                            href={`/products/${product.slug || product.id}`}
                            target="_blank"
                            className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-surface-800 shrink-0 border border-slate-200/80 dark:border-slate-700/80 group-hover:shadow-sm transition-shadow block"
                            title={isKhmer ? 'មើលលើហាងផ្ទាល់' : 'View on Store'}
                          >
                            {product.thumbnail ? (
                              <Image
                                src={product.thumbnail}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                sizes="40px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                            <Link
                              href={`/products/${product.slug || product.id}`}
                              target="_blank"
                              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block transition-colors"
                            >
                              {product.name}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {product.brand && (
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  {product.brand}
                                </span>
                              )}
                              {product.category && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate md:hidden">
                                  • {product.category.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 hidden md:table-cell">
                        {product.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            {product.category.name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Clean Elegant Selling Price */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums tracking-tight">
                              {formatPrice(product.price, language)}
                            </span>
                            {hasDiscount && (
                              <span className="text-[10px] text-slate-400 line-through tabular-nums">
                                {formatPrice(product.comparePrice || 0, language)}
                              </span>
                            )}
                          </div>
                          {hasDiscount && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                              -{Math.round((((product.comparePrice || 0) - product.price) / (product.comparePrice || 1)) * 100)}% off
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock & Quick Restock Button */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => openRestock(product, e)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${isOut
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60'
                                : isLow
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 animate-pulse'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
                              }`}
                            title={isKhmer ? 'ចុចដើម្បីកែប្រែ ឬបំពេញស្តុក' : 'Click to adjust or restock inventory'}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                            />
                            <span>{product.stock}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => openRestock(product, e)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60 transition shadow-2xs active:scale-95"
                            title={isKhmer ? 'បំពេញស្តុកលឿន' : 'Quick restock'}
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>{isKhmer ? 'ស្តុក' : 'Stock'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Featured (1-Click Interactive Star Toggle) */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFeatured(product, e)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${product.isFeatured
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80 shadow-2xs hover:bg-amber-100'
                              : 'bg-slate-100/60 dark:bg-surface-800/60 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 border border-transparent hover:border-amber-200'
                            }`}
                          title={
                            product.isFeatured
                              ? (isKhmer ? 'ចុចដើម្បីបិទ Featured' : 'Click to remove from Featured')
                              : (isKhmer ? 'ចុចដើម្បីបើក Featured លើ Homepage' : 'Click to make Featured on Homepage')
                          }
                        >
                          <Star
                            className={`w-3 h-3 transition-transform ${product.isFeatured ? 'text-amber-500 fill-amber-500 scale-110' : 'text-slate-400'
                              }`}
                          />
                          <span>{product.isFeatured ? (isKhmer ? 'Featured' : 'Featured') : isKhmer ? 'ធម្មតា' : 'Normal'}</span>
                        </button>
                      </td>

                      {/* Status (1-Click Interactive Active Toggle) */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleActive(product, e)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${product.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80 shadow-2xs'
                              : 'bg-slate-100 dark:bg-surface-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          title={
                            product.isActive
                              ? (isKhmer ? 'ចុចដើម្បីបិទលក់ (Draft)' : 'Click to set Inactive')
                              : (isKhmer ? 'ចុចដើម្បីបើកលក់ (Active)' : 'Click to set Active')
                          }
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${product.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}
                          />
                          <span>{product.isActive ? (isKhmer ? 'សកម្ម' : 'Active') : isKhmer ? 'អសកម្ម' : 'Draft'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${product.slug || product.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-surface-800 transition"
                            title={isKhmer ? 'មើលលើហាងផ្ទាល់' : 'View on Store'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => openEdit(product, e)}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-surface-800 transition"
                            title={isKhmer ? 'កែប្រែ' : 'Edit'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(product.id, product.name, e)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title={isKhmer ? 'លុប' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hyper-Luxury Quick Restock Modal */}
      <AnimatePresence>
        {restockingProduct && (
          <div
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setRestockingProduct(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white dark:bg-surface-900 rounded-3xl shadow-2xl shadow-slate-900/25 w-full max-w-lg overflow-hidden border border-slate-200/90 dark:border-surface-750 flex flex-col max-h-[92vh]"
            >
              {/* Modal Top Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-surface-800 flex items-center justify-between bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 dark:from-surface-850 dark:via-surface-850 dark:to-surface-850">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-primary-500/20 shrink-0">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{isKhmer ? 'គ្រប់គ្រង & បំពេញស្តុកទំនិញ' : 'Manage & Restock Inventory'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isKhmer ? 'កែសម្រួលចំនួនស្តុក និងតាមដានតម្លៃស្តុកជាក់ស្តែង' : 'Adjust stock levels and monitor real-time inventory value'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRestockingProduct(null)}
                  className="w-8 h-8 rounded-full bg-white dark:bg-surface-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-700 flex items-center justify-center transition shadow-xs border border-slate-200/60 dark:border-surface-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <form onSubmit={handleQuickRestockSubmit} className="p-6 space-y-5 overflow-y-auto">
                {/* Product Preview Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-surface-850 border border-slate-200/80 dark:border-surface-800 flex items-center gap-3.5">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white dark:bg-surface-800 shrink-0 border border-slate-200/80 dark:border-surface-700 shadow-xs">
                    {restockingProduct.thumbnail ? (
                      <Image
                        src={restockingProduct.thumbnail}
                        alt={restockingProduct.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400 m-auto mt-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {restockingProduct.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200/70 dark:bg-surface-700 text-slate-700 dark:text-slate-300">
                        <Tag className="w-3 h-3 text-slate-500" />
                        <span>{categoriesMap.get(restockingProduct.categoryId) || (isKhmer ? 'ទូទៅ' : 'General')}</span>
                      </span>
                      {restockingProduct.brand && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {restockingProduct.brand}
                        </span>
                      )}
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                        {formatPrice(restockingProduct.price, language)}
                      </span>
                    </div>
                  </div>
                  {/* Stock Status Badge */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {isKhmer ? 'ស្តុកបច្ចុប្បន្ន' : 'Current'}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold tabular-nums mt-0.5 border ${restockingProduct.stock === 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60'
                          : restockingProduct.stock <= 5
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
                        }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${restockingProduct.stock === 0
                            ? 'bg-rose-500'
                            : restockingProduct.stock <= 5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                      />
                      <span>{restockingProduct.stock} {isKhmer ? 'គ្រឿង' : 'pcs'}</span>
                    </div>
                  </div>
                </div>

                {/* Operation Mode Tabs (Add / Set / Deduct) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                    {isKhmer ? 'ជ្រើសរើសរបៀបកែសម្រួលស្តុក' : 'Select Adjustment Mode'}:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-surface-850 border border-slate-200/80 dark:border-surface-800">
                    <button
                      type="button"
                      onClick={() => {
                        setRestockMode('add');
                        setRestockQty(10);
                        setRestockReason('shipment');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${restockMode === 'add'
                          ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/60 dark:border-surface-600'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isKhmer ? 'បន្ថែមស្តុក' : 'Add Stock'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRestockMode('set');
                        setRestockQty(restockingProduct.stock);
                        setRestockReason('audit');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${restockMode === 'set'
                          ? 'bg-white dark:bg-surface-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-surface-600'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isKhmer ? 'កំណត់ជាក់ស្តែង' : 'Set Exact'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRestockMode('deduct');
                        setRestockQty(1);
                        setRestockReason('damaged');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${restockMode === 'deduct'
                          ? 'bg-white dark:bg-surface-700 text-rose-600 dark:text-rose-400 shadow-sm border border-slate-200/60 dark:border-surface-600'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>{isKhmer ? 'កាត់ចេញ' : 'Deduct'}</span>
                    </button>
                  </div>
                </div>

                {/* Counter Stepper Control */}
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-surface-850 border border-slate-200/80 dark:border-surface-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>
                      {restockMode === 'add'
                        ? (isKhmer ? 'ចំនួនត្រូវបន្ថែមទៅស្តុក:' : 'Quantity to Add:')
                        : restockMode === 'deduct'
                          ? (isKhmer ? 'ចំនួនត្រូវកាត់ចេញពីស្តុក:' : 'Quantity to Deduct:')
                          : (isKhmer ? 'ចំនួនស្តុកសរុបថ្មី:' : 'New Total Quantity:')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isKhmer ? 'ប្រើប៊ូតុង ឬវាយបញ្ចូលផ្ទាល់' : 'Use stepper or type below'}
                    </span>
                  </div>

                  {/* High-End Stepper Controls */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setRestockQty((prev) => Math.max(0, prev - 10))}
                      className="w-11 h-11 rounded-2xl bg-white dark:bg-surface-800 hover:bg-slate-100 dark:hover:bg-surface-700 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 transition active:scale-95 shadow-xs flex items-center justify-center"
                      title="-10"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockQty((prev) => Math.max(0, prev - 1))}
                      className="w-11 h-11 rounded-2xl bg-white dark:bg-surface-800 hover:bg-slate-100 dark:hover:bg-surface-700 border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-700 dark:text-slate-200 transition active:scale-95 shadow-xs flex items-center justify-center"
                      title="-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={restockQty}
                        onChange={(e) => setRestockQty(Math.max(0, parseInt(e.target.value) || 0))}
                        className={`w-28 sm:w-32 h-12 text-center text-2xl font-black rounded-2xl bg-white dark:bg-surface-900 border-2 text-slate-900 dark:text-white tabular-nums focus:outline-none shadow-xs transition ${restockMode === 'add'
                            ? 'border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                            : restockMode === 'deduct'
                              ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                          }`}
                        required
                        autoFocus
                      />
                      <span className="absolute -top-2.5 right-2 px-1.5 py-0.5 bg-slate-800 text-[9px] font-bold text-white rounded-md uppercase tracking-wider">
                        {isKhmer ? 'គ្រឿង' : 'pcs'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRestockQty((prev) => prev + 1)}
                      className="w-11 h-11 rounded-2xl bg-white dark:bg-surface-800 hover:bg-slate-100 dark:hover:bg-surface-700 border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-700 dark:text-slate-200 transition active:scale-95 shadow-xs flex items-center justify-center"
                      title="+1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockQty((prev) => prev + 10)}
                      className="w-11 h-11 rounded-2xl bg-white dark:bg-surface-800 hover:bg-slate-100 dark:hover:bg-surface-700 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 transition active:scale-95 shadow-xs flex items-center justify-center"
                      title="+10"
                    >
                      +10
                    </button>
                  </div>

                  {/* Mode-Specific Quick Preset Chips */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {isKhmer ? 'ជ្រើសរើសបរិមាណរហ័ស (Quick Presets)' : 'Quick Presets'}:
                      </span>
                    </div>

                    {restockMode === 'add' && (
                      <div className="grid grid-cols-5 gap-1.5">
                        {[5, 10, 25, 50, 100].map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setRestockQty((prev) => prev + qty)}
                            className="py-1.5 px-1 rounded-xl bg-white dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-700 hover:text-primary-600 dark:text-slate-300 text-xs font-bold font-mono transition border border-slate-200 dark:border-slate-700 hover:border-primary-400 active:scale-95 shadow-2xs"
                          >
                            +{qty}
                          </button>
                        ))}
                      </div>
                    )}

                    {restockMode === 'set' && (
                      <div className="grid grid-cols-5 gap-1.5">
                        {[0, 10, 25, 50, 100].map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setRestockQty(qty)}
                            className={`py-1.5 px-1 rounded-xl text-xs font-bold font-mono transition border active:scale-95 shadow-2xs ${qty === 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                : 'bg-white dark:bg-surface-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 hover:text-indigo-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                          >
                            {qty === 0 ? (isKhmer ? 'អស់ (0)' : 'Out (0)') : qty}
                          </button>
                        ))}
                      </div>
                    )}

                    {restockMode === 'deduct' && (
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 5, 10, 20].map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setRestockQty((prev) => prev + qty)}
                            className="py-1.5 px-1 rounded-xl bg-white dark:bg-surface-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 text-xs font-bold font-mono transition border border-slate-200 dark:border-slate-700 hover:border-rose-400 active:scale-95 shadow-2xs"
                          >
                            -{qty}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Import Cost Price per Unit Field */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-850 border border-slate-200/80 dark:border-surface-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      {isKhmer ? 'ថ្លៃដើមនាំចូលក្នុង ១ គ្រឿង ($ Cost / Unit)' : 'Import Cost Price ($ / Unit)'}
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {isKhmer ? 'សម្រាប់គណនាចំណេញស្វ័យប្រវត្តិ' : 'For auto profit calculation'}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={restockCostPrice}
                      onChange={(e) => setRestockCostPrice(e.target.value)}
                      placeholder={restockingProduct.costPrice ? String(restockingProduct.costPrice) : '0.00'}
                      className="w-full h-10 pl-8 pr-3 text-xs sm:text-sm rounded-xl bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
                    />
                  </div>
                  {restockCostPrice !== '' && Number(restockCostPrice) > 0 && (
                    <div className="flex items-center justify-between text-xs pt-1 text-slate-600 dark:text-slate-400">
                      <span>{isKhmer ? 'ចំណេញក្នុង ១ គ្រឿង:' : 'Unit Gross Profit:'}</span>
                      <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatPrice(Math.max(0, (restockingProduct.price || 0) - Number(restockCostPrice)), language)}
                        {' '}({Math.round((((restockingProduct.price || 0) - Number(restockCostPrice)) / (restockingProduct.price || 1)) * 100)}%)
                      </strong>
                    </div>
                  )}
                </div>

                {/* Live Real-time Stock & Financial Accounting Preview */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 dark:from-surface-850 dark:via-surface-800/40 dark:to-surface-850 border border-slate-200/90 dark:border-surface-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary-500" />
                      <span>{isKhmer ? 'លទ្ធផលស្តុក & គណនេយ្យជាក់ស្តែង' : 'Live Stock & Financial Impact'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isKhmer ? 'គណនាស្វ័យប្រវត្តិ' : 'Auto calculated'}
                    </span>
                  </div>

                  {/* 3 Columns: Current -> Change -> New */}
                  <div className="grid grid-cols-3 gap-2 text-center items-center">
                    {/* Current */}
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-surface-800/80 border border-slate-200/60 dark:border-surface-700">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        {isKhmer ? 'ស្តុកដើម' : 'Original'}
                      </div>
                      <div className="text-lg font-black text-slate-700 dark:text-slate-200 tabular-nums">
                        {restockingProduct.stock}
                      </div>
                    </div>

                    {/* Change Diff */}
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-surface-800/80 border border-slate-200/60 dark:border-surface-700">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        {isKhmer ? 'បំលាស់ប្តូរ' : 'Change'}
                      </div>
                      <div
                        className={`text-lg font-black tabular-nums flex items-center justify-center gap-0.5 ${calculatedStock.diff > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : calculatedStock.diff < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-400'
                          }`}
                      >
                        {calculatedStock.diff > 0 ? (
                          <>
                            <span>+{calculatedStock.diff}</span>
                          </>
                        ) : calculatedStock.diff < 0 ? (
                          <>
                            <span>{calculatedStock.diff}</span>
                          </>
                        ) : (
                          <span>0</span>
                        )}
                      </div>
                    </div>

                    {/* New Total */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-tr from-primary-500/10 via-indigo-500/10 to-violet-500/10 border border-primary-500/30 dark:border-primary-500/30">
                      <div className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase">
                        {isKhmer ? 'ស្តុកថ្មីសរុប' : 'New Stock'}
                      </div>
                      <div className="text-xl font-black text-primary-600 dark:text-primary-400 tabular-nums">
                        {calculatedStock.finalStock}
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-surface-750 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block">
                        {isKhmer ? 'ដើមទុនស្តុកសរុប' : 'Total Cost Value'}
                      </span>
                      <strong className="font-mono font-bold text-sm">
                        {formatPrice(
                          (Number(restockCostPrice) || restockingProduct.costPrice || 0) * calculatedStock.finalStock,
                          language
                        )}
                      </strong>
                    </div>

                    <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200">
                      <span className="text-[10px] text-sky-700 dark:text-sky-400 font-semibold block">
                        {isKhmer ? 'ចំណូលលក់ប៉ាន់ស្មាន' : 'Est. Retail Revenue'}
                      </span>
                      <strong className="font-mono font-bold text-sm">
                        {formatPrice((restockingProduct.price || 0) * calculatedStock.finalStock, language)}
                      </strong>
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">
                        {isKhmer ? 'ចំណេញប៉ាន់ស្មាន' : 'Est. Total Profit'}
                      </span>
                      <strong className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        +{formatPrice(
                          Math.max(
                            0,
                            ((restockingProduct.price || 0) -
                              (Number(restockCostPrice) || restockingProduct.costPrice || 0)) *
                            calculatedStock.finalStock
                          ),
                          language
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Restock Reason Audit Tags */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                    {isKhmer ? 'មូលហេតុ ឬចំណាំកែសម្រួល' : 'Reason / Note'}:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'shipment', km: '📦 នាំចូលថ្មី', en: '📦 Inbound Shipment' },
                      { id: 'audit', km: '🔍 រាប់ស្តុកឡើងវិញ', en: '🔍 Stock Audit' },
                      { id: 'damaged', km: '⚠️ ខូចខាត/បាត់បង់', en: '⚠️ Damaged/Lost' },
                      { id: 'return', km: '🔄 អតិថិជនប្តូរ', en: '🔄 Customer Return' },
                    ].map((reason) => (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => setRestockReason(reason.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${restockReason === reason.id
                            ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700 font-bold shadow-2xs'
                            : 'bg-white dark:bg-surface-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                      >
                        {isKhmer ? reason.km : reason.en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRestockingProduct(null)}
                    className="btn-secondary flex-1 text-xs sm:text-sm font-semibold h-11 rounded-2xl"
                  >
                    {isKhmer ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isRestocking}
                    className="flex-[1.5] h-11 rounded-2xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-500/25 transition active:scale-98 flex items-center justify-center gap-2"
                  >
                    {isRestocking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isKhmer ? 'កំពុងរក្សាទុក...' : 'Updating...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {isKhmer
                            ? `រក្សាទុកស្តុក (${calculatedStock.finalStock} គ្រឿង)`
                            : `Save Stock (${calculatedStock.finalStock} pcs)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Edit / Create Full Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-surface-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-slate-200/80 dark:border-slate-800"
          >
            <div className="p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <h2 className={`text-gray-900 dark:text-white ${isKhmer ? 'text-xl font-bold' : 'text-xl font-extrabold tracking-tight'}`}>
                  {editingProduct ? (isKhmer ? 'កែប្រែទំនិញ' : 'Edit Product') : isKhmer ? 'បន្ថែមទំនិញថ្មី' : 'Add New Product'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-surface-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className={modalGridCls}>
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Product Name *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      className={modalInputCls}
                      placeholder="e.g. iPhone 16 Pro Max 256GB"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Short Description</label>
                    <input
                      value={form.shortDesc}
                      onChange={(e) => setForm((p) => ({ ...p, shortDesc: e.target.value }))}
                      className={modalInputCls}
                      placeholder="e.g. A18 Pro chip, Grade Titanium, 48MP Fusion"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Full Description *</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      required
                      rows={3}
                      className="input text-sm resize-none min-h-[96px]"
                    />
                  </div>
                  <div>
                    <label className={modalLabelCls}>
                      {isKhmer ? 'តម្លៃលក់ចេញ ($ Price) *' : 'Selling Price ($) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      required
                      className={modalInputCls}
                      placeholder="999.00"
                    />
                  </div>
                  <div>
                    <label className={modalLabelCls}>
                      {isKhmer ? 'ថ្លៃដើមនាំចូល ($ Cost Price)' : 'Import Cost Price ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.costPrice}
                      onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
                      className={modalInputCls}
                      placeholder="650.00"
                    />
                  </div>
                  <div>
                    <label className={modalLabelCls}>
                      {isKhmer ? 'តម្លៃដើមមុនបញ្ចុះ ($ Compare Price)' : 'Compare At Price ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.comparePrice}
                      onChange={(e) => setForm((p) => ({ ...p, comparePrice: e.target.value }))}
                      className={modalInputCls}
                      placeholder="1199.00"
                    />
                  </div>
                  <div>
                    <label className={modalLabelCls}>
                      {isKhmer ? 'ចំនួនស្តុក (Stock) *' : 'Stock Quantity *'}
                    </label>
                    <input
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                      required
                      className={modalInputCls}
                      placeholder="50"
                    />
                  </div>

                  {/* Dynamic Profit & Margin Calculation Helper Card */}
                  {form.price && form.costPrice && Number(form.price) > 0 && Number(form.costPrice) > 0 && (
                    <div className="sm:col-span-2 p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {isKhmer ? '📊 គណនាប្រាក់ចំណេញក្នុង ១ គ្រឿង:' : '📊 Gross Profit per Unit:'}
                        </span>
                        <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-black font-mono">
                          +{formatPrice(Math.max(0, Number(form.price) - Number(form.costPrice)), language)}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                          Margin: {Math.round(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100)}%
                        </span>
                      </div>
                      {form.stock && Number(form.stock) > 0 && (
                        <div className="text-slate-500 dark:text-slate-400 font-mono">
                          {isKhmer ? 'ដើមទុនស្តុក:' : 'Capital:'}{' '}
                          <strong className="text-slate-900 dark:text-white font-bold">
                            {formatPrice(Number(form.stock) * Number(form.costPrice), language)}
                          </strong>
                          {' · '}
                          {isKhmer ? 'ចំណេញប៉ាន់ស្មាន:' : 'Est. Profit:'}{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                            +{formatPrice(
                              Math.max(0, Number(form.stock) * (Number(form.price) - Number(form.costPrice))),
                              language
                            )}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className={modalLabelCls}>Category *</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                      required
                      className={modalInputCls}
                    >
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
                    <input
                      value={form.brand}
                      onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                      className={modalInputCls}
                      placeholder="Apple, Samsung, Sony..."
                    />
                  </div>
                  <div>
                    <label className={modalLabelCls}>Tags (comma separated)</label>
                    <input
                      value={form.tags}
                      onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                      className={modalInputCls}
                      placeholder="phone, 5g, flagship"
                    />
                  </div>

                  {/* Thumbnail Image Picker */}
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Thumbnail Image</label>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <label className="btn-secondary text-sm cursor-pointer inline-flex items-center gap-2">
                        {uploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>{isKhmer ? 'ផ្ទុករូបពីឧបករណ៍ / Upload' : 'Upload from Device'}</span>
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
                      placeholder="https://... or /uploads/..."
                    />
                    {thumbPreviewUrl ? (
                      <div className="relative w-full max-h-60 min-h-[120px] mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-surface-850 flex items-center justify-center p-2">
                        <Image
                          src={thumbPreviewUrl}
                          alt=""
                          width={960}
                          height={540}
                          className="w-full h-auto max-h-60 object-contain rounded-xl"
                          unoptimized
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Gallery Multiple Images */}
                  <div className="sm:col-span-2">
                    <label className={modalLabelCls}>Gallery Images</label>
                    <label className="btn-secondary text-sm cursor-pointer inline-flex items-center gap-2 mb-2">
                      {uploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>{isKhmer ? 'បន្ថែមរូបច្រើនសន្លឹក / Add Photos' : 'Add Multiple Photos'}</span>
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
                      className="input text-sm resize-y min-h-[80px]"
                      placeholder="https://... or /uploads/... (comma separated URLs)"
                    />
                    {galleryPreviewUrls.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {galleryPreviewUrls.map((url, i) => (
                          <div
                            key={`${url}-${i}`}
                            className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 shrink-0"
                          >
                            <Image src={url} alt="" fill className="object-cover" unoptimized sizes="80px" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Settings Checkboxes */}
                  <div className="sm:col-span-2 flex flex-wrap gap-6 pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        Featured (បង្ហាញលើទំព័រដើម / Home Listings)
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Active (បើកលក់នៅលើ Website)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1 min-h-[44px] rounded-2xl"
                  >
                    {isKhmer ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadBusy}
                    className="btn-primary flex-1 min-h-[44px] rounded-2xl flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{editingProduct ? 'Update Product' : 'Create Product'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
