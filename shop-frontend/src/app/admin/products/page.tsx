'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Eye, Upload, Loader2 } from 'lucide-react';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'featured' | 'active' | 'inactive'>('all');
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

  useEffect(() => {
    setLoading(true);
    const params: Record<string, unknown> = {
      limit: 100,
      search: search.trim() || undefined,
    };
    if (filterMode === 'featured') params.featured = 'true';
    if (filterMode === 'active') params.active = 'true';
    if (filterMode === 'inactive') params.active = 'false';

    Promise.all([adminApi.getProducts(params), adminApi.getCategories()])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.data.data || []);
        setCategories(catRes.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, filterMode]);

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

  return (
    <div style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Siemreap', sans-serif" } : undefined}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-gray-500 text-sm">{products.length} products</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="input pl-9 text-sm w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'featured', 'active', 'inactive'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                filterMode === mode
                  ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'featured' ? 'Featured' : mode === 'active' ? 'Active only' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-800">
                {['Product', 'Category', 'Price', 'Stock', 'Featured', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`product-row-skeleton-${i}`}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={`product-cell-skeleton-${i}-${j}`} className="py-3 px-4"><div className="h-4 bg-gray-100 dark:bg-surface-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : products.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {product.thumbnail && (
                          <Image src={product.thumbnail} alt={product.name} fill className="object-cover" sizes="40px" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{product.category.name}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-gray-900 dark:text-white">{formatPrice(product.price)}</span>
                    {product.comparePrice && (
                      <span className="text-xs text-gray-400 line-through ml-1">{formatPrice(product.comparePrice)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${product.stock === 0 ? 'text-red-500' : product.stock <= 10 ? 'text-orange-500' : 'text-green-600'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {product.isFeatured ? (
                      <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Featured</span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${product.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Link href={`/products/${product.slug}`} target="_blank" className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => openEdit(product)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
