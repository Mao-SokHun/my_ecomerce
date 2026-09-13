export interface StockAdjustmentItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  type?: 'DAMAGED' | 'RESTOCK' | 'CUSTOMER_EXCHANGE' | 'AUDIT_COUNT' | string;
  diff: number; // negative for loss/deduction, positive for restock/overage
  beforeStock?: number;
  finalStock: number;
  reason: 'damaged' | 'audit' | 'shipment' | 'return' | 'exchange' | 'restock' | 'expired' | 'broken' | 'loss' | string;
  costPrice: number;
  sellingPrice: number;
  capitalLoss: number; // Math.abs(diff) * costPrice when diff < 0
  revenueLoss: number; // Math.abs(diff) * sellingPrice when diff < 0
  referenceNo?: string; // PO number, RMA number, Audit code
  supplier?: string; // For restock
  customerName?: string; // For customer replacement
  customerPhone?: string; // For customer replacement
  orderNumber?: string; // Related order number
  operatorName?: string; // Staff/Admin who logged the record
  notes?: string;
  createdAt: string;
}

export const INITIAL_DEMO_ADJUSTMENTS: StockAdjustmentItem[] = [
  {
    id: 'adj_demo_inbound_1',
    productId: 'p_demo_1',
    productName: 'iPhone 15 Pro Max (256GB Titanium)',
    productSku: 'IP15PM-256-TI',
    type: 'RESTOCK',
    diff: 10,
    beforeStock: 5,
    finalStock: 15,
    reason: 'restock',
    costPrice: 1050,
    sellingPrice: 1199,
    capitalLoss: 0,
    revenueLoss: 0,
    referenceNo: 'PO-2026-0901',
    supplier: 'Apple Authorized Distributor (KH)',
    operatorName: 'Mao Sokhun (Admin)',
    notes: 'ទំនិញនាំចូលថ្មីតាមជើងហោះហើរ (New shipment arrived via air freight)',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'adj_demo_1',
    productId: 'p_demo_1',
    productName: 'iPhone 15 Pro Max (256GB Titanium)',
    productSku: 'IP15PM-256-TI',
    type: 'DAMAGED',
    diff: -1,
    beforeStock: 15,
    finalStock: 14,
    reason: 'damaged',
    costPrice: 1050,
    sellingPrice: 1199,
    capitalLoss: 1050,
    revenueLoss: 1199,
    referenceNo: 'INC-2026-088',
    operatorName: 'Mao Sokhun (Admin)',
    notes: 'បែកអេក្រង់ពេលដឹកជញ្ជូនចូលស្តុក (Screen cracked during warehouse transit)',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'adj_demo_exchange_1',
    productId: 'p_demo_2',
    productName: 'Sony WH-1000XM5 Wireless Headphones',
    productSku: 'SONY-WH1000XM5-BLK',
    type: 'CUSTOMER_EXCHANGE',
    diff: -1,
    beforeStock: 11,
    finalStock: 10,
    reason: 'exchange',
    costPrice: 280,
    sellingPrice: 349,
    capitalLoss: 280,
    revenueLoss: 349,
    referenceNo: 'RMA-2026-0042',
    customerName: 'Chea Vichea',
    customerPhone: '012 889 900',
    orderNumber: 'ORD-MTV3IQB1-03983B',
    operatorName: 'Staff Lyhour',
    notes: 'ដូរកាសថ្មីជូនអតិថិជនព្រោះកាសចាស់សាកថ្មមិនចូល (Warranty exchange: battery charging issue)',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'adj_demo_2',
    productId: 'p_demo_2',
    productName: 'Sony WH-1000XM5 Wireless Headphones',
    productSku: 'SONY-WH1000XM5-BLK',
    type: 'DAMAGED',
    diff: -2,
    beforeStock: 10,
    finalStock: 8,
    reason: 'damaged',
    costPrice: 280,
    sellingPrice: 349,
    capitalLoss: 560,
    revenueLoss: 698,
    referenceNo: 'INC-2026-079',
    operatorName: 'Mao Sokhun (Admin)',
    notes: 'ប្រអប់សើមទឹកភ្លៀង ខូចគ្រឿងអេឡិចត្រូនិច (Water damaged packaging and circuitry)',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'adj_demo_3',
    productId: 'p_demo_3',
    productName: 'MacBook Air M2 13.6" (Midnight)',
    productSku: 'MBA-M2-MDN-256',
    type: 'AUDIT_COUNT',
    diff: -1,
    beforeStock: 6,
    finalStock: 5,
    reason: 'audit',
    costPrice: 880,
    sellingPrice: 999,
    capitalLoss: 880,
    revenueLoss: 999,
    referenceNo: 'AUD-2026-09A',
    operatorName: 'Mao Sokhun (Admin)',
    notes: 'រាប់ស្តុកចុងខែបាត់ ១ គ្រឿង (Missing during inventory count audit reconciliation)',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

const STORAGE_KEY = 'admin_stock_adjustments';

export function getStockAdjustments(): StockAdjustmentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
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
    const updated = [item, ...existing.filter((x) => x.id !== item.id)].slice(0, 300);
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

/**
 * Summary for Pure Loss / Damaged Goods (diff < 0)
 */
export function calculateStockLossSummary(items: StockAdjustmentItem[]) {
  return items.reduce(
    (acc, curr) => {
      if (curr.diff < 0) {
        const units = Math.abs(curr.diff);
        acc.totalLossUnits += units;
        acc.totalCapitalLoss += curr.capitalLoss || units * (curr.costPrice || 0);
        acc.totalRevenueLoss += curr.revenueLoss || units * (curr.sellingPrice || 0);
        if (curr.reason === 'damaged' || curr.type === 'DAMAGED') {
          acc.damagedCount += units;
        } else if (curr.reason === 'audit' || curr.type === 'AUDIT_COUNT') {
          acc.auditLossCount += units;
        } else if (curr.reason === 'exchange' || curr.type === 'CUSTOMER_EXCHANGE') {
          acc.exchangeCount += units;
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
      exchangeCount: 0,
      incidentCount: 0,
    }
  );
}

/**
 * Comprehensive Inventory Movements Summary across all 4 pillars
 */
export function calculateInventoryMovementSummary(items: StockAdjustmentItem[]) {
  return items.reduce(
    (acc, curr) => {
      const isRestock = curr.type === 'RESTOCK' || (curr.diff > 0 && curr.reason !== 'audit');
      const isDamage = curr.type === 'DAMAGED' || curr.reason === 'damaged' || curr.reason === 'expired' || curr.reason === 'broken';
      const isExchange = curr.type === 'CUSTOMER_EXCHANGE' || curr.reason === 'exchange' || curr.reason === 'return';
      const isAudit = curr.type === 'AUDIT_COUNT' || curr.reason === 'audit';

      if (isRestock) {
        const units = Math.max(0, curr.diff);
        acc.totalRestockUnits += units;
        acc.totalRestockCost += units * (curr.costPrice || 0);
        acc.restockBatches += 1;
      } else if (isDamage) {
        const units = Math.abs(curr.diff);
        acc.totalDamagedUnits += units;
        acc.totalDamagedCost += curr.capitalLoss || units * (curr.costPrice || 0);
        acc.damageIncidents += 1;
      } else if (isExchange) {
        const units = Math.abs(curr.diff);
        acc.totalExchangedUnits += units;
        acc.totalExchangedCost += units * (curr.costPrice || 0);
        acc.exchangeIncidents += 1;
      } else if (isAudit) {
        acc.totalAuditedItems += 1;
        if (curr.diff !== 0) {
          acc.auditDiscrepancyUnits += Math.abs(curr.diff);
          acc.auditDiscrepancyCost += Math.abs(curr.diff) * (curr.costPrice || 0);
        }
      }

      return acc;
    },
    {
      totalRestockUnits: 0,
      totalRestockCost: 0,
      restockBatches: 0,
      totalDamagedUnits: 0,
      totalDamagedCost: 0,
      damageIncidents: 0,
      totalExchangedUnits: 0,
      totalExchangedCost: 0,
      exchangeIncidents: 0,
      totalAuditedItems: 0,
      auditDiscrepancyUnits: 0,
      auditDiscrepancyCost: 0,
    }
  );
}
