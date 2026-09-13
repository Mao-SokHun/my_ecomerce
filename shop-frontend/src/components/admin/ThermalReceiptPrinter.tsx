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

  const shopName = (shopInfo?.shopName || 'SH-SHOP').toUpperCase();
  const shopPhone = shopInfo?.supportPhone || '097 494 4390 / 088 545 9115';
  const shopAddress = shopInfo?.shopAddress || 'Toul Kork, Phnom Penh';

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
  const fullAddress = address !== 'N/A' ? `${address}${road ? ` (${road})` : ''}` : 'N/A';
  const isPaid = order.paymentStatus === 'PAID';

  const paymentMethodDisplay = (() => {
    const pm = (order.paymentMethod || '').toUpperCase();
    if (pm === 'BAKONG' || pm === 'KHQR') return 'BAKONG';
    if (pm === 'CARD' || pm === 'STRIPE') return 'VISA / MASTER';
    if (pm === 'ABA' || pm === 'ABA_PAYWAY') return 'ABA PAY';
    if (pm === 'COD' || pm === 'CASH') return 'CASH ON DELIVERY';
    return pm || 'BAKONG';
  })();

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 6px 2px; text-align: left; vertical-align: middle; font-weight: 600; color: #000; font-size: ${is80 ? '11px' : '9.5px'}; line-height: 1.35; word-break: break-word;">
          ${item.name}
        </td>
        <td style="padding: 6px 2px; text-align: center; vertical-align: middle; font-weight: 600; color: #000; font-size: ${is80 ? '11px' : '9.5px'};">
          ${item.quantity}
        </td>
        <td style="padding: 6px 2px; text-align: right; vertical-align: middle; font-weight: 600; color: #000; font-size: ${is80 ? '11px' : '9.5px'}; white-space: nowrap;">
          $${Number(item.price).toFixed(2)}
        </td>
        <td style="padding: 6px 2px; text-align: right; vertical-align: middle; font-weight: 700; color: #000; font-size: ${is80 ? '11px' : '9.5px'}; white-space: nowrap;">
          $${(Number(item.price) * Number(item.quantity)).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('');

  const barcodeSvgHtml = generateBarcodeSvg(order.orderNumber, {
    height: is80 ? 42 : 35,
    width: is80 ? 1.6 : 1.3,
    maxWidth: is80 ? '240px' : '180px',
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
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Kantumruy+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0mm;
          }
          @media print {
            body {
              margin: 0;
              padding: 2.5mm;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            width: ${widthPx};
            margin: 0 auto;
            padding: 3mm 1mm;
            font-family: 'Plus Jakarta Sans', 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: ${fontSize};
            line-height: 1.4;
            color: #000000;
            background: #ffffff;
            -webkit-font-smoothing: antialiased;
          }
          
          /* Header */
          .shop-header {
            text-align: center;
            padding-bottom: 4px;
          }
          .shop-title-large {
            font-size: ${is80 ? '24px' : '19px'};
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #000000;
            margin: 0 0 3px 0;
            text-transform: uppercase;
          }
          .social-icons {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin: 3px 0 4px 0;
          }
          .contact-line {
            font-size: ${is80 ? '10.5px' : '9px'};
            font-weight: 600;
            color: #111111;
            margin: 1.5px 0;
            line-height: 1.35;
          }
          .receipt-pill-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            border: 1px dashed #000000;
            border-radius: 20px;
            padding: 3px 12px;
            font-size: ${is80 ? '11px' : '9.5px'};
            font-weight: 800;
            margin: 6px auto 2px auto;
            color: #000000;
          }

          /* Dividers */
          .divider-dashed {
            border-top: 1px dashed #666666;
            margin: 7px 0;
          }
          .divider-solid {
            border-top: 1.5px solid #000000;
            margin: 7px 0;
          }

          /* Info Block */
          .receipt-meta-block {
            font-size: ${is80 ? '11px' : '9.5px'};
            line-height: 1.5;
            color: #000000;
          }
          .receipt-meta-block div {
            margin: 1.5px 0;
          }
          .meta-bold {
            font-weight: 800;
            letter-spacing: 0.2px;
          }
          .meta-value {
            font-weight: 600;
          }

          /* Payment & Status Line */
          .payment-status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 5px;
            flex-wrap: wrap;
          }
          .payment-method-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-weight: 800;
            font-size: ${is80 ? '11px' : '9.5px'};
            color: #000000;
          }
          .payment-icon-symbol {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 15px;
            height: 15px;
            background: #1e1b4b;
            color: #ffffff;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 900;
          }
          .status-badge-capsule {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: ${is80 ? '9.5px' : '8.5px'};
            font-weight: 800;
            letter-spacing: 0.3px;
          }
          .status-badge-capsule.paid {
            background: #22c55e;
            color: #ffffff;
          }
          .status-badge-capsule.pending {
            background: #22c55e;
            color: #ffffff;
          }

          /* Table Layout */
          .receipt-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 2px 0;
            margin: 8px 0;
          }
          .receipt-table thead th {
            background: #e2e8f0;
            color: #000000;
            padding: 5px 2px;
            font-size: ${is80 ? '10px' : '8.5px'};
            font-weight: 800;
            text-align: center;
            border-radius: 4px;
            line-height: 1.25;
          }
          .receipt-table thead th.th-item {
            text-align: left;
            padding-left: 5px;
            width: 44%;
          }
          .receipt-table thead th.th-qty {
            width: 14%;
          }
          .receipt-table thead th.th-price {
            text-align: right;
            width: 21%;
          }
          .receipt-table thead th.th-total {
            text-align: right;
            padding-right: 5px;
            width: 21%;
          }
          .kh-sub {
            font-size: ${is80 ? '9px' : '7.5px'};
            font-weight: 600;
          }
          .receipt-table tbody td {
            border-bottom: 1px solid #cbd5e1;
          }

          /* Calc Section */
          .calc-section {
            margin-top: 4px;
            padding: 2px 0;
          }
          .calc-row {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 12px;
            padding: 1.5px 0;
            font-size: ${is80 ? '11px' : '9.5px'};
            font-weight: 600;
            color: #000000;
          }
          .calc-label {
            width: 90px;
            text-align: right;
          }
          .calc-val {
            min-width: 65px;
            text-align: right;
            font-weight: 700;
          }
          .calc-row.discount {
            color: #16a34a;
          }

          /* Grand Total Section */
          .grand-total-section {
            text-align: center;
            padding: 6px 0 4px 0;
          }
          .grand-total-main {
            font-size: ${is80 ? '19px' : '16px'};
            font-weight: 900;
            color: #000000;
            letter-spacing: 0.2px;
          }
          .grand-total-khr {
            font-size: ${is80 ? '13px' : '11px'};
            font-weight: 700;
            color: #222222;
            margin-top: 2px;
          }

          /* Footer */
          .footer-section {
            text-align: center;
            padding-top: 4px;
            line-height: 1.4;
          }
          .footer-en {
            font-size: ${is80 ? '10px' : '8.5px'};
            font-weight: 600;
            color: #222222;
          }
          .footer-km {
            font-size: ${is80 ? '10.5px' : '9px'};
            font-weight: 700;
            color: #000000;
            margin-top: 1px;
          }
          .footer-pos {
            font-size: ${is80 ? '9px' : '8px'};
            font-weight: 500;
            color: #666666;
            margin-top: 3px;
          }
          .barcode-box {
            margin: 7px auto 3px auto;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="shop-header">
          <div class="shop-title-large">${shopName}</div>
          
          <!-- Social Icons -->
          <div class="social-icons">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </div>

          <div class="contact-line">📞 Tel: ${shopPhone}</div>
          <div class="contact-line">📍 ${shopAddress}</div>

          <div>
            <div class="receipt-pill-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/><path d="m9 8 2 2 4-4"/></svg>
              <span>RECEIPT / វិក្កយបត្រ</span>
            </div>
          </div>
        </div>

        <div class="divider-dashed"></div>

        <!-- Upper Receipt Info -->
        <div class="receipt-meta-block">
          <div><span class="meta-bold">RECEIPT #:</span> <span class="meta-value">${order.orderNumber}</span></div>
          <div><span class="meta-bold">DATE:</span> <span class="meta-value">${dateStr}</span></div>
        </div>

        <div class="divider-dashed"></div>

        <!-- Customer & Delivery Info -->
        <div class="receipt-meta-block">
          <div><span class="meta-bold">CUSTOMER:</span> <span class="meta-value">${order.user?.name || 'Customer'}</span></div>
          <div><span class="meta-bold">TEL:</span> <span class="meta-value">${order.address?.phone || order.user?.phone || 'N/A'}</span></div>
          <div><span class="meta-bold">ADDRESS:</span> <span class="meta-value">${fullAddress}</span></div>
          
          <div class="payment-status-row">
            <div class="payment-method-pill">
              <span class="payment-icon-symbol">❖</span>
              <span>${paymentMethodDisplay}</span>
            </div>
            <span class="status-badge-capsule ${isPaid ? 'paid' : 'pending'}">
              ${isPaid ? 'PAID (បានបង់រួច)' : 'PENDING (មិនទាន់បង់)'}
            </span>
          </div>
        </div>

        <!-- Items Table -->
        <table class="receipt-table">
          <thead>
            <tr>
              <th class="th-item">Description<br><span class="kh-sub">(ទំនិញ)</span></th>
              <th class="th-qty">QTY<br><span class="kh-sub">(ចំនួន)</span></th>
              <th class="th-price">Unit Price<br><span class="kh-sub">(តម្លៃរាយ)</span></th>
              <th class="th-total">Total<br><span class="kh-sub">(សរុប)</span></th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Calculations -->
        <div class="calc-section">
          <div class="calc-row">
            <span class="calc-label">Subtotal:</span>
            <span class="calc-val">$${Number(order.subtotal || order.total).toFixed(2)}</span>
          </div>
          ${
            order.discount && order.discount > 0
              ? `
          <div class="calc-row discount">
            <span class="calc-label">Discount:</span>
            <span class="calc-val">-$${Number(order.discount).toFixed(2)}</span>
          </div>
          `
              : ''
          }
          <div class="calc-row">
            <span class="calc-label">Shipping Fee:</span>
            <span class="calc-val">$${Number(order.shippingCost || 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="divider-solid"></div>

        <!-- Grand Total -->
        <div class="grand-total-section">
          <div class="grand-total-main">
            Grand Total: $${Number(order.total).toFixed(2)}
          </div>
          <div class="grand-total-khr">
            ${formatKhrPrice(order.total)} (KHR)
          </div>
        </div>

        <div class="divider-dashed"></div>

        <!-- Footer & Crisp Vector Barcode -->
        <div class="footer-section">
          <!-- Authentic Vector Barcode -->
          <div class="barcode-box">
            ${barcodeSvgHtml}
          </div>

          <div class="footer-en">Thank you for shopping with us!</div>
          <div class="footer-km">សូមអរគុណសម្រាប់ការទិញទំនិញ!</div>
          <div class="footer-pos">Powered by ${shopName} Cloud POS</div>
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
