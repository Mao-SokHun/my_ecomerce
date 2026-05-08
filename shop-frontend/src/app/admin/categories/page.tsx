'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Category } from '@/types';
import { adminApi, categoryApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    image: '',
    sortOrder: '0',
    parentId: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .getCategories()
      .then(({ data }) => setCategories(data.data || []))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', image: '', sortOrder: '0', parentId: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || '',
      image: c.image || '',
      sortOrder: String(c.sortOrder ?? 0),
      parentId: c.parentId || '',
      isActive: c.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        image: form.image.trim() || undefined,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
        parentId: editing ? form.parentId || null : form.parentId || undefined,
        ...(editing ? { isActive: form.isActive } : {}),
      };
      if (editing) {
        await categoryApi.update(editing.id, payload);
        toast.success('Category updated');
      } else {
        await categoryApi.create(payload);
        toast.success('Category created');
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Category) => {
    const n = c._count?.products ?? 0;
    if (n > 0) {
      toast.error(`Cannot delete: ${n} product(s) use this category. Reassign products first.`);
      return;
    }
    if (!window.confirm(`Delete category “${c.name}”?`)) return;
    try {
      await categoryApi.delete(c.id);
      toast.success('Category removed');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-gray-500 text-sm">{categories.length} categories (including subcategories)</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add category
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-surface-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Slug</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Parent</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Products</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Order</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-surface-800/50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">{c.slug}</td>
                    <td className="py-3 px-4 text-gray-500">{c.parent?.name || '—'}</td>
                    <td className="py-3 px-4 text-right">{c._count?.products ?? 0}</td>
                    <td className="py-3 px-4">{c.sortOrder}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`badge ${c.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {c.isActive ? 'Active' : 'Off'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editing ? 'Edit category' : 'New category'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="input text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="input text-sm resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Image URL</label>
                <input
                  value={form.image}
                  onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                  className="input text-sm"
                  placeholder="https://…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Sort order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Parent</label>
                  <select
                    value={form.parentId}
                    onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
                    className="input text-sm"
                  >
                    <option value="">— Top level —</option>
                    {categories
                      .filter((x) => x.id !== editing?.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.parent ? `${x.parent.name} › ${x.name}` : x.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              {editing && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm dark:text-gray-300">Active in store</span>
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
