'use client';

import { Order } from '@/types';
import { formatPrice, formatKhrPrice } from '@/lib/utils';

// Synthesize pleasant POS sound alert using Web Audio API
export function playNewOrderChime() {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [
      { freq: 523.25, time: 0, dur: 0.15 },    // C5
      { freq: 659.25, time: 0.12, dur: 0.15 }, // E5
      { freq: 783.99, time: 0.24, dur: 0.3 },  // G5
      { freq: 1046.5, time: 0.38, dur: 0.45 }, // C6
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.freq;

      gain.gain.setValueAtTime(0, ctx.currentTime + n.time);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.time + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.dur);
    });
  } catch {
    // Audio context may require initial user gesture
  }
}

export function generateThermalReceiptHtml(
  order: Order,
  paperWidth: '80mm' | '58mm' = '80mm',
  shopInfo?: { shopName?: string; supportPhone?: string; shopAddress?: string; footerNote?: string }
): string {
  const is80 = paperWidth === '80mm';
  const widthPx = is80 ? '72mm' : '48mm';
  const fontSize = is80 ? '11px' : '9.5px';
  const titleSize = is80 ? '17px' : '14px';

  const shopName = shopInfo?.shopName || 'SH-Shop';
  const shopPhone = shopInfo?.supportPhone || '097 494 4390 / 088 545 9115';
  const shopAddress = shopInfo?.shopAddress || 'Phnom Penh, Cambodia';
  const footerNote = shopInfo?.footerNote || '';

  const dateStr = new Date(order.createdAt).toLocaleString('en-GB', {
    timeZone: 'Asia/Phnom_Penh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const address = order.address
    ? [order.address.province, order.address.district, order.address.commune, order.address.village].filter(Boolean).join(', ')
    : 'N/A';
  const road = order.address?.roadNumber || order.address?.street || '';
  const isPaid = order.paymentStatus === 'PAID';

  const paymentMethodDisplay = (() => {
    const pm = (order.paymentMethod || '').toUpperCase();
    if (pm === 'BAKONG' || pm === 'KHQR') return 'BAKONG KHQR (ស្កេនទូទាត់)';
    if (pm === 'CARD' || pm === 'STRIPE') return 'VISA / MASTER CARD';
    if (pm === 'ABA' || pm === 'ABA_PAYWAY') return 'ABA PAYWAY';
    if (pm === 'COD' || pm === 'CASH') return 'CASH ON DELIVERY (ទូទាត់ពេលទទួល)';
    return pm || 'BAKONG KHQR';
  })();

  const itemsHtml = order.items
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px dashed #e2e8f0;">
        <td style="padding: 5px 0; vertical-align: top; word-break: break-word;">
          <div style="font-weight: 600; color: #0f172a; font-size: ${is80 ? '11.5px' : '10px'}; line-height: 1.35;">
            ${idx + 1}. ${item.name}
          </div>
          <div style="font-size: ${is80 ? '10px' : '8.5px'}; color: #64748b; margin-top: 1px;">
            ${item.quantity} × $${Number(item.price).toFixed(2)}
          </div>
        </td>
        <td style="padding: 5px 0 5px 4px; text-align: right; vertical-align: top; font-weight: 700; color: #0f172a; white-space: nowrap; font-size: ${is80 ? '11.5px' : '10px'};">
          $${(Number(item.price) * Number(item.quantity)).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="km">
      <head>
        <meta charset="utf-8">
        <title>Receipt-${order.orderNumber}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Kantumruy+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0mm;
          }
          @media print {
            body {
              margin: 0;
              padding: 3mm;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            width: ${widthPx};
            margin: 0 auto;
            padding: 3.5mm 1.5mm;
            font-family: 'Plus Jakarta Sans', 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: ${fontSize};
            line-height: 1.4;
            color: #0f172a;
            background: #ffffff;
            -webkit-font-smoothing: antialiased;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .bold { font-weight: 700; }
          .font-extrabold { font-weight: 800; }
          
          /* Header Brand */
          .header-brand {
            text-align: center;
            padding-bottom: 6px;
          }
          .brand-logo-emblem {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: #0f172a;
            color: #ffffff;
            font-weight: 800;
            font-size: 13px;
            border-radius: 7px;
            margin-bottom: 3px;
            letter-spacing: -0.5px;
          }
          .shop-title {
            font-size: ${titleSize};
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin: 2px 0 1px 0;
          }
          .shop-tagline {
            font-size: ${is80 ? '9.5px' : '8px'};
            color: #64748b;
            font-weight: 500;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }
          .contact-details {
            font-size: ${is80 ? '10px' : '8.5px'};
            color: #475569;
            margin-top: 3px;
            line-height: 1.35;
          }
          .receipt-badge {
            display: inline-block;
            background: #f1f5f9;
            color: #0f172a;
            border: 1px solid #cbd5e1;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: ${is80 ? '10px' : '8.5px'};
            font-weight: 700;
            letter-spacing: 0.5px;
            margin: 6px auto 2px auto;
            text-transform: uppercase;
          }

          /* Dividers */
          .divider-solid {
            border-top: 1.5px solid #0f172a;
            margin: 6px 0;
          }
          .divider-dashed {
            border-top: 1px dashed #94a3b8;
            margin: 6px 0;
          }
          .divider-double {
            border-top: 2px solid #0f172a;
            margin: 7px 0 5px 0;
          }

          /* Meta Card Box */
          .meta-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px 8px;
            margin: 6px 0;
            font-size: ${is80 ? '10.5px' : '9px'};
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 1.5px 0;
            line-height: 1.35;
          }
          .meta-label {
            color: #64748b;
            font-weight: 500;
            flex-shrink: 0;
            margin-right: 6px;
          }
          .meta-val {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
            word-break: break-word;
          }
          .invoice-pill {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            padding: 1px 5px;
            border-radius: 4px;
            font-weight: 700;
            color: #0f172a;
            font-size: ${is80 ? '10px' : '8.5px'};
          }
          .status-pill {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: ${is80 ? '9.5px' : '8px'};
            font-weight: 700;
          }
          .status-pill.paid {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #86efac;
          }
          .status-pill.pending {
            background: #fef3c7;
            color: #b45309;
            border: 1px solid #fde68a;
          }

          /* Table */
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .table-head th {
            padding: 4px 0;
            font-size: ${is80 ? '10px' : '8.5px'};
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1.5px solid #0f172a;
          }

          /* Totals */
          .totals-section {
            margin-top: 4px;
            padding: 3px 0;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2px 0;
            font-size: ${is80 ? '11px' : '9.5px'};
          }
          .total-label {
            color: #475569;
            font-weight: 500;
          }
          .total-val {
            color: #0f172a;
            font-weight: 600;
          }
          .grand-total-box {
            background: #0f172a;
            color: #ffffff;
            padding: 6px 10px;
            border-radius: 6px;
            margin: 6px 0 4px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .grand-total-box .grand-label {
            font-weight: 800;
            font-size: ${is80 ? '12px' : '10.5px'};
            letter-spacing: 0.5px;
          }
          .grand-total-box .grand-val {
            font-weight: 800;
            font-size: ${is80 ? '15px' : '13px'};
          }
          .khr-conversion {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2px 2px;
            font-size: ${is80 ? '10.5px' : '9px'};
            color: #475569;
            font-weight: 600;
          }

          /* Footer */
          .footer-section {
            text-align: center;
            margin-top: 8px;
            padding-top: 4px;
          }
          .thank-you-kh {
            font-size: ${is80 ? '11px' : '9.5px'};
            font-weight: 700;
            color: #0f172a;
          }
          .thank-you-en {
            font-size: ${is80 ? '9.5px' : '8px'};
            color: #64748b;
            font-weight: 500;
            margin-top: 1px;
          }
          .footer-note {
            font-size: ${is80 ? '9.5px' : '8px'};
            color: #334155;
            background: #f1f5f9;
            padding: 4px 6px;
            border-radius: 6px;
            margin-top: 5px;
            font-weight: 500;
          }
          .barcode-mock {
            margin: 8px auto 4px auto;
            letter-spacing: 3px;
            font-family: ui-monospace, monospace;
            font-size: ${is80 ? '14px' : '11px'};
            font-weight: 900;
            color: #0f172a;
            opacity: 0.85;
          }
          .cut-line {
            font-size: 8px;
            color: #94a3b8;
            margin-top: 6px;
            letter-spacing: 1px;
          }
          .pos-watermark {
            font-size: 8px;
            color: #94a3b8;
            margin-top: 3px;
            font-weight: 500;
            letter-spacing: 0.3px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-brand">
          <div class="brand-logo-emblem">SH</div>
          <div class="shop-title">${shopName}</div>
          <div class="shop-tagline">PREMIUM ONLINE SHOP & RETAIL</div>
          <div class="contact-details">
            <div>📞 ${shopPhone}</div>
            <div>📍 ${shopAddress}</div>
          </div>
          <div>
            <span class="receipt-badge">វិក្កយបត្រ • OFFICIAL RECEIPT</span>
          </div>
        </div>

        <!-- Meta Card -->
        <div class="meta-box">
          <div class="meta-row">
            <span class="meta-label">លេខវិក្កយបត្រ (Invoice #)</span>
            <span class="meta-val"><span class="invoice-pill">${order.orderNumber}</span></span>
          </div>
          <div class="meta-row">
            <span class="meta-label">កាលបរិច្ឆេទ (Date/Time)</span>
            <span class="meta-val">${dateStr}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">អតិថិជន (Customer)</span>
            <span class="meta-val">${order.user?.name || 'Customer'}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">ទូរស័ព្ទ (Phone)</span>
            <span class="meta-val">${order.address?.phone || order.user?.phone || 'N/A'}</span>
          </div>
          ${
            address !== 'N/A'
              ? `
          <div class="meta-row">
            <span class="meta-label">អាសយដ្ឋាន (Address)</span>
            <span class="meta-val">${address}${road ? ` (${road})` : ''}</span>
          </div>
          `
              : ''
          }
          <div class="meta-row">
            <span class="meta-label">ការទូទាត់ (Payment)</span>
            <span class="meta-val">${paymentMethodDisplay}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">ស្ថានភាព (Status)</span>
            <span class="meta-val">
              <span class="status-pill ${isPaid ? 'paid' : 'pending'}">
                ${isPaid ? '✓ PAID (បានបង់រួច)' : '⏳ PENDING (មិនទាន់បង់)'}
              </span>
            </span>
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead class="table-head">
            <tr>
              <th class="text-left">មុខទំនិញ (DESCRIPTION)</th>
              <th class="text-right">តម្លៃ (TOTAL)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Totals Calculation -->
        <div class="totals-section">
          <div class="total-row">
            <span class="total-label">តម្លៃដើម (Subtotal):</span>
            <span class="total-val">$${Number(order.subtotal || order.total).toFixed(2)}</span>
          </div>
          ${
            order.discount && order.discount > 0
              ? `
          <div class="total-row" style="color: #16a34a;">
            <span class="total-label" style="color: #16a34a;">បញ្ចុះតម្លៃ (Discount):</span>
            <span class="total-val" style="color: #16a34a; font-weight: 700;">-$${Number(order.discount).toFixed(2)}</span>
          </div>
          `
              : ''
          }
          ${
            order.shippingCost
              ? `
          <div class="total-row">
            <span class="total-label">ដឹកជញ្ជូន (Shipping):</span>
            <span class="total-val">+$${Number(order.shippingCost).toFixed(2)}</span>
          </div>
          `
              : ''
          }

          <!-- Grand Total Standout Box -->
          <div class="grand-total-box">
            <span class="grand-label">សរុប (GRAND TOTAL):</span>
            <span class="grand-val">$${Number(order.total).toFixed(2)}</span>
          </div>

          <div class="khr-conversion">
            <span>គិតជាប្រាក់រៀល (KHR):</span>
            <span style="font-weight: 700; color: #0f172a;">${formatKhrPrice(order.total)}</span>
          </div>
        </div>

        <div class="divider-dashed"></div>

        <!-- Footer Note & Branding -->
        <div class="footer-section">
          <div class="thank-you-kh">🙏 សូមអរគុណសម្រាប់ការទិញទំនិញ!</div>
          <div class="thank-you-en">Thank you for your business & trust</div>
          ${footerNote ? `<div class="footer-note">${footerNote}</div>` : ''}

          <!-- Barcode Mock -->
          <div class="barcode-mock">||| | |||| | | |||| | ||| | |||</div>
          <div style="font-size: 8.5px; color: #64748b; font-family: monospace;">* ${order.orderNumber} *</div>

          <div class="cut-line">✂ - - - - - - - - - - - - - - - - - - - - ✂</div>
          <div class="pos-watermark">Powered by ${shopName} Cloud POS</div>
        </div>
      </body>
    </html>
  `;
}

export function printThermalReceipt(
  order: Order,
  paperWidth: '80mm' | '58mm' = '80mm',
  shopInfo?: { shopName?: string; supportPhone?: string; shopAddress?: string; footerNote?: string }
) {
  const html = generateThermalReceiptHtml(order, paperWidth, shopInfo);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 350);
}
