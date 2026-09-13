'use client';

import { Order } from '@/types';
import { formatPrice, formatKhrPrice } from '@/lib/utils';
import { generateBarcodeSvg } from '@/lib/barcodeGenerator';

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
    if (pm === 'COD' || pm === 'CASH') return 'CASH ON DELIVERY';
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

  const barcodeSvgHtml = generateBarcodeSvg(order.orderNumber, {
    height: is80 ? 38 : 32,
    maxWidth: is80 ? '220px' : '170px',
    showText: true,
  });

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
            font-size: ${is80 ? '9px' : '8px'};
            color: #64748b;
            font-weight: 600;
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
            font-size: ${is80 ? '9.5px' : '8.5px'};
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

          /* Meta Card Box - Overhauled for Luxury Readability */
          .meta-box {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 9px;
            margin: 7px 0;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          }
          .meta-header-row {
            background: #f8fafc;
            padding: 5px 8px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .meta-title-km {
            font-size: ${is80 ? '10px' : '8.5px'};
            font-weight: 700;
            color: #0f172a;
            display: block;
            line-height: 1.2;
          }
          .meta-title-en {
            font-size: 7.5px;
            font-weight: 600;
            color: #64748b;
            letter-spacing: 0.4px;
            text-transform: uppercase;
          }
          .invoice-pill {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background: #0f172a;
            color: #ffffff;
            padding: 2px 7px;
            border-radius: 5px;
            font-weight: 800;
            font-size: ${is80 ? '10.5px' : '9px'};
            letter-spacing: 0.5px;
          }
          .meta-grid {
            padding: 3px 8px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3.5px 0;
            border-bottom: 1px dashed #f1f5f9;
            font-size: ${is80 ? '10.5px' : '9px'};
            line-height: 1.3;
          }
          .meta-row:last-child {
            border-bottom: none;
          }
          .meta-label {
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            margin-right: 8px;
          }
          .label-km {
            font-size: ${is80 ? '10px' : '8.5px'};
            font-weight: 600;
            color: #475569;
            line-height: 1.2;
          }
          .label-en {
            font-size: 7.5px;
            font-weight: 500;
            color: #94a3b8;
            letter-spacing: 0.3px;
            text-transform: uppercase;
          }
          .meta-val {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
            word-break: break-word;
          }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
          }
          .status-pill {
            display: inline-block;
            padding: 1.5px 7px;
            border-radius: 4px;
            font-size: ${is80 ? '9px' : '8px'};
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
          .meta-address-box {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 5px 8px 6px 8px;
            text-align: left;
          }
          .address-content {
            font-size: ${is80 ? '10px' : '8.5px'};
            color: #1e293b;
            font-weight: 600;
            line-height: 1.35;
            word-break: break-word;
            margin-top: 2px;
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
          <div class="meta-header-row">
            <div>
              <span class="meta-title-km">លេខវិក្កយបត្រ</span>
              <span class="meta-title-en">INVOICE NUMBER</span>
            </div>
            <div>
              <span class="invoice-pill">${order.orderNumber}</span>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-row">
              <div class="meta-label">
                <span class="label-km">កាលបរិច្ឆេទ</span>
                <span class="label-en">Date / Time</span>
              </div>
              <div class="meta-val">${dateStr}</div>
            </div>

            <div class="meta-row">
              <div class="meta-label">
                <span class="label-km">អតិថិជន</span>
                <span class="label-en">Customer</span>
              </div>
              <div class="meta-val" style="font-weight: 700;">${order.user?.name || 'Customer'}</div>
            </div>

            <div class="meta-row">
              <div class="meta-label">
                <span class="label-km">លេខទូរស័ព្ទ</span>
                <span class="label-en">Contact Phone</span>
              </div>
              <div class="meta-val font-mono">${order.address?.phone || order.user?.phone || 'N/A'}</div>
            </div>

            <div class="meta-row">
              <div class="meta-label">
                <span class="label-km">ការទូទាត់</span>
                <span class="label-en">Payment Method</span>
              </div>
              <div class="meta-val">${paymentMethodDisplay}</div>
            </div>

            <div class="meta-row">
              <div class="meta-label">
                <span class="label-km">ស្ថានភាព</span>
                <span class="label-en">Payment Status</span>
              </div>
              <div class="meta-val">
                <span class="status-pill ${isPaid ? 'paid' : 'pending'}">
                  ${isPaid ? '✓ PAID (បានបង់)' : '⏳ PENDING (មិនទាន់បង់)'}
                </span>
              </div>
            </div>
          </div>

          ${
            address !== 'N/A'
              ? `
          <div class="meta-address-box">
            <div class="meta-label">
              <span class="label-km">📍 អាសយដ្ឋានដឹកជញ្ជូន</span>
              <span class="label-en">Delivery Address</span>
            </div>
            <div class="address-content">
              ${address}${road ? ` • ផ្លូវ/ផ្ទះ: ${road}` : ''}
            </div>
          </div>
          `
              : ''
          }
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

        <!-- Footer Note & Vector Barcode -->
        <div class="footer-section">
          <div class="thank-you-kh">🙏 សូមអរគុណសម្រាប់ការទិញទំនិញ!</div>
          <div class="thank-you-en">Thank you for your business & trust</div>
          ${footerNote ? `<div class="footer-note">${footerNote}</div>` : ''}

          <!-- Crisp Vector SVG Barcode -->
          ${barcodeSvgHtml}

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
