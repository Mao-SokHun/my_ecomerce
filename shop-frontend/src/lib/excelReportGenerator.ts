import ExcelJS from 'exceljs';
import { Order, Product, Category } from '@/types';
import { StockAdjustmentItem } from '@/lib/stockLossStorage';

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface ExcelReportOptions {
  period: ReportPeriod;
  dateRange: {
    start: Date;
    end: Date;
    label: string;
  };
  orders: Order[];
  products: Product[];
  categories?: Category[];
  adjustments?: StockAdjustmentItem[];
  shopInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  language?: 'km' | 'en' | 'zh';
  includeSheets?: {
    summary?: boolean;
    orders?: boolean;
    topProducts?: boolean;
    inventory?: boolean;
    stockLoss?: boolean;
  };
}

// Styling Constants
const FONT_FAMILY = 'Segoe UI';
const COLOR_HEADER_BG = '0F172A'; // Deep Navy Slate 900
const COLOR_SUBHEADER_BG = '1E293B'; // Slate 800
const COLOR_ACCENT_EMERALD = '047857'; // Emerald 700
const COLOR_ACCENT_INDIGO = '4338CA'; // Indigo 700
const COLOR_TH_BG = '1E293B'; // Table header dark background
const COLOR_ZEBRA_ODD = 'F8FAFC'; // Very light gray slate 50
const COLOR_ZEBRA_EVEN = 'FFFFFF';
const COLOR_BORDER = 'CBD5E1'; // Slate 300
const COLOR_TOTAL_BG = 'F1F5F9'; // Slate 100

// Helper to format currency number
const FORMAT_CURRENCY = '$#,##0.00';
const FORMAT_INTEGER = '#,##0';
const FORMAT_PERCENT = '0.0%';

export async function generateEcommerceExcelReport(options: ExcelReportOptions): Promise<void> {
  const {
    period,
    dateRange,
    orders,
    products,
    categories = [],
    shopInfo = {
      name: 'SH-Shop — Premium E-Commerce Platform',
      phone: '076 4944 390 / 097 4944 390',
      email: 'sokhunmao390@gmail.com',
      address: 'Phnom Penh, Cambodia',
    },
    language = 'km',
    includeSheets = { summary: true, orders: true, topProducts: true, inventory: true },
  } = options;

  const isKhmer = language === 'km';

  // 1. Filter orders within the selected date range
  const filteredOrders = orders.filter((o) => {
    const oDate = new Date(o.createdAt);
    return oDate >= dateRange.start && oDate <= dateRange.end;
  });

  // Category Map for fast lookup
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => {
    categoryMap.set(c.id, c.name);
  });

  // Product Map for fast lookup of cost price
  const productMap = new Map<string, Product>();
  products.forEach((p) => {
    productMap.set(p.id, p);
  });

  // Calculate high-level financial metrics
  let totalGrossRevenue = 0;
  let totalCostOfGoodsSold = 0;
  let totalUnitsSold = 0;
  let completedOrdersCount = 0;

  // Order item aggregation for Top Products
  const productSalesMap = new Map<
    string,
    {
      id: string;
      name: string;
      category: string;
      unitsSold: number;
      revenue: number;
      cost: number;
      price: number;
      costPrice: number;
    }
  >();

  // Process filtered orders
  filteredOrders.forEach((order) => {
    const isCancelled = order.status === 'CANCELLED';
    const isCompleted = order.status === 'DELIVERED' || order.paymentStatus === 'PAID';

    if (!isCancelled) {
      totalGrossRevenue += order.total || 0;
      if (isCompleted) completedOrdersCount++;

      // Compute items cost & top products
      order.items?.forEach((item) => {
        const qty = item.quantity || 1;
        const prod = productMap.get(item.productId);
        const itemCostPrice = prod?.costPrice || 0;
        const itemSellingPrice = item.price || prod?.price || 0;
        const itemTotalCost = itemCostPrice * qty;
        const itemTotalRevenue = itemSellingPrice * qty;

        totalCostOfGoodsSold += itemTotalCost;
        totalUnitsSold += qty;

        const prodKey = item.productId || item.name;
        const existing = productSalesMap.get(prodKey) || {
          id: item.productId || '',
          name: item.name,
          category: prod?.category?.name || categoryMap.get(prod?.categoryId || '') || 'General',
          unitsSold: 0,
          revenue: 0,
          cost: 0,
          price: itemSellingPrice,
          costPrice: itemCostPrice,
        };

        existing.unitsSold += qty;
        existing.revenue += itemTotalRevenue;
        existing.cost += itemTotalCost;
        productSalesMap.set(prodKey, existing);
      });
    }
  });

  const totalGrossProfit = totalGrossRevenue - totalCostOfGoodsSold;
  const profitMarginPct = totalGrossRevenue > 0 ? (totalGrossProfit / totalGrossRevenue) : 0;
  const averageOrderValue = filteredOrders.length > 0 ? totalGrossRevenue / filteredOrders.length : 0;
  const successRatePct = filteredOrders.length > 0 ? completedOrdersCount / filteredOrders.length : 0;

  // Initialize ExcelJS Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SH-Shop Enterprise System';
  workbook.lastModifiedBy = 'Admin User';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Common Border Style
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: COLOR_BORDER } },
    left: { style: 'thin', color: { argb: COLOR_BORDER } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
    right: { style: 'thin', color: { argb: COLOR_BORDER } },
  };

  // Helper: Apply Enterprise Header Banner
  const addEnterpriseHeader = (
    sheet: ExcelJS.Worksheet,
    title: string,
    subtitle: string,
    endColLetter: string = 'H'
  ) => {
    // Row 1: Brand Banner
    sheet.mergeCells(`A1:${endColLetter}1`);
    const r1 = sheet.getCell('A1');
    r1.value = (shopInfo.name || 'SH-Shop').toUpperCase();
    r1.font = { name: FONT_FAMILY, size: 16, bold: true, color: { argb: 'FFFFFF' } };
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 36;

    // Row 2: Report Subtitle
    sheet.mergeCells(`A2:${endColLetter}2`);
    const r2 = sheet.getCell('A2');
    r2.value = subtitle.toUpperCase();
    r2.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: 'E2E8F0' } };
    r2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER_BG } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 26;

    // Row 3: Metadata info
    sheet.mergeCells(`A3:${endColLetter}3`);
    const r3 = sheet.getCell('A3');
    const generatedTime = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh' });
    r3.value = `📅 Period: ${dateRange.label}   |   🕒 Generated: ${generatedTime} (ICT)   |   💵 Currency: USD ($)   |   🏢 Store: SH-Shop`;
    r3.font = { name: FONT_FAMILY, size: 9, italic: true, color: { argb: '475569' } };
    r3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
    r3.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(3).height = 20;

    sheet.addRow([]); // Blank separator row 4
  };

  // ==========================================
  // SHEET 1: 📊 EXECUTIVE SUMMARY
  // ==========================================
  if (includeSheets.summary !== false) {
    const summarySheet = workbook.addWorksheet('📊 Executive Summary', {
      views: [{ showGridLines: true }],
    });

    addEnterpriseHeader(
      summarySheet,
      'SH-Shop',
      isKhmer
        ? `របាយការណ៍សង្ខេបប្រតិបត្តិការលក់ និងហិរញ្ញវត្ថុ (${dateRange.label})`
        : `Executive Sales & Financial Performance (${dateRange.label})`,
      'H'
    );

    // Section 1: Executive KPI Cards
    const kpiSectionRow = summarySheet.addRow(['EXECUTIVE KEY PERFORMANCE INDICATORS (KPIs)']);
    summarySheet.mergeCells(`A5:H5`);
    const kpiTitleCell = summarySheet.getCell('A5');
    kpiTitleCell.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: 'FFFFFF' } };
    kpiTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACCENT_INDIGO } };
    kpiTitleCell.alignment = { vertical: 'middle', indent: 1 };
    summarySheet.getRow(5).height = 24;

    // KPI Card Headers (Row 6)
    const kpiHeaders = [
      isKhmer ? 'ចំណូលលក់សរុប (Gross Revenue)' : 'Gross Revenue',
      isKhmer ? 'ថ្លៃដើមទំនិញ (COGS)' : 'Cost of Goods (COGS)',
      isKhmer ? 'ប្រាក់ចំណេញដុល (Gross Profit)' : 'Gross Profit',
      isKhmer ? 'ភាគរយចំណេញ (Margin %)' : 'Profit Margin %',
      isKhmer ? 'ការកុម្ម៉ង់សរុប (Total Orders)' : 'Total Orders',
      isKhmer ? 'អត្រាជោគជ័យ (Success Rate)' : 'Success Rate %',
      isKhmer ? 'ចំនួនលក់ចេញ (Units Sold)' : 'Units Sold',
      isKhmer ? 'តម្លៃជាមធ្យម/Order (AOV)' : 'Average Order Value',
    ];

    summarySheet.addRow([]); // Row 6 gap

    // Row 7: KPI Labels & Values Grid
    const rowCard1 = summarySheet.addRow([
      isKhmer ? 'ចំណូលលក់សរុប (Gross Revenue)' : 'Gross Sales Revenue',
      totalGrossRevenue,
      '',
      isKhmer ? 'ការកុម្ម៉ង់សរុប (Total Orders)' : 'Total Orders Count',
      filteredOrders.length,
      '',
      isKhmer ? 'ចំនួនទំនិញលក់ចេញ (Units Sold)' : 'Total Units Sold',
      totalUnitsSold,
    ]);
    summarySheet.getRow(7).height = 22;

    const rowCard2 = summarySheet.addRow([
      isKhmer ? 'ថ្លៃដើមទំនិញលក់ចេញ (COGS)' : 'Cost of Goods Sold (COGS)',
      totalCostOfGoodsSold,
      '',
      isKhmer ? 'ការកុម្ម៉ង់ជោគជ័យ (Completed)' : 'Completed Orders',
      completedOrdersCount,
      '',
      isKhmer ? 'អត្រាជោគជ័យ (Success Rate)' : 'Order Success Rate',
      successRatePct,
    ]);
    summarySheet.getRow(8).height = 22;

    const rowCard3 = summarySheet.addRow([
      isKhmer ? 'ប្រាក់ចំណេញដុលសុទ្ធ (Gross Profit)' : 'Gross Profit ($)',
      totalGrossProfit,
      '',
      isKhmer ? 'ភាគរយចំណេញដុល (Margin %)' : 'Profit Margin %',
      profitMarginPct,
      '',
      isKhmer ? 'តម្លៃជាមធ្យមក្នុងមួយ Order' : 'Avg Order Value (AOV)',
      averageOrderValue,
    ]);
    summarySheet.getRow(9).height = 22;

    // Format KPI Grid
    [7, 8, 9].forEach((r) => {
      const row = summarySheet.getRow(r);
      [1, 4, 7].forEach((c) => {
        const labelCell = row.getCell(c);
        labelCell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: '334155' } };
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        labelCell.border = thinBorder;
      });

      // Val 1 (Col B)
      const val1 = row.getCell(2);
      val1.font = { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: r === 9 ? COLOR_ACCENT_EMERALD : '0F172A' } };
      val1.numFmt = FORMAT_CURRENCY;
      val1.alignment = { horizontal: 'right' };
      val1.border = thinBorder;

      // Val 2 (Col E)
      const val2 = row.getCell(5);
      val2.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: '0F172A' } };
      val2.alignment = { horizontal: 'right' };
      val2.border = thinBorder;
      if (r === 8) val2.numFmt = FORMAT_INTEGER;
      if (r === 9) val2.numFmt = FORMAT_PERCENT;

      // Val 3 (Col H)
      const val3 = row.getCell(8);
      val3.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: '0F172A' } };
      val3.alignment = { horizontal: 'right' };
      val3.border = thinBorder;
      if (r === 7) val3.numFmt = FORMAT_INTEGER;
      if (r === 8) val3.numFmt = FORMAT_PERCENT;
      if (r === 9) val3.numFmt = FORMAT_CURRENCY;
    });

    summarySheet.addRow([]); // Row 10 gap

    // Section 2: Order Status Distribution Table
    const statusSectionRow = summarySheet.addRow(['ORDER STATUS BREAKDOWN']);
    summarySheet.mergeCells(`A11:E11`);
    const statusSecCell = summarySheet.getCell('A11');
    statusSecCell.font = { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: 'FFFFFF' } };
    statusSecCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER_BG } };
    summarySheet.getRow(11).height = 22;

    const statusHeaders = [
      isKhmer ? 'ស្ថានភាព (Status)' : 'Status',
      isKhmer ? 'ចំនួន (Count)' : 'Orders Count',
      isKhmer ? 'ភាគរយ (Share)' : 'Percentage',
      isKhmer ? 'ចំណូលសរុប (Total Sales)' : 'Total Sales ($)',
      isKhmer ? 'ស្ថានភាពទូទាត់ទូទៅ' : 'Typical Payment',
    ];
    const shRow = summarySheet.addRow(statusHeaders);
    shRow.height = 20;
    shRow.eachCell((c) => {
      c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
      c.border = thinBorder;
    });

    // Count by status
    const statusStats: Record<string, { count: number; total: number }> = {};
    filteredOrders.forEach((o) => {
      const st = o.status || 'PENDING';
      if (!statusStats[st]) statusStats[st] = { count: 0, total: 0 };
      statusStats[st].count++;
      statusStats[st].total += o.total || 0;
    });

    Object.entries(statusStats).forEach(([st, data]) => {
      const pct = filteredOrders.length > 0 ? data.count / filteredOrders.length : 0;
      const r = summarySheet.addRow([
        st,
        data.count,
        pct,
        data.total,
        st === 'DELIVERED' ? 'PAID' : st === 'CANCELLED' ? 'CANCELLED / REFUNDED' : 'PENDING',
      ]);
      r.height = 19;
      r.getCell(1).font = { name: FONT_FAMILY, size: 9.5, bold: true };
      r.getCell(2).numFmt = FORMAT_INTEGER;
      r.getCell(3).numFmt = FORMAT_PERCENT;
      r.getCell(4).numFmt = FORMAT_CURRENCY;
      r.eachCell((c) => {
        c.border = thinBorder;
      });
    });

    // Set Column Widths for Summary
    summarySheet.columns = [
      { width: 26 },
      { width: 18 },
      { width: 6 },
      { width: 26 },
      { width: 18 },
      { width: 6 },
      { width: 26 },
      { width: 18 },
    ];
  }

  // ==========================================
  // SHEET 2: 📦 ORDERS SALES REPORT
  // ==========================================
  if (includeSheets.orders !== false) {
    const ordersSheet = workbook.addWorksheet('📦 Orders List', {
      views: [{ showGridLines: true }],
    });

    addEnterpriseHeader(
      ordersSheet,
      'SH-Shop',
      isKhmer ? `បញ្ជីការកុម្ម៉ង់លម្អិត (${dateRange.label})` : `Detailed Orders Sales Report (${dateRange.label})`,
      'P'
    );

    // Orders Table Headers
    const orderColHeaders = [
      isKhmer ? 'ល.រ' : 'No.',
      isKhmer ? 'លេខកូដកុម្ម៉ង់' : 'Order ID',
      isKhmer ? 'កាលបរិច្ឆេទ & ម៉ោង' : 'Date & Time',
      isKhmer ? 'ឈ្មោះអតិថិជន' : 'Customer Name',
      isKhmer ? 'លេខទូរស័ព្ទ' : 'Phone Number',
      isKhmer ? 'ទីតាំង / ខេត្ត-ក្រុង' : 'Shipping Province',
      isKhmer ? 'ចំនួនមុខ' : 'Items',
      isKhmer ? 'វិធីសាស្ត្រទូទាត់' : 'Payment Method',
      isKhmer ? 'ស្ថានភាពទូទាត់' : 'Payment Status',
      isKhmer ? 'ស្ថានភាព Order' : 'Order Status',
      isKhmer ? 'ថ្លៃដើមទំនិញ ($)' : 'Est. Cost ($)',
      isKhmer ? 'បញ្ចុះតម្លៃ ($)' : 'Discount ($)',
      isKhmer ? 'ថ្លៃដឹក ($)' : 'Shipping ($)',
      isKhmer ? 'តម្លៃសរុប ($)' : 'Order Total ($)',
      isKhmer ? 'ប្រាក់ចំណេញ ($)' : 'Net Profit ($)',
      isKhmer ? 'ភាគរយចំណេញ' : 'Margin %',
    ];

    const thRow = ordersSheet.addRow(orderColHeaders);
    thRow.height = 26;
    thRow.eachCell((c) => {
      c.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TH_BG } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      c.border = thinBorder;
    });

    const startOrderRowIdx = 6;
    filteredOrders.forEach((order, idx) => {
      // Calculate order cost
      let orderCost = 0;
      order.items?.forEach((i) => {
        const prod = productMap.get(i.productId);
        orderCost += (prod?.costPrice || 0) * (i.quantity || 1);
      });

      const isCancelled = order.status === 'CANCELLED';
      const orderRevenue = isCancelled ? 0 : (order.total || 0);
      const orderProfit = isCancelled ? 0 : Math.max(0, orderRevenue - orderCost);
      const marginPct = orderRevenue > 0 ? (orderProfit / orderRevenue) : 0;

      const orderDateStr = new Date(order.createdAt).toLocaleString('en-GB', {
        timeZone: 'Asia/Phnom_Penh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const customerName = order.address?.name || order.user?.name || 'Walk-in Customer';
      const customerPhone = order.address?.phone || order.user?.phone || 'N/A';
      const province = order.address?.province || order.address?.city || 'Phnom Penh';

      const row = ordersSheet.addRow([
        idx + 1,
        order.orderNumber,
        orderDateStr,
        customerName,
        customerPhone,
        province,
        order.items?.length || 1,
        order.paymentMethod || 'CASH',
        order.paymentStatus || 'PENDING',
        order.status || 'PENDING',
        orderCost,
        order.discount || 0,
        order.shippingCost || 0,
        order.total || 0,
        orderProfit,
        marginPct,
      ]);

      row.height = 20;
      const isOdd = idx % 2 === 1;
      const zebraColor = isOdd ? COLOR_ZEBRA_ODD : COLOR_ZEBRA_EVEN;

      row.eachCell((c, colNumber) => {
        c.font = { name: FONT_FAMILY, size: 9 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
        c.border = thinBorder;

        // Alignments & Number formats
        if (colNumber === 1) c.alignment = { horizontal: 'center' };
        if (colNumber === 2) {
          c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: '1D4ED8' } };
        }
        if ([7].includes(colNumber)) {
          c.alignment = { horizontal: 'center' };
          c.numFmt = FORMAT_INTEGER;
        }
        if ([8, 9, 10].includes(colNumber)) {
          c.alignment = { horizontal: 'center' };
        }
        if ([11, 12, 13, 14, 15].includes(colNumber)) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_CURRENCY;
          if (colNumber === 14) c.font = { name: FONT_FAMILY, size: 9, bold: true };
          if (colNumber === 15) {
            c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_ACCENT_EMERALD } };
          }
        }
        if (colNumber === 16) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_PERCENT;
        }
      });
    });

    // Summary / Total Row at bottom
    const lastOrderRowIdx = startOrderRowIdx + filteredOrders.length - 1;
    if (filteredOrders.length > 0) {
      const totalRow = ordersSheet.addRow([
        '',
        isKhmer ? 'សរុបរួម (TOTAL)' : 'TOTAL SUMMARY',
        '',
        '',
        '',
        '',
        { formula: `SUM(G${startOrderRowIdx}:G${lastOrderRowIdx})` },
        '',
        '',
        '',
        { formula: `SUM(K${startOrderRowIdx}:K${lastOrderRowIdx})` },
        { formula: `SUM(L${startOrderRowIdx}:L${lastOrderRowIdx})` },
        { formula: `SUM(M${startOrderRowIdx}:M${lastOrderRowIdx})` },
        { formula: `SUM(N${startOrderRowIdx}:N${lastOrderRowIdx})` },
        { formula: `SUM(O${startOrderRowIdx}:O${lastOrderRowIdx})` },
        { formula: `IF(N${lastOrderRowIdx + 1}>0, O${lastOrderRowIdx + 1}/N${lastOrderRowIdx + 1}, 0)` },
      ]);

      totalRow.height = 24;
      totalRow.eachCell((c, colNumber) => {
        c.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: '0F172A' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
        c.border = {
          top: { style: 'thin', color: { argb: '94A3B8' } },
          bottom: { style: 'double', color: { argb: '0F172A' } },
          left: { style: 'thin', color: { argb: COLOR_BORDER } },
          right: { style: 'thin', color: { argb: COLOR_BORDER } },
        };

        if (colNumber === 7) {
          c.alignment = { horizontal: 'center' };
          c.numFmt = FORMAT_INTEGER;
        }
        if ([11, 12, 13, 14, 15].includes(colNumber)) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_CURRENCY;
        }
        if (colNumber === 16) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_PERCENT;
        }
      });
    }

    // Set Orders Column Widths
    ordersSheet.columns = [
      { width: 6 }, // No
      { width: 22 }, // Order ID
      { width: 18 }, // Date Time
      { width: 22 }, // Customer Name
      { width: 16 }, // Phone
      { width: 16 }, // Province
      { width: 8 }, // Items
      { width: 16 }, // Payment Method
      { width: 15 }, // Payment Status
      { width: 15 }, // Order Status
      { width: 15 }, // Cost
      { width: 13 }, // Discount
      { width: 13 }, // Shipping
      { width: 16 }, // Total
      { width: 16 }, // Profit
      { width: 12 }, // Margin %
    ];
  }

  // ==========================================
  // SHEET 3: 🏷️ TOP SELLING PRODUCTS
  // ==========================================
  if (includeSheets.topProducts !== false) {
    const productsSheet = workbook.addWorksheet('🏷️ Top Products', {
      views: [{ showGridLines: true }],
    });

    addEnterpriseHeader(
      productsSheet,
      'SH-Shop',
      isKhmer ? `ចំណាត់ថ្នាក់មុខទំនិញលក់ដាច់បំផុត (${dateRange.label})` : `Top Selling Products Performance (${dateRange.label})`,
      'J'
    );

    const prodHeaders = [
      isKhmer ? 'ចំណាត់ថ្នាក់' : 'Rank',
      isKhmer ? 'ឈ្មោះទំនិញ' : 'Product Name',
      isKhmer ? 'ប្រភេទ' : 'Category',
      isKhmer ? 'ចំនួនលក់ (Units)' : 'Units Sold',
      isKhmer ? 'ថ្លៃដើម ($)' : 'Unit Cost ($)',
      isKhmer ? 'តម្លៃលក់ ($)' : 'Unit Price ($)',
      isKhmer ? 'ចំណូលសរុប ($)' : 'Total Revenue ($)',
      isKhmer ? 'ថ្លៃដើមសរុប ($)' : 'Total Cost ($)',
      isKhmer ? 'ប្រាក់ចំណេញ ($)' : 'Total Profit ($)',
      isKhmer ? 'ភាគរយចំណេញ' : 'Margin %',
    ];

    const pthRow = productsSheet.addRow(prodHeaders);
    pthRow.height = 26;
    pthRow.eachCell((c) => {
      c.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TH_BG } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = thinBorder;
    });

    // Sort products by units sold descending
    const sortedProducts = Array.from(productSalesMap.values()).sort((a, b) => b.unitsSold - a.unitsSold);

    const startProdRowIdx = 6;
    sortedProducts.forEach((item, idx) => {
      const profit = Math.max(0, item.revenue - item.cost);
      const margin = item.revenue > 0 ? (profit / item.revenue) : 0;

      const r = productsSheet.addRow([
        idx + 1,
        item.name,
        item.category,
        item.unitsSold,
        item.costPrice,
        item.price,
        item.revenue,
        item.cost,
        profit,
        margin,
      ]);

      r.height = 20;
      const isOdd = idx % 2 === 1;
      const zebraColor = isOdd ? COLOR_ZEBRA_ODD : COLOR_ZEBRA_EVEN;

      r.eachCell((c, colNumber) => {
        c.font = { name: FONT_FAMILY, size: 9 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
        c.border = thinBorder;

        if (colNumber === 1) c.alignment = { horizontal: 'center' };
        if (colNumber === 2) c.font = { name: FONT_FAMILY, size: 9, bold: true };
        if (colNumber === 4) {
          c.alignment = { horizontal: 'center' };
          c.numFmt = FORMAT_INTEGER;
        }
        if ([5, 6, 7, 8, 9].includes(colNumber)) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_CURRENCY;
          if (colNumber === 7) c.font = { name: FONT_FAMILY, size: 9, bold: true };
          if (colNumber === 9) {
            c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_ACCENT_EMERALD } };
          }
        }
        if (colNumber === 10) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_PERCENT;
        }
      });
    });

    // Total row
    const lastProdRowIdx = startProdRowIdx + sortedProducts.length - 1;
    if (sortedProducts.length > 0) {
      const pTotalRow = productsSheet.addRow([
        '',
        isKhmer ? 'សរុបរួម' : 'TOTAL',
        '',
        { formula: `SUM(D${startProdRowIdx}:D${lastProdRowIdx})` },
        '',
        '',
        { formula: `SUM(G${startProdRowIdx}:G${lastProdRowIdx})` },
        { formula: `SUM(H${startProdRowIdx}:H${lastProdRowIdx})` },
        { formula: `SUM(I${startProdRowIdx}:I${lastProdRowIdx})` },
        { formula: `IF(G${lastProdRowIdx + 1}>0, I${lastProdRowIdx + 1}/G${lastProdRowIdx + 1}, 0)` },
      ]);

      pTotalRow.height = 24;
      pTotalRow.eachCell((c, colNumber) => {
        c.font = { name: FONT_FAMILY, size: 10, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
        c.border = {
          top: { style: 'thin', color: { argb: '94A3B8' } },
          bottom: { style: 'double', color: { argb: '0F172A' } },
          left: { style: 'thin', color: { argb: COLOR_BORDER } },
          right: { style: 'thin', color: { argb: COLOR_BORDER } },
        };

        if (colNumber === 4) {
          c.alignment = { horizontal: 'center' };
          c.numFmt = FORMAT_INTEGER;
        }
        if ([7, 8, 9].includes(colNumber)) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_CURRENCY;
        }
        if (colNumber === 10) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_PERCENT;
        }
      });
    }

    productsSheet.columns = [
      { width: 8 }, // Rank
      { width: 34 }, // Name
      { width: 18 }, // Category
      { width: 14 }, // Units Sold
      { width: 14 }, // Cost
      { width: 14 }, // Price
      { width: 18 }, // Revenue
      { width: 16 }, // Total Cost
      { width: 18 }, // Profit
      { width: 13 }, // Margin %
    ];
  }

  // ==========================================
  // SHEET 4: 🏬 INVENTORY & CAPITAL VALUATION
  // ==========================================
  if (includeSheets.inventory !== false) {
    const invSheet = workbook.addWorksheet('🏬 Inventory Valuation', {
      views: [{ showGridLines: true }],
    });

    addEnterpriseHeader(
      invSheet,
      'SH-Shop',
      isKhmer ? 'របាយការណ៍ស្តុក និងតម្លៃដើមទុនបច្ចុប្បន្ន' : 'Current Stock & Inventory Capital Valuation',
      'J'
    );

    const invHeaders = [
      isKhmer ? 'ល.រ' : 'No.',
      isKhmer ? 'ឈ្មោះទំនិញ' : 'Product Name',
      isKhmer ? 'ប្រភេទ' : 'Category',
      isKhmer ? 'ចំនួនក្នុងស្តុក' : 'Current Stock',
      isKhmer ? 'ស្ថានភាពស្តុក' : 'Stock Status',
      isKhmer ? 'ថ្លៃដើម ($)' : 'Unit Cost ($)',
      isKhmer ? 'តម្លៃលក់ ($)' : 'Selling Price ($)',
      isKhmer ? 'ដើមទុនក្នុងស្តុក ($)' : 'Inventory Capital ($)',
      isKhmer ? 'តម្លៃលក់សរុប ($)' : 'Potential Retail ($)',
      isKhmer ? 'ចំណេញរំពឹងទុក ($)' : 'Potential Profit ($)',
    ];

    const ithRow = invSheet.addRow(invHeaders);
    ithRow.height = 26;
    ithRow.eachCell((c) => {
      c.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TH_BG } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = thinBorder;
    });

    const startInvRowIdx = 6;
    products.forEach((p, idx) => {
      const stock = p.stock || 0;
      const cost = p.costPrice || 0;
      const price = p.price || 0;
      const totalCostVal = stock * cost;
      const totalRetailVal = stock * price;
      const potentialProfit = Math.max(0, totalRetailVal - totalCostVal);

      let status = 'IN STOCK';
      if (stock <= 0) status = 'OUT OF STOCK';
      else if (stock <= 5) status = 'LOW STOCK';

      const r = invSheet.addRow([
        idx + 1,
        p.name,
        p.category?.name || categoryMap.get(p.categoryId) || 'General',
        stock,
        status,
        cost,
        price,
        totalCostVal,
        totalRetailVal,
        potentialProfit,
      ]);

      r.height = 20;
      const isOdd = idx % 2 === 1;
      const zebraColor = isOdd ? COLOR_ZEBRA_ODD : COLOR_ZEBRA_EVEN;

      r.eachCell((c, colNumber) => {
        c.font = { name: FONT_FAMILY, size: 9 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
        c.border = thinBorder;

        if (colNumber === 1) c.alignment = { horizontal: 'center' };
        if (colNumber === 2) c.font = { name: FONT_FAMILY, size: 9, bold: true };
        if (colNumber === 4) {
          c.alignment = { horizontal: 'center' };
          c.numFmt = FORMAT_INTEGER;
        }
        if (colNumber === 5) {
          c.alignment = { horizontal: 'center' };
          if (status === 'OUT OF STOCK') {
            c.font = { name: FONT_FAMILY, size: 8.5, bold: true, color: { argb: 'DC2626' } };
          } else if (status === 'LOW STOCK') {
            c.font = { name: FONT_FAMILY, size: 8.5, bold: true, color: { argb: 'D97706' } };
          } else {
            c.font = { name: FONT_FAMILY, size: 8.5, bold: true, color: { argb: '16A34A' } };
          }
        }
        if ([6, 7, 8, 9, 10].includes(colNumber)) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_CURRENCY;
          if (colNumber === 8) c.font = { name: FONT_FAMILY, size: 9, bold: true };
          if (colNumber === 10) {
            c.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_ACCENT_EMERALD } };
          }
        }
      });
    });

    const lastInvRowIdx = startInvRowIdx + products.length - 1;
    if (products.length > 0) {
      const iTotalRow = invSheet.addRow([
        '',
        isKhmer ? 'សរុបរួម' : 'TOTAL',
        '',
        { formula: `SUM(D${startInvRowIdx}:D${lastInvRowIdx})` },
        '',
        '',
        '',
        { formula: `SUM(H${startInvRowIdx}:H${lastInvRowIdx})` },
        { formula: `SUM(I${startInvRowIdx}:I${lastInvRowIdx})` },
        { formula: `SUM(J${startInvRowIdx}:J${lastInvRowIdx})` },
      ]);

      iTotalRow.height = 24;
      iTotalRow.eachCell((c, colNumber) => {
        c.font = { name: FONT_FAMILY, size: 10, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
        c.border = {
          top: { style: 'thin', color: { argb: '94A3B8' } },
          bottom: { style: 'double', color: { argb: '0F172A' } },
          left: { style: 'thin', color: { argb: COLOR_BORDER } },
          right: { style: 'thin', color: { argb: COLOR_BORDER } },
        };

        if (colNumber === 4) {
          c.alignment = { horizontal: 'center' };
          c.numFmt = FORMAT_INTEGER;
        }
        if ([8, 9, 10].includes(colNumber)) {
          c.alignment = { horizontal: 'right' };
          c.numFmt = FORMAT_CURRENCY;
        }
      });
    }

    invSheet.columns = [
      { width: 6 }, // No
      { width: 34 }, // Name
      { width: 18 }, // Category
      { width: 14 }, // Stock
      { width: 16 }, // Status
      { width: 14 }, // Unit Cost
      { width: 14 }, // Unit Price
      { width: 22 }, // Inventory Capital
      { width: 20 }, // Potential Retail
      { width: 20 }, // Potential Profit
    ];
  }

  // ==========================================
  // SHEET 5: STOCK LOSS & DAMAGE AUDIT
  // ==========================================
  if (includeSheets.stockLoss !== false && options.adjustments && options.adjustments.length > 0) {
    const lossItems = options.adjustments.filter(
      (item) => item.diff < 0 || item.reason === 'damaged' || item.reason === 'broken' || item.reason === 'expired' || item.type === 'DAMAGED'
    );
    if (lossItems.length > 0) {
    const lossSheet = workbook.addWorksheet(
      isKhmer ? 'ការខាតបង់ & ខូចខាត' : 'Loss & Damage',
      {
        views: [{ showGridLines: true }],
        properties: { tabColor: { argb: 'E11D48' } }, // Rose 600
      }
    );

    // Title banner
    lossSheet.mergeCells('A1:K1');
    const bTitle = lossSheet.getCell('A1');
    bTitle.value = isKhmer
      ? '⚠️ របាយការណ៍ការខាតបង់ និងខូចខាតទំនិញក្នុងស្តុក (STOCK LOSS & DAMAGED GOODS AUDIT)'
      : '⚠️ STOCK LOSS & DAMAGED INVENTORY AUDIT REPORT';
    bTitle.font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: 'FFFFFF' } };
    bTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '9F1239' } }; // Rose 900
    bTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    lossSheet.getRow(1).height = 34;

    // Subtitle
    lossSheet.mergeCells('A2:K2');
    const bSub = lossSheet.getCell('A2');
    bSub.value = `${dateRange.label} | ${shopInfo.name}`;
    bSub.font = { name: FONT_FAMILY, size: 10, italic: true, color: { argb: 'FFFFFF' } };
    bSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BE123C' } };
    bSub.alignment = { vertical: 'middle', horizontal: 'center' };
    lossSheet.getRow(2).height = 20;

    // Empty row
    lossSheet.getRow(3).height = 10;

    // Table Headers
    const lossHeaders = isKhmer
      ? ['ល.រ', 'កាលបរិច្ឆេទ', 'ឈ្មោះទំនិញ', 'មូលហេតុ', 'ចំនួនកាត់ចេញ', 'ថ្លៃដើម ($)', 'តម្លៃលក់ ($)', 'ខាតដើមទុន ($)', 'បាត់ចំណូល ($)', 'ស្តុកនៅសល់', 'ចំណាំ / ការពិពណ៌នា']
      : ['No', 'Date', 'Product Name', 'Reason', 'Deducted Qty', 'Unit Cost ($)', 'Unit Price ($)', 'Capital Loss ($)', 'Lost Revenue ($)', 'Stock Left', 'Incident Notes'];

    const hRow = lossSheet.addRow(lossHeaders);
    hRow.height = 26;
    hRow.eachCell((cell) => {
      cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '881337' } }; // Deep Burgundy
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFFFFF' } },
        bottom: { style: 'medium', color: { argb: 'FFFFFF' } },
        left: { style: 'thin', color: { argb: '9F1239' } },
        right: { style: 'thin', color: { argb: '9F1239' } },
      };
    });

    const startLossRow = 5;
    lossItems.forEach((item, idx) => {
      const isLoss = item.diff < 0;
      const qtyUnits = Math.abs(item.diff);
      const reasonLabel =
        item.reason === 'damaged'
          ? (isKhmer ? '⚠️ ខូចខាត/បាត់បង់' : 'Damaged')
          : item.reason === 'audit'
          ? (isKhmer ? '🔍 រាប់ស្តុកបាត់' : 'Audit')
          : item.reason === 'return'
          ? (isKhmer ? '🔄 អតិថិជនប្តូរ' : 'Return')
          : (isKhmer ? '📦 នាំចូល' : 'Shipment');

      const dRow = lossSheet.addRow([
        idx + 1,
        `${new Date(item.createdAt).toLocaleDateString()} ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        item.productName,
        reasonLabel,
        isLoss ? -qtyUnits : qtyUnits,
        item.costPrice || 0,
        item.sellingPrice || 0,
        item.capitalLoss || (isLoss ? qtyUnits * (item.costPrice || 0) : 0),
        item.revenueLoss || (isLoss ? qtyUnits * (item.sellingPrice || 0) : 0),
        item.finalStock,
        item.notes || '-',
      ]);
      dRow.height = 22;

      const isOdd = idx % 2 === 1;
      dRow.eachCell((c, colNum) => {
        c.font = { name: FONT_FAMILY, size: 10 };
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isOdd ? 'FFF1F2' : 'FFFFFF' }, // Rose 50 tint
        };
        c.border = {
          top: { style: 'thin', color: { argb: 'FECDD3' } },
          bottom: { style: 'thin', color: { argb: 'FECDD3' } },
          left: { style: 'thin', color: { argb: 'FECDD3' } },
          right: { style: 'thin', color: { argb: 'FECDD3' } },
        };

        if (colNum === 1 || colNum === 2 || colNum === 4 || colNum === 10) {
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNum === 5) {
          c.alignment = { horizontal: 'center', vertical: 'middle' };
          c.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: isLoss ? 'BE123C' : '047857' } };
        } else if ([6, 7].includes(colNum)) {
          c.alignment = { horizontal: 'right', vertical: 'middle' };
          c.numFmt = FORMAT_CURRENCY;
        } else if (colNum === 8) {
          c.alignment = { horizontal: 'right', vertical: 'middle' };
          c.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'BE123C' } };
          c.numFmt = FORMAT_CURRENCY;
        } else if (colNum === 9) {
          c.alignment = { horizontal: 'right', vertical: 'middle' };
          c.numFmt = FORMAT_CURRENCY;
        }
      });
    });

    // Total Loss Summary Row (Note: Deducted Qty is deliberately left empty, only summarizing financial capital & revenue loss)
    const totalRowIndex = startLossRow + lossItems.length;
    const tRow = lossSheet.addRow([
      '',
      isKhmer ? 'សរុបការខាតបង់' : 'TOTAL LOSS',
      '',
      '',
      '', // Column E: No sum formula for deducted quantity
      '',
      '',
      { formula: `SUM(H${startLossRow}:H${totalRowIndex - 1})` },
      { formula: `SUM(I${startLossRow}:I${totalRowIndex - 1})` },
      '',
      '',
    ]);
    tRow.height = 26;
    tRow.eachCell((c, colNum) => {
      c.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: '881337' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4E6' } }; // Rose 100
      c.border = {
        top: { style: 'thin', color: { argb: 'F43F5E' } },
        bottom: { style: 'double', color: { argb: '881337' } },
        left: { style: 'thin', color: { argb: 'F43F5E' } },
        right: { style: 'thin', color: { argb: 'F43F5E' } },
      };
      if ([8, 9].includes(colNum)) {
        c.alignment = { horizontal: 'right' };
        c.numFmt = FORMAT_CURRENCY;
      }
    });

    lossSheet.columns = [
      { width: 6 },  // No
      { width: 14 }, // Date
      { width: 34 }, // Product Name
      { width: 18 }, // Reason
      { width: 14 }, // Deducted Qty
      { width: 14 }, // Unit Cost
      { width: 14 }, // Unit Price
      { width: 18 }, // Capital Loss
      { width: 18 }, // Revenue Loss
      { width: 14 }, // Stock Left
      { width: 30 }, // Notes
    ];
    }
  }

  // ==========================================
  // Trigger Browser File Download
  // ==========================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const nowStr = new Date().toISOString().split('T')[0];
  let fileName = `SH-Shop_Report_${nowStr}.xlsx`;
  if (period === 'weekly') {
    fileName = `SH-Shop_Weekly_Report_${nowStr}.xlsx`;
  } else if (period === 'monthly') {
    const monthStr = dateRange.start.toISOString().slice(0, 7);
    fileName = `SH-Shop_Monthly_Report_${monthStr}.xlsx`;
  } else if (period === 'yearly') {
    const yearStr = dateRange.start.getFullYear();
    fileName = `SH-Shop_Yearly_Report_${yearStr}.xlsx`;
  } else {
    fileName = `SH-Shop_Custom_Report_${nowStr}.xlsx`;
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
