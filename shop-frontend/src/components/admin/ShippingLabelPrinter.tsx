'use client';

import React from 'react';
import { Order } from '@/types';
import { formatPrice, formatKhrPrice } from '@/lib/utils';
import { generateBarcodeSvg, generateQrCodeSvg } from '@/lib/barcodeGenerator';

export interface ShippingCarrierInfo {
  name: string;
  code: string;
  phone?: string;
  logoText?: string;
  badgeBg: string;
  trackingBaseUrl?: string;
}

export const CARRIERS: Record<string, ShippingCarrierInfo> = {
  JNT: {
    name: 'J&T Express',
    code: 'JNT',
    phone: '023 999 900',
    logoText: 'J&T EXPRESS',
    badgeBg: '#e11d48',
    trackingBaseUrl: 'https://www.jtexpress.com.kh/tracking?billCode=',
  },
  VET: {
    name: 'Virak Buntham (VET)',
    code: 'VET',
    phone: '081 911 911',
    logoText: 'VIRAK BUNTHAM',
    badgeBg: '#16a34a',
    trackingBaseUrl: 'https://virakbuntham.com/tracking?no=',
  },
  FLASH: {
    name: 'Flash Express',
    code: 'FLASH',
    phone: '023 901 888',
    logoText: 'FLASH EXPRESS',
    badgeBg: '#eab308',
    trackingBaseUrl: 'https://www.flashexpress.com.kh/tracking/?se=',
  },
  GRAB: {
    name: 'Grab Express / Delivery',
    code: 'GRAB',
    phone: '023 900 000',
    logoText: 'GRAB EXPRESS',
    badgeBg: '#059669',
    trackingBaseUrl: '',
  },
  STANDARD: {
    name: 'Standard Delivery',
    code: 'STANDARD',
    phone: '097 494 4390',
    logoText: 'SH DELIVERY',
    badgeBg: '#4f46e5',
    trackingBaseUrl: '',
  },
};

export function getCarrierInfo(carrierCode?: string | null): ShippingCarrierInfo {
  if (!carrierCode) return CARRIERS.STANDARD;
  const upper = carrierCode.toUpperCase();
  if (upper.includes('JNT') || upper.includes('J&T')) return CARRIERS.JNT;
  if (upper.includes('VET') || upper.includes('VIRAK')) return CARRIERS.VET;
  if (upper.includes('FLASH')) return CARRIERS.FLASH;
  if (upper.includes('GRAB')) return CARRIERS.GRAB;
  return CARRIERS.STANDARD;
}

export function getCarrierTrackingUrl(carrierCode?: string | null, trackingNumber?: string | null): string {
  if (!trackingNumber) return '';
  const info = getCarrierInfo(carrierCode);
  if (info.trackingBaseUrl) {
    return `${info.trackingBaseUrl}${encodeURIComponent(trackingNumber.trim())}`;
  }
  return '';
}

export function printThermalShippingLabel(order: Order, options?: { shopName?: string; shopPhone?: string; shopAddress?: string }) {
  if (!order) return;

  const shopName = options?.shopName || 'SH-SHOP CAMBODIA';
  const shopPhone = options?.shopPhone || '097 494 4390 / 088 545 9115';
  const shopAddress = options?.shopAddress || 'Toul Kork, Phnom Penh, Cambodia';

  const carrier = getCarrierInfo(order.shippingCarrier);
  const isCod = order.paymentStatus !== 'PAID';
  const codAmountUsd = isCod ? order.total : 0;
  const codAmountKhr = isCod ? Math.round(order.total * 4100) : 0;

  const recipientName = order.shippingAddress?.name || order.address?.name || order.user?.name || 'Customer';
  const recipientPhone = order.shippingAddress?.phone || order.address?.phone || order.user?.phone || 'N/A';

  const fullAddress = [
    order.shippingAddress?.province || order.address?.province,
    order.shippingAddress?.district || order.address?.district,
    order.shippingAddress?.commune || order.address?.commune,
    order.shippingAddress?.village || order.address?.village,
    order.shippingAddress?.roadNumber || order.address?.roadNumber ? `ផ្លូវលេខ ${order.shippingAddress?.roadNumber || order.address?.roadNumber}` : null,
  ]
    .filter(Boolean)
    .join(', ') || 'Phnom Penh, Cambodia';

  const trackingCode = order.trackingNumber || order.orderNumber;
  const barcodeSvg = generateBarcodeSvg(trackingCode, { width: 1.8, height: 45, margin: 4 });
  const qrSvg = generateQrCodeSvg(trackingCode, 80);

  const printWindow = window.open('', '_blank', 'width=520,height=750');
  if (!printWindow) return;

  const itemsHtml = (order.items || [])
    .map(
      (item, idx) => `
      <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; border-bottom: 1px dotted #e2e8f0;">
        <span style="font-weight: 600; max-width: 75%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${idx + 1}. ${item.name}
        </span>
        <span style="font-weight: 800; font-family: monospace;">x${item.quantity}</span>
      </div>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Shipping Label - ${order.orderNumber}</title>
        <style>
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Kantumruy Pro', 'Segoe UI', Arial, sans-serif;
            background: #ffffff;
            color: #000000;
            width: 100mm;
            min-height: 150mm;
            padding: 4mm;
            font-size: 12px;
            line-height: 1.3;
          }
          .label-wrapper {
            border: 2px solid #000000;
            border-radius: 4px;
            padding: 3mm;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #000000;
            padding-bottom: 3mm;
            margin-bottom: 3mm;
          }
          .carrier-badge {
            background: #000000;
            color: #ffffff;
            padding: 4px 8px;
            font-size: 13px;
            font-weight: 900;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .shop-title {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .sender-box {
            font-size: 10px;
            color: #333333;
            border-bottom: 1px solid #000000;
            padding-bottom: 2mm;
            margin-bottom: 3mm;
          }
          .receiver-box {
            border: 2px solid #000000;
            border-radius: 4px;
            padding: 3mm;
            background: #f8fafc;
            margin-bottom: 3mm;
          }
          .receiver-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            margin-bottom: 2px;
          }
          .receiver-name {
            font-size: 15px;
            font-weight: 900;
            color: #000000;
          }
          .receiver-phone {
            font-size: 18px;
            font-weight: 900;
            color: #000000;
            font-family: monospace;
            margin: 2px 0 4px 0;
            letter-spacing: 0.5px;
          }
          .receiver-address {
            font-size: 11.5px;
            font-weight: 600;
            line-height: 1.35;
          }
          .cod-block {
            border: 3px solid ${isCod ? '#dc2626' : '#16a34a'};
            background: ${isCod ? '#fff1f2' : '#f0fdf4'};
            padding: 3mm;
            border-radius: 6px;
            text-align: center;
            margin-bottom: 3mm;
          }
          .cod-title {
            font-size: 11px;
            font-weight: 900;
            color: ${isCod ? '#be123c' : '#15803d'};
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .cod-amount {
            font-size: 24px;
            font-weight: 900;
            color: ${isCod ? '#9f1239' : '#166534'};
            font-family: monospace;
            line-height: 1.1;
          }
          .cod-khr {
            font-size: 13px;
            font-weight: 800;
            color: #334155;
            margin-top: 1px;
          }
          .barcode-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2mm;
            padding: 2mm 0;
            border-top: 1px dashed #000000;
            border-bottom: 1px dashed #000000;
            margin-bottom: 2mm;
          }
          .items-summary {
            font-size: 10px;
            margin-top: 2mm;
          }
          .footer-note {
            font-size: 9px;
            text-align: center;
            color: #64748b;
            margin-top: 2mm;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="label-wrapper">
          <div>
            <!-- Header -->
            <div class="header-row">
              <div>
                <div class="shop-title">${shopName}</div>
                <div style="font-size: 9px; color: #64748b;">${shopPhone}</div>
              </div>
              <div class="carrier-badge">${carrier.logoText}</div>
            </div>

            <!-- Sender Info -->
            <div class="sender-box">
              <strong>ពី (FROM):</strong> ${shopName} • ${shopPhone}<br>
              ${shopAddress}
            </div>

            <!-- Receiver Info -->
            <div class="receiver-box">
              <div class="receiver-title">📦 ផ្ញើជូន (SHIP TO / RECIPIENT):</div>
              <div class="receiver-name">${recipientName}</div>
              <div class="receiver-phone">📞 ${recipientPhone}</div>
              <div class="receiver-address">📍 ${fullAddress}</div>
            </div>

            <!-- COD Block -->
            <div class="cod-block">
              <div class="cod-title">${isCod ? '⚠️ ប្រមូលប្រាក់ពីអតិថិជន (C.O.D)' : '✅ បានទូទាត់រួច (PAID ORDER)'}</div>
              <div class="cod-amount">${isCod ? formatPrice(codAmountUsd) : 'PAID ($0.00)'}</div>
              ${isCod ? `<div class="cod-khr">${formatKhrPrice(codAmountUsd)} (KHR)</div>` : `<div class="cod-khr" style="color: #16a34a; font-weight: 800;">ហាមប្រមូលប្រាក់បន្ថែម / DO NOT COLLECT</div>`}
            </div>

            <!-- Barcode & QR Code Section -->
            <div class="barcode-section">
              <div style="flex: 1; text-align: center;">
                <div style="display: flex; justify-content: center; align-items: center; overflow: hidden; width: 100%;">
                  ${barcodeSvg}
                </div>
                <div style="font-size: 11px; font-weight: 900; font-family: monospace; letter-spacing: 1px; margin-top: 2px;">
                  ${trackingCode}
                </div>
              </div>
              <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; shrink-0;">
                ${qrSvg}
              </div>
            </div>

            <!-- Package Items Manifest -->
            <div class="items-summary">
              <div style="font-weight: 800; font-size: 10.5px; margin-bottom: 2px;">🛍️ បញ្ជីមុខទំនិញ (${order.items?.length || 0} មុខ):</div>
              ${itemsHtml}
            </div>
          </div>

          <!-- Footer -->
          <div class="footer-note">
            Order: ${order.orderNumber} • Date: ${new Date(order.createdAt).toLocaleDateString()} • Powered by SH-Shop POS
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
