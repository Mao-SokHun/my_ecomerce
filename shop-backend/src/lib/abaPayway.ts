import crypto from 'crypto';
import axios from 'axios';

const ABA_API_URL = process.env.ABA_PAYWAY_URL || 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase';
const ABA_CHECK_URL = process.env.ABA_PAYWAY_CHECK_URL || 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2';

function getMerchantId(): string {
  return (process.env.ABA_MERCHANT_ID || '').trim();
}

function getApiKey(): string {
  return (process.env.ABA_API_KEY || '').trim();
}

export function isAbaConfigured(): boolean {
  const id = getMerchantId();
  const key = getApiKey();
  if (!id || !key) return false;
  if (id.includes('YOUR_') || key.includes('YOUR_')) return false;
  return true;
}

/** UTC timestamp YYYYMMDDHHmmss (ABA req_time format). */
function toUtcReqTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    String(d.getUTCFullYear()) +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}

/**
 * ABA PayWay purchase hash (HMAC-SHA512, base64).
 * Field order per PayWay v2 docs:
 * req_time + merchant_id + tran_id + amount + items + shipping + ctid + pwt
 * + firstname + lastname + email + phone + type + payment_option
 * + return_url + cancel_url + continue_success_url + return_deeplink
 * + currency + custom_fields + return_params
 */
function buildPurchaseHash(parts: {
  reqTime: string;
  merchantId: string;
  tranId: string;
  amount: string;
  items: string;
  shipping: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: string;
  paymentOption: string;
  returnUrl: string;
  cancelUrl: string;
  continueSuccessUrl: string;
  returnDeeplink: string;
  currency: string;
}): string {
  const hashString =
    parts.reqTime +
    parts.merchantId +
    parts.tranId +
    parts.amount +
    parts.items +
    parts.shipping +
    '' + // ctid
    '' + // pwt
    parts.firstName +
    parts.lastName +
    parts.email +
    parts.phone +
    parts.type +
    parts.paymentOption +
    parts.returnUrl +
    parts.cancelUrl +
    parts.continueSuccessUrl +
    parts.returnDeeplink +
    parts.currency +
    '' + // custom_fields
    ''; // return_params

  return crypto.createHmac('sha512', getApiKey()).update(hashString).digest('base64');
}

export interface AbaPaymentRequest {
  transactionId: string;
  amount: string;
  shipping: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  items: string;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  currency?: string;
  paymentOption?: string;
}

export function buildCheckoutPayload(req: AbaPaymentRequest) {
  const merchantId = getMerchantId();
  const reqTime = toUtcReqTime();
  const currency = req.currency || 'USD';
  const type = 'purchase';
  const paymentOption = req.paymentOption || 'abapay';
  const returnDeeplink = '';
  const shipping = req.shipping || '0';

  const hash = buildPurchaseHash({
    reqTime,
    merchantId,
    tranId: req.transactionId,
    amount: req.amount,
    items: req.items,
    shipping,
    firstName: req.firstName,
    lastName: req.lastName,
    email: req.email,
    phone: req.phone,
    type,
    paymentOption,
    returnUrl: req.returnUrl,
    cancelUrl: req.cancelUrl,
    continueSuccessUrl: req.returnUrl,
    returnDeeplink,
    currency,
  });

  return {
    hash,
    tran_id: req.transactionId,
    amount: req.amount,
    shipping,
    firstname: req.firstName,
    lastname: req.lastName,
    phone: req.phone,
    email: req.email,
    items: req.items,
    return_url: req.returnUrl,
    cancel_url: req.cancelUrl,
    continue_success_url: req.returnUrl,
    callback_url: req.callbackUrl,
    currency,
    merchant_id: merchantId,
    req_time: reqTime,
    payment_option: paymentOption,
    type,
    api_url: ABA_API_URL,
  };
}

export async function createAbaPurchase(payload: ReturnType<typeof buildCheckoutPayload>): Promise<Record<string, unknown>> {
  const { api_url: _apiUrl, ...body } = payload;
  const { data } = await axios.post(ABA_API_URL, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000,
  });
  return data as Record<string, unknown>;
}

export function verifyCallbackHash(transactionId: string, amount: string, receivedHash: string): boolean {
  const merchantId = getMerchantId();
  const raw = merchantId + transactionId + amount;
  const expected = crypto.createHmac('sha512', getApiKey()).update(raw).digest('base64');
  return expected === receivedHash;
}

export async function checkTransactionStatus(transactionId: string): Promise<{
  status: number;
  description: string;
  tran_id: string;
  amount: string;
}> {
  const merchantId = getMerchantId();
  const reqTime = toUtcReqTime();
  const hashString = reqTime + merchantId + transactionId;
  const hash = crypto.createHmac('sha512', getApiKey()).update(hashString).digest('base64');

  const { data } = await axios.post(ABA_CHECK_URL, {
    tran_id: transactionId,
    merchant_id: merchantId,
    req_time: reqTime,
    hash,
  });

  return data;
}
