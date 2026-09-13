export interface StockAdjustmentItem {
  id: string;
  productId: string;
  productName: string;
  diff: number; // negative for loss/deduction, positive for restock
  finalStock: number;
  reason: 'damaged' | 'audit' | 'shipment' | 'return' | string;
  costPrice: number;
  sellingPrice: number;
  capitalLoss: number; // Math.abs(diff) * costPrice when diff < 0
  revenueLoss: number; // Math.abs(diff) * sellingPrice when diff < 0
  notes?: string;
  createdAt: string;
}

export const INITIAL_DEMO_ADJUSTMENTS: StockAdjustmentItem[] = [
  {
    id: 'adj_demo_1',
    productId: 'p_demo_1',
    productName: 'iPhone 15 Pro Max (256GB Titanium)',
    diff: -1,
    finalStock: 14,
    reason: 'damaged',
    costPrice: 1050,
    sellingPrice: 1199,
    capitalLoss: 1050,
    revenueLoss: 1199,
    notes: 'បែកអេក្រង់ពេលដឹកជញ្ជូនចូលស្តុក (Screen cracked during transit)',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'adj_demo_2',
    productId: 'p_demo_2',
    productName: 'Sony WH-1000XM5 Wireless Headphones',
    diff: -2,
    finalStock: 8,
    reason: 'damaged',
    costPrice: 280,
    sellingPrice: 349,
    capitalLoss: 560,
    revenueLoss: 698,
    notes: 'ប្រអប់សើមទឹកភ្លៀង ខូចគ្រឿងអេឡិចត្រូនិច (Water damaged)',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'adj_demo_3',
    productId: 'p_demo_3',
    productName: 'MacBook Air M2 13.6" (Midnight)',
    diff: -1,
    finalStock: 5,
    reason: 'audit',
    costPrice: 880,
    sellingPrice: 999,
    capitalLoss: 880,
    revenueLoss: 999,
    notes: 'រាប់ស្តុកចុងខែបាត់ ១ គ្រឿង (Missing during inventory count audit)',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

const STORAGE_KEY = 'admin_stock_adjustments';

export function getStockAdjustments(): StockAdjustmentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with initial realistic demo records so admin can see data immediately
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_ADJUSTMENTS));
      return INITIAL_DEMO_ADJUSTMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStockAdjustment(item: StockAdjustmentItem): StockAdjustmentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getStockAdjustments();
    const updated = [item, ...existing.filter((x) => x.id !== item.id)].slice(0, 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('stock_adjustments_updated', { detail: updated }));
    return updated;
  } catch {
    return [];
  }
}

export function removeStockAdjustment(id: string): StockAdjustmentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getStockAdjustments();
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('stock_adjustments_updated', { detail: updated }));
    return updated;
  } catch {
    return [];
  }
}

export function calculateStockLossSummary(items: StockAdjustmentItem[]) {
  return items.reduce(
    (acc, curr) => {
      if (curr.diff < 0) {
        const units = Math.abs(curr.diff);
        acc.totalLossUnits += units;
        acc.totalCapitalLoss += curr.capitalLoss || units * (curr.costPrice || 0);
        acc.totalRevenueLoss += curr.revenueLoss || units * (curr.sellingPrice || 0);
        if (curr.reason === 'damaged') {
          acc.damagedCount += units;
        } else if (curr.reason === 'audit') {
          acc.auditLossCount += units;
        }
        acc.incidentCount += 1;
      }
      return acc;
    },
    {
      totalLossUnits: 0,
      totalCapitalLoss: 0,
      totalRevenueLoss: 0,
      damagedCount: 0,
      auditLossCount: 0,
      incidentCount: 0,
    }
  );
}
