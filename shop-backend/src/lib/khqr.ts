import crypto from 'crypto';
import axios from 'axios';
import QRCode from 'qrcode';
import { Order } from '@prisma/client';

export interface KhqrCreateResult {
  reference: string;
  qrPayload: string;
  qrUrl: string;
  qrPayloadKhr?: string;
  qrUrlKhr?: string;
  amountUsd: number;
  amountKhr: number;
  expiresAt: Date;
}

const provider = (process.env.KHQR_PROVIDER || 'mock').toLowerCase();

export const crc16Ccitt = (str: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const formatTlv = (tag: string, val: string | number): string => {
  const strVal = String(val);
  const len = String(strVal.length).padStart(2, '0');
  return tag + len + strVal;
};

export const buildEmvcoKhqr = ({
  bakongAccount,
  merchantName,
  merchantCity = 'Phnom Penh',
  currency = 'USD',
  amount,
  billNumber,
  storeLabel = 'ShopHub',
}: {
  bakongAccount: string;
  merchantName: string;
  merchantCity?: string;
  currency?: 'USD' | 'KHR';
  amount: number;
  billNumber?: string;
  storeLabel?: string;
}): string => {
  let payload = '';
  payload += formatTlv('00', '01'); // Format Indicator
  payload += formatTlv('01', '12'); // 12 = Dynamic QR Code with Amount

  // Tag 29: Merchant Account Information
  const cleanAccount = bakongAccount.includes('@') ? bakongAccount : `${bakongAccount.replace(/\s+/g, '')}@aba`;
  const sub00 = formatTlv('00', cleanAccount);
  const sub01 = formatTlv('01', merchantName);
  payload += formatTlv('29', sub00 + sub01);

  payload += formatTlv('52', '5999'); // Merchant category code
  payload += formatTlv('53', currency === 'KHR' ? '116' : '840'); // Currency (840 = USD, 116 = KHR)
  payload += formatTlv('54', currency === 'KHR' ? String(Math.round(amount)) : Number(amount).toFixed(2)); // Amount
  payload += formatTlv('58', 'KH'); // Country Code
  payload += formatTlv('59', merchantName); // Merchant Name
  payload += formatTlv('60', merchantCity); // Merchant City

  // Tag 62: Additional Data
  let tag62 = '';
  if (billNumber) tag62 += formatTlv('01', billNumber);
  if (storeLabel) tag62 += formatTlv('03', storeLabel);
  if (tag62) payload += formatTlv('62', tag62);

  // Tag 63: CRC16 Checksum
  const toSign = payload + '6304';
  const checksum = crc16Ccitt(toSign);
  return toSign + checksum;
};

const toUtcReqTime = (date = new Date()): string => {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
};

const buildMockKhqr = async (order: Order): Promise<KhqrCreateResult> => {
  const reference = `KHQR-${order.orderNumber}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const merchantName = process.env.KHQR_MERCHANT_NAME || 'MAO SOKHUN';
  const merchantCity = process.env.KHQR_MERCHANT_CITY || 'Phnom Penh';
  const accountUsd = (process.env.KHQR_ACCOUNT_USD || '005 282 269').trim();
  const accountKhr = (process.env.KHQR_ACCOUNT_KHR || '005 282 293').trim();
  const amountUsd = Number(order.total.toFixed(2));
  const amountKhr = Math.round(order.total * 4100);

  // 1. Build EMVCo Dynamic USD QR
  const qrPayloadUsd = buildEmvcoKhqr({
    bakongAccount: accountUsd,
    merchantName,
    merchantCity,
    currency: 'USD',
    amount: amountUsd,
    billNumber: order.orderNumber,
    storeLabel: 'ShopHub',
  });

  // 2. Build EMVCo Dynamic KHR QR
  const qrPayloadKhr = buildEmvcoKhqr({
    bakongAccount: accountKhr,
    merchantName,
    merchantCity,
    currency: 'KHR',
    amount: amountKhr,
    billNumber: order.orderNumber,
    storeLabel: 'ShopHub',
  });

  // 3. Use Official Verified ABA Merchant QR images
  const qrUrlUsd = '/payments/aba_pay_khqr.png';
  const qrUrlKhr = '/payments/aba_qr_khr.png';

  return {
    reference,
    qrPayload: qrPayloadUsd,
    qrUrl: qrUrlUsd,
    qrPayloadKhr,
    qrUrlKhr,
    amountUsd,
    amountKhr,
    expiresAt,
  };
};

const buildAbaKhqr = async (order: Order): Promise<KhqrCreateResult> => {
  const baseUrl = process.env.ABA_PAYWAY_BASE_URL || 'https://checkout-sandbox.payway.com.kh';
  const endpoint = process.env.ABA_KHQR_CREATE_URL || '/api/payment-gateway/v1/payments/generate-qr';
  const merchantId = (process.env.ABA_PAYWAY_MERCHANT_ID || process.env.ABA_MERCHANT_ID || '').trim();
  const apiKey = (process.env.ABA_PAYWAY_API_KEY || process.env.ABA_API_KEY || '').trim();
  if (!merchantId || !apiKey) {
    throw new Error('ABA PayWay is not configured. Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY (or ABA_MERCHANT_ID / ABA_API_KEY)');
  }

  const reference = order.orderNumber.slice(-20);
  const reqTime = toUtcReqTime();
  const amountUsd = Number(order.total.toFixed(2));
  const amountKhr = Math.round(order.total * 4100);
  const currency = (process.env.ABA_PAYWAY_CURRENCY || 'USD').toUpperCase();
  const lifetime = Number(process.env.ABA_PAYWAY_LIFETIME_MINUTES || 10);
  const qrImageTemplate = process.env.ABA_PAYWAY_QR_TEMPLATE || 'template3_color';
  const callbackRaw =
    process.env.ABA_PAYWAY_CALLBACK_URL ||
    (process.env.BACKEND_PUBLIC_URL
      ? `${process.env.BACKEND_PUBLIC_URL}/api/payments/khqr/webhook`
      : '');

  const itemsJson = JSON.stringify(
    [
      {
        name: `Order ${order.orderNumber}`,
        quantity: 1,
        price: amountUsd,
      },
    ].slice(0, 10)
  );

  const items = Buffer.from(itemsJson).toString('base64');
  const callbackUrl = callbackRaw ? Buffer.from(callbackRaw).toString('base64') : '';
  const firstName = 'ShopHub';
  const lastName = 'Customer';
  const email = '';
  const phone = '';
  const purchaseType = 'purchase';
  const paymentOption = 'abapay_khqr';
  const returnDeeplink = '';
  const customFields = '';
  const returnParams = '';
  const payout = '';

  const hashInput = [
    reqTime,
    merchantId,
    reference,
    String(amountUsd),
    items,
    firstName,
    lastName,
    email,
    phone,
    purchaseType,
    paymentOption,
    callbackUrl,
    returnDeeplink,
    currency,
    customFields,
    returnParams,
    payout,
    String(lifetime),
    qrImageTemplate,
  ].join('');

  const hash = crypto.createHmac('sha512', apiKey).update(hashInput).digest('base64');

  const payload = {
    req_time: reqTime,
    merchant_id: merchantId,
    tran_id: reference,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    amount: amountUsd,
    purchase_type: purchaseType,
    payment_option: paymentOption,
    items,
    currency,
    callback_url: callbackUrl || undefined,
    return_deeplink: returnDeeplink || undefined,
    custom_fields: customFields || undefined,
    return_params: returnParams || undefined,
    payout: payout || undefined,
    lifetime,
    qr_image_template: qrImageTemplate,
    hash,
  };

  const { data } = await axios.post(`${baseUrl}${endpoint}`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  if (String(data?.status?.code) !== '0') {
    throw new Error(`ABA PayWay error ${data?.status?.code}: ${data?.status?.message || 'Unknown error'}`);
  }

  const qrPayload = String(data?.qrString || '');
  const qrImageBase64 = String(data?.qrImage || '');
  const qrUrl = qrImageBase64 ? `data:image/png;base64,${qrImageBase64}` : '';
  const expiresAt = new Date(Date.now() + lifetime * 60 * 1000);

  if (!qrPayload || !qrUrl) {
    throw new Error('Invalid ABA PayWay QR response');
  }

  return {
    reference,
    qrPayload,
    qrUrl,
    amountUsd,
    amountKhr,
    expiresAt,
  };
};

export const createKhqrForOrder = async (order: Order): Promise<KhqrCreateResult> => {
  if (provider === 'aba') {
    try {
      return await buildAbaKhqr(order);
    } catch (e) {
      console.warn('ABA PayWay live generation failed, falling back to dynamic Bakong EMVCo QR:', e);
      return await buildMockKhqr(order);
    }
  }
  return await buildMockKhqr(order);
};

export const verifyKhqrWebhookSignature = (rawBody: string, signature: string | undefined): boolean => {
  const secret = process.env.ABA_KHQR_WEBHOOK_SECRET?.trim();
  const provider = (process.env.KHQR_PROVIDER || 'mock').toLowerCase();
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && provider === 'aba') {
      return false;
    }
    return true;
  }
  if (!signature) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const sig = String(signature).trim();
  if (sig.length !== digest.length) return false;
  try {
    const a = Buffer.from(digest, 'utf8');
    const b = Buffer.from(sig, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};
