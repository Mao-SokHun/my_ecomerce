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

export function generateThermalReceiptHtml(order: Order, paperWidth: '80mm' | '58mm' = '80mm'): string {
  const is80 = paperWidth === '80mm';
  const widthPx = is80 ? '72mm' : '48mm';
  const fontSize = is80 ? '12px' : '10px';
  const titleSize = is80 ? '16px' : '14px';

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

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 3px 0; vertical-align: top; word-break: break-word;">
          <b>${item.name}</b>
          <div style="font-size: ${is80 ? '10px' : '9px'}; color: #444;">${item.quantity} x $${Number(item.price).toFixed(2)}</div>
        </td>
        <td style="padding: 3px 0; text-align: right; vertical-align: top; font-weight: bold; white-space: nowrap;">
          $${(Number(item.price) * Number(item.quantity)).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt-${order.orderNumber}</title>
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0mm;
          }
          @media print {
            body {
              margin: 0;
              padding: 4mm;
            }
          }
          body {
            width: ${widthPx};
            margin: 0 auto;
            padding: 4mm 2mm;
            font-family: 'Courier New', Courier, 'Noto Sans Khmer', monospace, sans-serif;
            font-size: ${fontSize};
            line-height: 1.35;
            color: #000;
            background: #fff;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .double-divider {
            border-top: 2px dashed #000;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .title {
            font-size: ${titleSize};
            font-weight: 900;
            letter-spacing: 1px;
            margin-bottom: 2px;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="title">SH-SHOP</div>
          <div>ទូរស័ព្ទ: 097 494 4390 / 088 545 9115</div>
          <div>អាសយដ្ឋាន: ទួលគោក, ភ្នំពេញ</div>
          <div>*** វិក្កយបត្រ / RECEIPT ***</div>
        </div>

        <div class="divider"></div>

        <div><b>លេខវិក្កយបត្រ:</b> ${order.orderNumber}</div>
        <div><b>កាលបរិច្ឆេទ:</b> ${dateStr}</div>
        <div><b>អតិថិជន:</b> ${order.user?.name || 'Customer'}</div>
        <div><b>ទូរស័ព្ទ:</b> ${order.address?.phone || order.user?.phone || 'N/A'}</div>
        <div><b>អាសយដ្ឋាន:</b> ${address} ${road ? `(${road})` : ''}</div>
        <div><b>វិធីទូទាត់:</b> ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'BAKONG KHQR'}</div>
        <div><b>ស្ថានភាពបង់:</b> ${order.paymentStatus === 'PAID' ? 'PAID (បានបង់រួច)' : 'PENDING (មិនទាន់បង់)'}</div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 3px;">ទំនិញ (Item)</th>
              <th style="text-align: right; padding-bottom: 3px;">តម្លៃ (Total)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table>
          <tr>
            <td>តម្លៃដើម (Subtotal):</td>
            <td class="text-right">$${Number(order.subtotal || order.total).toFixed(2)}</td>
          </tr>
          ${
            order.discount && order.discount > 0
              ? `<tr><td>បញ្ចុះតម្លៃ (Discount):</td><td class="text-right">-$${Number(order.discount).toFixed(2)}</td></tr>`
              : ''
          }
          ${
            order.shippingCost
              ? `<tr><td>ដឹកជញ្ជូន (Shipping):</td><td class="text-right">$${Number(order.shippingCost).toFixed(2)}</td></tr>`
              : ''
          }
          <tr style="font-size: ${is80 ? '14px' : '12px'};">
            <td class="bold">សរុប (Grand Total):</td>
            <td class="text-right bold">$${Number(order.total).toFixed(2)}</td>
          </tr>
          <tr style="font-size: ${is80 ? '11px' : '10px'}; color: #333;">
            <td>គិតជាប្រាក់រៀល:</td>
            <td class="text-right">${formatKhrPrice(order.total)}</td>
          </tr>
        </table>

        <div class="double-divider"></div>

        <div class="text-center" style="margin-top: 8px;">
          <div>សូមអរគុណសម្រាប់ការទិញទំនិញ!</div>
          <div>Thank you for shopping with us!</div>
          <div style="font-size: 9px; margin-top: 5px; color: #555;">Power by SH-Shop Cloud POS</div>
        </div>
      </body>
    </html>
  `;
}

export function printThermalReceipt(order: Order, paperWidth: '80mm' | '58mm' = '80mm') {
  const html = generateThermalReceiptHtml(order, paperWidth);

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
