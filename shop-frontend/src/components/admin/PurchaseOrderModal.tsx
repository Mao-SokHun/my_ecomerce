'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/types';
import {
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  getSuppliers,
  saveSupplier,
  deleteSupplier,
  getPurchaseOrders,
  savePurchaseOrder,
  updatePOStatus,
} from '@/lib/stockForecasting';
import { formatPrice, formatDate } from '@/lib/utils';
import { generateBarcodeSvg } from '@/lib/barcodeGenerator';
import {
  X,
  Plus,
  Trash2,
  Printer,
  FileText,
  Truck,
  Building,
  Phone,
  Send,
  CheckCircle2,
  Clock,
  Ban,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProduct?: Product | null;
  initialQuantity?: number;
  isKhmer?: boolean;
}

export function PurchaseOrderModal({
  isOpen,
  onClose,
  products,
  initialProduct,
  initialQuantity = 10,
  isKhmer = true,
}: PurchaseOrderModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'suppliers'>('create');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // PO Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [poNotes, setPoNotes] = useState<string>('');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);

  // Supplier Form State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    telegram: '',
    email: '',
    address: '',
    paymentTerms: 'COD',
  });

  const loadData = () => {
    const sups = getSuppliers();
    setSuppliers(sups);
    if (sups.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(sups[0].id);
    }
    setPurchaseOrders(getPurchaseOrders());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (initialProduct) {
        setPoItems([
          {
            productId: initialProduct.id,
            productName: initialProduct.name,
            productSku: initialProduct.sku || '',
            quantity: initialQuantity,
            unitCost: initialProduct.costPrice || 0,
            totalCost: initialQuantity * (initialProduct.costPrice || 0),
          },
        ]);
        setActiveTab('create');
      } else if (poItems.length === 0 && products.length > 0) {
        const first = products[0];
        setPoItems([
          {
            productId: first.id,
            productName: first.name,
            productSku: first.sku || '',
            quantity: 10,
            unitCost: first.costPrice || 0,
            totalCost: 10 * (first.costPrice || 0),
          },
        ]);
      }
    }
  }, [isOpen, initialProduct, initialQuantity]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    setPoItems((prev) => [
      ...prev,
      {
        productId: p.id,
        productName: p.name,
        productSku: p.sku || '',
        quantity: 10,
        unitCost: p.costPrice || 0,
        totalCost: 10 * (p.costPrice || 0),
      },
    ]);
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setPoItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === 'productId') {
        const p = products.find((prod) => prod.id === value);
        if (p) {
          item.productName = p.name;
          item.productSku = p.sku || '';
          item.unitCost = p.costPrice || 0;
          item.totalCost = item.quantity * item.unitCost;
        }
      }
      if (field === 'quantity' || field === 'unitCost') {
        item.totalCost = Number(item.quantity) * Number(item.unitCost);
      }
      next[index] = item;
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPOCost = poItems.reduce((acc, it) => acc + (it.totalCost || 0), 0);

  const handleCreatePO = (status: PurchaseOrderStatus = 'DRAFT') => {
    if (poItems.length === 0) {
      toast.error(isKhmer ? 'សូមជ្រើសរើសទំនិញយ៉ាងហោចណាស់មួយ' : 'Please add at least one item');
      return;
    }
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) {
      toast.error(isKhmer ? 'សូមជ្រើសរើសក្រុមហ៊ុនផ្គត់ផ្គង់' : 'Please select a supplier');
      return;
    }

    const newPO = savePurchaseOrder({
      supplierId: sup.id,
      supplierName: sup.name,
      supplierPhone: sup.phone,
      supplierTelegram: sup.telegram,
      status,
      items: poItems,
      totalCost: totalPOCost,
      expectedDate: expectedDate || undefined,
      notes: poNotes || undefined,
    });

    toast.success(
      isKhmer
        ? `បានបង្កើត ${newPO.poNumber} ជោគជ័យ!`
        : `Purchase order ${newPO.poNumber} created!`
    );
    loadData();
    setActiveTab('list');
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim() || !supplierForm.phone.trim()) {
      toast.error(isKhmer ? 'សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទ' : 'Name and phone required');
      return;
    }

    saveSupplier({
      id: editingSupplier?.id,
      ...supplierForm,
    });

    toast.success(isKhmer ? 'បានរក្សាទុកក្រុមហ៊ុនផ្គត់ផ្គង់' : 'Supplier saved');
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      contactPerson: '',
      phone: '',
      telegram: '',
      email: '',
      address: '',
      paymentTerms: 'COD',
    });
    loadData();
  };

  const handlePrintPO = (po: PurchaseOrder) => {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;

    const barcodeSvg = generateBarcodeSvg(po.poNumber, { height: 40, width: 1.5, showText: true });

    const html = `
      <!DOCTYPE html>
      <html lang="km">
        <head>
          <meta charset="utf-8">
          <title>PO-${po.poNumber}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #111827;
              line-height: 1.5;
              padding: 10px;
            }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
            .company { font-size: 24px; font-weight: 900; letter-spacing: 0.5px; }
            .po-title { font-size: 20px; font-weight: 800; text-align: right; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            .card { background: #f9fafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 13px; }
            .card h4 { margin: 0 0 6px 0; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #374151; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
            th { background: #111827; color: #fff; padding: 10px; text-align: left; font-weight: 700; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { font-size: 16px; font-weight: 900; background: #f3f4f6; }
            .footer-sign { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; text-align: center; }
            .sign-line { margin-top: 60px; border-top: 1px dashed #6b7280; padding-top: 6px; font-weight: 600; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">SH-SHOP E-COMMERCE</div>
              <div style="font-size: 12px; color: #4b5563;">Procurement & Inventory Operations</div>
              <div style="font-size: 12px; color: #4b5563;">Phnom Penh, Cambodia • Tel: 097 494 4390</div>
            </div>
            <div>
              <div class="po-title">PURCHASE ORDER</div>
              <div style="text-align: right; margin-top: 6px;">${barcodeSvg}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h4>Vendor / Supplier</h4>
              <p><strong>${po.supplierName}</strong></p>
              <p>Phone: ${po.supplierPhone || 'N/A'}</p>
              ${po.supplierTelegram ? `<p>Telegram: ${po.supplierTelegram}</p>` : ''}
            </div>
            <div class="card">
              <h4>Order Details</h4>
              <p><strong>PO #:</strong> ${po.poNumber}</p>
              <p><strong>Date Issued:</strong> ${new Date(po.createdAt).toLocaleDateString()}</p>
              <p><strong>Expected Delivery:</strong> ${po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'Immediate'}</p>
              <p><strong>Status:</strong> ${po.status}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 45%;">Item Description</th>
                <th class="text-center" style="width: 15%;">Qty</th>
                <th class="text-right" style="width: 15%;">Unit Cost</th>
                <th class="text-right" style="width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${po.items
                .map(
                  (it, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${it.productName}</strong> ${it.productSku ? `<br><small style="color: #6b7280;">SKU: ${it.productSku}</small>` : ''}</td>
                  <td class="text-center">${it.quantity}</td>
                  <td class="text-right">$${Number(it.unitCost).toFixed(2)}</td>
                  <td class="text-right"><strong>$${Number(it.totalCost).toFixed(2)}</strong></td>
                </tr>
              `
                )
                .join('')}
              <tr class="total-row">
                <td colspan="4" class="text-right">Grand Total:</td>
                <td class="text-right">$${Number(po.totalCost).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          ${po.notes ? `<div class="card" style="margin-bottom: 20px;"><h4>Notes / Instructions</h4><p>${po.notes}</p></div>` : ''}

          <div class="footer-sign">
            <div>
              <div class="sign-line">Authorized Purchasing Agent (SH-Shop)</div>
            </div>
            <div>
              <div class="sign-line">Supplier Confirmation & Acceptance</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-surface-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-100 dark:border-surface-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-surface-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-surface-850/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {isKhmer ? 'គ្រប់គ្រងបញ្ជាទិញទំនិញចូល (Purchase Orders & Suppliers)' : 'Purchase Orders & Suppliers'}
              </h2>
              <p className="text-xs text-gray-500">
                {isKhmer ? 'បង្កើត PO បញ្ជាទិញចូលស្តុក & គ្រប់គ្រងអ្នកផ្គត់ផ្គង់' : 'Procurement forecasting & vendor directory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-surface-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-surface-800 px-5 gap-4 shrink-0 bg-white dark:bg-surface-900">
          {[
            { id: 'create', label: isKhmer ? '➕ បង្កើត PO ថ្មី' : '➕ Create PO' },
            { id: 'list', label: isKhmer ? `📋 បញ្ជី PO (${purchaseOrders.length})` : `📋 All POs (${purchaseOrders.length})` },
            { id: 'suppliers', label: isKhmer ? `🏢 ក្រុមហ៊ុនផ្គត់ផ្គង់ (${suppliers.length})` : `🏢 Suppliers (${suppliers.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: CREATE PO */}
          {activeTab === 'create' && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isKhmer ? 'ជ្រើសរើសក្រុមហ៊ុនផ្គត់ផ្គង់ (Supplier)' : 'Select Supplier'}
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full h-10 text-xs rounded-xl bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 px-3 font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isKhmer ? 'កាលបរិច្ឆេទរំពឹងទុក (Expected Date)' : 'Expected Delivery Date'}
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full h-10 text-xs rounded-xl bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 px-3 font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    {isKhmer ? 'កំណត់សម្គាល់ (Notes)' : 'Notes / Terms'}
                  </label>
                  <input
                    type="text"
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    placeholder="e.g. Urgent restock, pay on delivery"
                    className="w-full h-10 text-xs rounded-xl bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 px-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    {isKhmer ? 'ទំនិញត្រូវបញ្ជាទិញចូល (Reorder Items)' : 'Order Items'}
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isKhmer ? 'បន្ថែមទំនិញ' : 'Add Item'}
                  </button>
                </div>

                <div className="border border-gray-100 dark:border-surface-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-surface-800 text-gray-500 border-b border-gray-100 dark:border-surface-750">
                      <tr>
                        <th className="py-2.5 px-3 text-left font-bold">{isKhmer ? 'ទំនិញ' : 'Product'}</th>
                        <th className="py-2.5 px-3 text-center font-bold" style={{ width: '100px' }}>
                          {isKhmer ? 'ចំនួន (Qty)' : 'Qty'}
                        </th>
                        <th className="py-2.5 px-3 text-right font-bold" style={{ width: '120px' }}>
                          {isKhmer ? 'តម្លៃដើម ($)' : 'Unit Cost ($)'}
                        </th>
                        <th className="py-2.5 px-3 text-right font-bold" style={{ width: '120px' }}>
                          {isKhmer ? 'សរុប' : 'Total'}
                        </th>
                        <th className="py-2.5 px-2 text-center" style={{ width: '40px' }} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-surface-800">
                      {poItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-surface-800/30">
                          <td className="py-2 px-3">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                              className="w-full h-8 text-xs rounded-lg bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 px-2 font-medium"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (Stock: {p.stock})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-20 h-8 text-xs rounded-lg bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 px-2 text-center font-bold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.unitCost}
                              onChange={(e) => handleItemChange(idx, 'unitCost', Number(e.target.value))}
                              className="w-24 h-8 text-xs rounded-lg bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 px-2 text-right font-bold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-white">
                            {formatPrice(item.totalCost)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                  <div className="text-right">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                      {isKhmer ? 'តម្លៃដើមសរុប (Estimated PO Total):' : 'Estimated Grand Total:'}
                    </span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                      {formatPrice(totalPOCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-surface-800">
                <button
                  type="button"
                  onClick={() => handleCreatePO('DRAFT')}
                  className="btn-secondary text-xs px-4 py-2.5 font-bold"
                >
                  {isKhmer ? 'រក្សាទុកជាព្រាង (Save Draft)' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCreatePO('SENT')}
                  className="btn-primary text-xs px-5 py-2.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  {isKhmer ? 'ចេញបញ្ជាទិញ & ផ្ញើ (Issue & Send PO)' : 'Issue & Send PO'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ALL PURCHASE ORDERS */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {purchaseOrders.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-xs">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  {isKhmer ? 'មិនទាន់មានបញ្ជាទិញ PO នៅឡើយទេ' : 'No purchase orders recorded yet.'}
                </div>
              ) : (
                <div className="border border-gray-100 dark:border-surface-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-surface-800 text-gray-500 border-b border-gray-100 dark:border-surface-750">
                      <tr>
                        <th className="py-2.5 px-3 text-left font-bold">PO #</th>
                        <th className="py-2.5 px-3 text-left font-bold">{isKhmer ? 'អ្នកផ្គត់ផ្គង់' : 'Supplier'}</th>
                        <th className="py-2.5 px-3 text-left font-bold">{isKhmer ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                        <th className="py-2.5 px-3 text-center font-bold">{isKhmer ? 'ទំនិញ' : 'Items'}</th>
                        <th className="py-2.5 px-3 text-right font-bold">{isKhmer ? 'តម្លៃសរុប' : 'Total'}</th>
                        <th className="py-2.5 px-3 text-center font-bold">{isKhmer ? 'ស្ថានភាព' : 'Status'}</th>
                        <th className="py-2.5 px-3 text-right font-bold">{isKhmer ? 'សកម្មភាព' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-surface-800">
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50/50 dark:hover:bg-surface-800/30">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {po.poNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">
                            {po.supplierName}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">{formatDate(po.createdAt)}</td>
                          <td className="py-2.5 px-3 text-center font-semibold">{po.items.length}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-white">
                            {formatPrice(po.totalCost)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                po.status === 'RECEIVED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : po.status === 'SENT'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                                  : po.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              }`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handlePrintPO(po)}
                                title="Print PO"
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {po.status !== 'RECEIVED' && (
                                <button
                                  onClick={() => {
                                    updatePOStatus(po.id, 'RECEIVED');
                                    loadData();
                                    toast.success(isKhmer ? 'បានទទួលទំនិញចូលស្តុក!' : 'Items received into stock!');
                                  }}
                                  title="Mark Received"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {po.status !== 'CANCELLED' && po.status !== 'RECEIVED' && (
                                <button
                                  onClick={() => {
                                    updatePOStatus(po.id, 'CANCELLED');
                                    loadData();
                                    toast.success('PO Cancelled');
                                  }}
                                  title="Cancel PO"
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUPPLIERS DIRECTORY */}
          {activeTab === 'suppliers' && (
            <div className="space-y-5">
              {/* Add / Edit Supplier Form */}
              <form onSubmit={handleSaveSupplier} className="p-4 rounded-2xl bg-gray-50 dark:bg-surface-800 border border-gray-100 dark:border-surface-750 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  {editingSupplier ? (isKhmer ? 'កែប្រែក្រុមហ៊ុនផ្គត់ផ្គង់' : 'Edit Supplier') : (isKhmer ? 'បន្ថែមក្រុមហ៊ុនផ្គត់ផ្គង់ថ្មី' : 'Add New Supplier')}
                </h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Supplier / Company Name"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 px-3 font-semibold text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person (e.g. Sales Mgr)"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, contactPerson: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 px-3 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Phone Number"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 px-3 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Telegram (e.g. @sales_mgr)"
                    value={supplierForm.telegram}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, telegram: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 px-3 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Address / Location"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 px-3 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Payment Terms (e.g. COD / Net 30)"
                    value={supplierForm.paymentTerms}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, paymentTerms: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-white dark:bg-surface-900 border border-gray-200 dark:border-surface-700 px-3 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  {editingSupplier && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplier(null);
                        setSupplierForm({
                          name: '',
                          contactPerson: '',
                          phone: '',
                          telegram: '',
                          email: '',
                          address: '',
                          paymentTerms: 'COD',
                        });
                      }}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      {isKhmer ? 'បោះបង់' : 'Cancel'}
                    </button>
                  )}
                  <button type="submit" className="btn-primary text-xs px-4 py-1.5 font-bold">
                    {isKhmer ? 'រក្សាទុក' : 'Save Supplier'}
                  </button>
                </div>
              </form>

              {/* Suppliers Directory List */}
              <div className="grid sm:grid-cols-2 gap-3">
                {suppliers.map((s) => (
                  <div key={s.id} className="p-4 rounded-2xl bg-white dark:bg-surface-850 border border-gray-100 dark:border-surface-800 space-y-2 shadow-2xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{s.name}</h4>
                        {s.contactPerson && <p className="text-xs text-gray-500 font-medium">{s.contactPerson}</p>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {s.paymentTerms || 'COD'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> {s.phone}
                      </p>
                      {s.telegram && (
                        <p className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                          <span>✈️ Telegram:</span> {s.telegram}
                        </p>
                      )}
                      {s.address && (
                        <p className="text-[11px] text-gray-400 truncate">📍 {s.address}</p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-surface-800">
                      <button
                        onClick={() => {
                          setEditingSupplier(s);
                          setSupplierForm({
                            name: s.name,
                            contactPerson: s.contactPerson || '',
                            phone: s.phone,
                            telegram: s.telegram || '',
                            email: s.email || '',
                            address: s.address || '',
                            paymentTerms: s.paymentTerms || 'COD',
                          });
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          deleteSupplier(s.id);
                          loadData();
                          toast.success('Supplier removed');
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
