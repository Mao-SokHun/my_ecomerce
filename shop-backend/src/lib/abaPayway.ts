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
  return Boolean(getMerchantId() && getApiKey());
}

/**
 * ABA PayWay HMAC-SHA512 hash.
 * Key = API Key, output = base64.
 */
function generateHash(dataString: string): string {
  return crypto
    .createHmac('sha512', getApiKey())
    .update(dataString)
    .digest('base64');
}

export interface AbaPaymentRequest {
  transactionId: string;
  amount: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  items: string;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  currency?: string;
}

/**
 * Build the form data payload for ABA PayWay checkout.
 *
 * Hash fields (exact order per ABA SDK):
 *   req_time + merchant_id + tran_id + amount + items + currency
 *   + type + payment_option + return_url + cancel_url
 *   + continue_success_url + return_deeplink
 */
export function buildCheckoutPayload(req: AbaPaymentRequest) {
  const merchantId = getMerchantId();
  const reqTime = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const currency = req.currency || 'USD';
  const type = 'purchase';
  const paymentOption = 'abapay cards';
  const returnDeeplink = '';

  const hashString =
    reqTime +
    merchantId +
    req.transactionId +
    req.amount +
    req.items +
    currency +
    type +
    paymentOption +
    req.returnUrl +
    req.cancelUrl +
    req.returnUrl +
    returnDeeplink;

  const hash = generateHash(hashString);

  return {
    hash,
    tran_id: req.transactionId,
    amount: req.amount,
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

/**
 * Verify callback hash from ABA PayWay push notification.
 */
export function verifyCallbackHash(transactionId: string, amount: string, receivedHash: string): boolean {
  const merchantId = getMerchantId();
  const raw = merchantId + transactionId + amount;
  const expected = generateHash(raw);
  return expected === receivedHash;
}

/**
 * Check transaction status with ABA PayWay API.
 * Hash fields: req_time + merchant_id + tran_id
 */
export async function checkTransactionStatus(transactionId: string): Promise<{
  status: number;
  description: string;
  tran_id: string;
  amount: string;
}> {
  const merchantId = getMerchantId();
  const reqTime = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const hashString = reqTime + merchantId + transactionId;
  const hash = generateHash(hashString);

  const { data } = await axios.post(ABA_CHECK_URL, {
    tran_id: transactionId,
    merchant_id: merchantId,
    req_time: reqTime,
    hash,
  });

  return data;
}
