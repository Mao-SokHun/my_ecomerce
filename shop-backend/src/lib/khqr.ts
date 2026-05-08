import crypto from 'crypto';
import axios from 'axios';
import { Order } from '@prisma/client';

interface KhqrCreateResult {
  reference: string;
  qrPayload: string;
  qrUrl: string;
  expiresAt: Date;
}

const provider = (process.env.KHQR_PROVIDER || 'mock').toLowerCase();

const toUtcReqTime = (date = new Date()): string => {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
};

const buildMockKhqr = (order: Order): KhqrCreateResult => {
  const reference = `KHQR-${order.orderNumber}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const merchantName = process.env.KHQR_MERCHANT_NAME || 'ShopHub';
  const merchantCity = process.env.KHQR_MERCHANT_CITY || 'Phnom Penh';
  const merchantId = process.env.KHQR_MERCHANT_ID || 'shophub@aba';

  const payload = [
    'KHQR-MOCK',
    `merchant=${merchantName}`,
    `city=${merchantCity}`,
    `merchantId=${merchantId}`,
    `order=${order.orderNumber}`,
    `amount=${order.total.toFixed(2)}`,
    'currency=USD',
    `ref=${reference}`,
  ].join('|');

  const staticQrImageUrl = process.env.KHQR_STATIC_QR_IMAGE_URL;
  const staticQrImagePath = process.env.KHQR_STATIC_QR_IMAGE_PATH;
  const backendPublic = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';
  const staticRouteUrl = staticQrImagePath ? `${backendPublic}/api/payments/khqr/static-image` : '';
  const qrUrl =
    staticQrImageUrl ||
    staticRouteUrl ||
    `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=320`;
  return { reference, qrPayload: payload, qrUrl, expiresAt };
};

const buildAbaKhqr = async (order: Order): Promise<KhqrCreateResult> => {
  const baseUrl = process.env.ABA_PAYWAY_BASE_URL || 'https://checkout-sandbox.payway.com.kh';
  const endpoint = process.env.ABA_KHQR_CREATE_URL || '/api/payment-gateway/v1/payments/generate-qr';
  const merchantId = process.env.ABA_PAYWAY_MERCHANT_ID;
  const apiKey = process.env.ABA_PAYWAY_API_KEY;
  if (!merchantId || !apiKey) {
    throw new Error('ABA PayWay is not configured. Set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY');
  }

  const reference = order.orderNumber.slice(-20);
  const reqTime = toUtcReqTime();
  const amount = Number(order.total.toFixed(2));
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
        price: amount,
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
    String(amount),
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
    amount,
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

  return { reference, qrPayload, qrUrl, expiresAt };
};

export const createKhqrForOrder = async (order: Order): Promise<KhqrCreateResult> => {
  if (provider === 'aba') {
    return buildAbaKhqr(order);
  }
  // "static" uses merchant-provided KHQR image URL (fixed QR)
  if (provider === 'static') {
    return buildMockKhqr(order);
  }
  return buildMockKhqr(order);
};

export const verifyKhqrWebhookSignature = (rawBody: string, signature: string | undefined): boolean => {
  const secret = process.env.ABA_KHQR_WEBHOOK_SECRET;
  if (!secret) return true; // allow in local if secret not set
  if (!signature) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
};

