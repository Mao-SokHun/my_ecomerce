'use client';

import { Product, Order } from '@/types';

export type StockHealthStatus = 'OUT_OF_STOCK' | 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'OVERSTOCK';

export interface ProductStockForecast {
  product: Product;
  currentStock: number;
  unitsSold30Days: number;
  dailyVelocity: number;
  daysRemaining: number | null; // null if velocity is 0
  status: StockHealthStatus;
  suggestedReorderUnits: number;
  estimatedReorderCost: number;
}

/**
 * Calculates sales velocity and runout forecast for all products based on past order history
 */
export function calculateStockForecasting(products: Product[], orders: Order[] = []): ProductStockForecast[] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Map product units sold in last 30 days
  const soldMap: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.status !== 'CANCELLED' && new Date(o.createdAt) >= thirtyDaysAgo) {
      (o.items || []).forEach((item) => {
        soldMap[item.productId] = (soldMap[item.productId] || 0) + (item.quantity || 1);
      });
    }
  });

  return products.map((p) => {
    const currentStock = p.stock || 0;
    const sold30 = soldMap[p.id] || p.soldCount || 0;
    // Estimated daily velocity (capped to a realistic minimum based on sold count)
    const dailyVelocity = sold30 > 0 ? Number((sold30 / 30).toFixed(2)) : 0;

    let daysRemaining: number | null = null;
    let status: StockHealthStatus = 'HEALTHY';

    if (currentStock <= 0) {
      status = 'OUT_OF_STOCK';
      daysRemaining = 0;
    } else if (dailyVelocity > 0) {
      daysRemaining = Math.round(currentStock / dailyVelocity);
      if (daysRemaining <= 3) {
        status = 'CRITICAL';
      } else if (daysRemaining <= 7) {
        status = 'WARNING';
      } else if (daysRemaining > 60) {
        status = 'OVERSTOCK';
      } else {
        status = 'HEALTHY';
      }
    } else {
      if (currentStock <= (p.lowStockAlert || 5)) {
        status = 'WARNING';
      } else {
        status = 'HEALTHY';
      }
    }

    // Suggested reorder units to maintain a 30-day buffer
    const target30DaysStock = Math.ceil(dailyVelocity * 30) || (p.lowStockAlert ? p.lowStockAlert * 3 : 15);
    const suggestedReorderUnits = Math.max(0, target30DaysStock - currentStock);
    const estimatedReorderCost = suggestedReorderUnits * (p.costPrice || 0);

    return {
      product: p,
      currentStock,
      unitsSold30Days: sold30,
      dailyVelocity,
      daysRemaining,
      status,
      suggestedReorderUnits,
      estimatedReorderCost,
    };
  });
}

// ==========================================
// SUPPLIER & PURCHASE ORDER (PO) MANAGEMENT
// ==========================================

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  telegram?: string;
  email?: string;
  address?: string;
  paymentTerms?: string; // e.g. "Net 30", "COD", "Cash Advance"
  suppliedProductNames?: string[];
  createdAt: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g. PO-202609-001
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  supplierTelegram?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  expectedDate?: string;
  notes?: string;
  createdAt: string;
  receivedAt?: string;
}

const STORAGE_KEY_SUPPLIERS = 'sh_inventory_suppliers';
const STORAGE_KEY_PURCHASE_ORDERS = 'sh_inventory_purchase_orders';

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_1',
    name: 'Phnom Penh Tech Import Co., Ltd',
    contactPerson: 'Mr. Sokchea (Manager)',
    phone: '012 888 999',
    telegram: '@sokchea_tech_import',
    email: 'sales@pptechimport.com',
    address: 'Russian Blvd, Toul Kork, Phnom Penh',
    paymentTerms: 'COD / Bank Transfer',
    suppliedProductNames: ['Headphones', 'Laptops', 'Keyboards'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sup_2',
    name: 'Smart Lifestyle Distribution Cambodia',
    contactPerson: 'Ms. Davy Meas',
    phone: '097 555 4433',
    telegram: '@davy_lifestyle_dist',
    email: 'davy@smartlifestyle.kh',
    address: 'St. 271, Mean Chey, Phnom Penh',
    paymentTerms: 'Net 15 Days',
    suppliedProductNames: ['Fashion T-Shirts', 'Bags', 'Accessories'],
    createdAt: new Date().toISOString(),
  },
];

export function getSuppliers(): Supplier[] {
  if (typeof window === 'undefined') return DEFAULT_SUPPLIERS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SUPPLIERS);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_SUPPLIERS;
}

export function saveSupplier(supplier: Omit<Supplier, 'id' | 'createdAt'> & { id?: string }): Supplier {
  const list = getSuppliers();
  let updated: Supplier;
  if (supplier.id) {
    updated = { ...supplier, id: supplier.id, createdAt: new Date().toISOString() } as Supplier;
    const next = list.map((s) => (s.id === supplier.id ? updated : s));
    localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify(next));
  } else {
    updated = {
      ...supplier,
      id: `sup_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify([updated, ...list]));
  }
  window.dispatchEvent(new Event('suppliers_updated'));
  return updated;
}

export function deleteSupplier(id: string): void {
  const list = getSuppliers();
  const next = list.filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY_SUPPLIERS, JSON.stringify(next));
  window.dispatchEvent(new Event('suppliers_updated'));
}

export function getPurchaseOrders(): PurchaseOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PURCHASE_ORDERS);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function savePurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'> & { id?: string }): PurchaseOrder {
  const list = getPurchaseOrders();
  let updated: PurchaseOrder;
  if (po.id) {
    const existing = list.find((p) => p.id === po.id);
    updated = { ...existing, ...po, id: po.id } as PurchaseOrder;
    const next = list.map((p) => (p.id === po.id ? updated : p));
    localStorage.setItem(STORAGE_KEY_PURCHASE_ORDERS, JSON.stringify(next));
  } else {
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = list.length + 1;
    const poNumber = `PO-${dateStr}-${String(count).padStart(3, '0')}`;
    updated = {
      ...po,
      id: `po_${Date.now()}`,
      poNumber,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_PURCHASE_ORDERS, JSON.stringify([updated, ...list]));
  }
  window.dispatchEvent(new Event('purchase_orders_updated'));
  return updated;
}

export function updatePOStatus(id: string, status: PurchaseOrderStatus): void {
  const list = getPurchaseOrders();
  const next = list.map((p) =>
    p.id === id ? { ...p, status, receivedAt: status === 'RECEIVED' ? new Date().toISOString() : p.receivedAt } : p
  );
  localStorage.setItem(STORAGE_KEY_PURCHASE_ORDERS, JSON.stringify(next));
  window.dispatchEvent(new Event('purchase_orders_updated'));
}
