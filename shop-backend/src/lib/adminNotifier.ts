import prisma from './prisma';
import { formatInvoicePaymentType } from './invoice';
import { sendTelegramMessage } from './notifier';

type AdminEvent = 'NEW_ORDER' | 'PAYMENT_PAID';

const parseCsv = (value?: string): string[] =>
  String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const resolveTargets = (): string[] =>
  parseCsv(process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID);

const formatMoney = (value: number): string => `$${Number(value || 0).toFixed(2)}`;
const formatDateTime24 = (value: Date): string =>
  value.toLocaleString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const khOrderStatus = (value: string): string => {
  const v = String(value || '').toUpperCase();
  if (v === 'PENDING') return '⏳ កំពុងរង់ចាំ (Pending)';
  if (v === 'CONFIRMED') return '✅ បានបញ្ជាក់ (Confirmed)';
  if (v === 'PROCESSING') return '⚙️ កំពុងរៀបចំ (Processing)';
  if (v === 'SHIPPED') return '🚚 បានដឹកចេញ (Shipped)';
  if (v === 'DELIVERED') return '🎉 បានដឹកដល់ (Delivered)';
  if (v === 'CANCELLED') return '❌ បានបោះបង់ (Cancelled)';
  if (v === 'REFUNDED') return '💵 សងប្រាក់វិញ (Refunded)';
  return value || 'មិនមាន';
};

const khPaymentStatus = (value: string): string => {
  const v = String(value || '').toUpperCase();
  if (v === 'PAID') return '🟢 បានបង់ប្រាក់ (Paid)';
  if (v === 'PENDING') return '🔴 មិនទាន់បង់ប្រាក់ (Pending)';
  if (v === 'FAILED') return '❌ បង់ប្រាក់បរាជ័យ (Failed)';
  if (v === 'REFUNDED') return '💵 បានសងប្រាក់វិញ (Refunded)';
  return value || 'មិនមាន';
};

const khShippingCarrier = (value?: string | null): string => {
  const v = String(value || '').toUpperCase();
  if (v === 'VET') return 'VET (វីរៈប៊ុនថាំ)';
  if (v === 'JNT') return 'J&T (ជេអែនធី)';
  return 'មិនមាន';
};

const khPaymentType = (value?: string | null): string => {
  const v = String(value || '').toLowerCase();
  if (v === 'bakong' || v === 'khqr') return '🏦 បង់តាមបាគង (KHQR)';
  if (v === 'cod' || v === 'cash') return '💵 បង់ប្រាក់ពេលទទួល (COD)';
  if (v === 'card') return '💳 បង់តាម Visa/Master card';
  if (v === 'aba') return '🏛️ បង់តាម ABA PayWay';
  return v ? `🏦 ${v}` : '🏦 បង់តាមបាគង (KHQR)';
};

export const notifyAdminOrderEvent = async (orderId: string, event: AdminEvent): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: { select: { name: true, quantity: true, price: true } },
      address: true,
    },
  });
  if (!order) return;
  const targets = resolveTargets();
  if (targets.length === 0) return;

  const title = event === 'NEW_ORDER' ? 'មានការកម្មង់ថ្មី (New Order)' : 'បង់ប្រាក់បានជោគជ័យ (Payment Paid)';
  const eventTime = event === 'PAYMENT_PAID' ? order.updatedAt : order.createdAt;
  const shippingAddress = order.address
    ? [order.address.province, order.address.district, order.address.commune, order.address.village].filter(Boolean).join(', ')
    : 'មិនមាន';
  const roadNumber = order.address?.roadNumber || order.address?.street || 'មិនមាន';
  const customerName = order.user?.name || 'មិនមាន';
  const customerEmail = order.user?.email || 'មិនមាន';
  const customerPhone = order.address?.phone || order.user?.phone || 'មិនមាន';
  const couponLabel = order.couponCode
    ? `${order.couponCode} (${
        String(order.couponDiscountType || '').toUpperCase() === 'PERCENTAGE'
          ? `${Number(order.couponDiscountValue || 0).toFixed(2)}%`
          : formatMoney(Number(order.couponDiscountValue || 0))
      })`
    : 'មិនមាន';

  const itemsBlock = order.items
    .map(
      (i, idx) =>
        `<b>${idx + 1}. ${i.name}</b>\n` +
        `   - ចំនួន: ${i.quantity}\n` +
        `   - តម្លៃ: ${formatMoney(i.price)} | សរុប: ${formatMoney(i.price * i.quantity)}`
    )
    .join('\n');

  const totalUnits = order.items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
  const totalLines = order.items.length;

  const text = [
    `🔔 <b>${title}</b>`,
    ``,
    `📝 <b>លេខកម្មង់:</b> <code>${order.orderNumber}</code>`,
    `📅 <b>ថ្ងៃ/ម៉ោង:</b> <i>${formatDateTime24(eventTime || new Date())}</i>`,
    `👤 <b>អតិថិជន:</b> ${customerName} (${customerEmail})`,
    `📞 <b>ទូរស័ព្ទ:</b> <code>${customerPhone}</code>`,
    `📍 <b>អាសយដ្ឋានដឹកជញ្ជូន:</b> ${shippingAddress}`,
    `🏠 <b>លេខផ្ទះ/ផ្លូវ:</b> ${roadNumber}`,
    ``,
    `💳 <b>ប្រភេទបង់ប្រាក់:</b> ${khPaymentType(order.paymentMethod)}`,
    `💵 <b>ស្ថានភាពបង់ប្រាក់:</b> ${khPaymentStatus(order.paymentStatus)}`,
    `📦 <b>ស្ថានភាពកម្មង់:</b> ${khOrderStatus(order.status)}`,
    `🚚 <b>ក្រុមហ៊ុនដឹកជញ្ជូន:</b> ${khShippingCarrier(order.shippingCarrier)}`,
    `🎫 <b>Coupon:</b> ${couponLabel}`,
    ``,
    `💰 <b>តម្លៃដើម:</b> ${formatMoney(order.subtotal)}`,
    `🎟️ <b>បញ្ចុះតម្លៃ:</b> -${formatMoney(order.discount)}`,
    `🚚 <b>ថ្លៃដឹកជញ្ជូន:</b> ${formatMoney(order.shippingCost)}`,
    `💵 <b>តម្លៃសរុប:</b> <b>${formatMoney(order.total)}</b>`,
    `🛒 <b>មុខទំនិញសរុប:</b> ${totalLines} មុខ (ចំនួនសរុប ${totalUnits})`,
    ``,
    `🛍️ <b>មុខទំនិញ៖</b>`,
    itemsBlock || 'មិនមានទំនិញ',
  ].join('\n');

  const botToken = event === 'PAYMENT_PAID' ? process.env.TELEGRAM_PAYMENT_BOT_TOKEN : undefined;
  await Promise.allSettled(targets.map((chatId) => sendTelegramMessage({ chatId, text, botToken })));
};

export const notifyAdminUserCancelledOrder = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!order) return;
  const targets = resolveTargets();
  if (targets.length === 0) return;

  const customerName = order.user?.name || 'មិនមាន';
  const customerPhone = order.user?.phone || 'មិនមាន';

  const text = [
    '⚠️ <b>អតិថិជនបានបោះបង់ការបញ្ជាទិញ (Order Cancelled)</b>',
    ``,
    `📝 <b>លេខកម្មង់:</b> <code>${order.orderNumber}</code>`,
    `📅 <b>ថ្ងៃ/ម៉ោង:</b> <i>${formatDateTime24(new Date())}</i>`,
    `👤 <b>អតិថិជន:</b> ${customerName}`,
    `📞 <b>ទូរស័ព្ទ:</b> <code>${customerPhone}</code>`,
    `💵 <b>ស្ថានភាពបង់ប្រាក់:</b> ${khPaymentStatus(order.paymentStatus)}`,
    `📦 <b>ស្ថានភាពកម្មង់:</b> ${khOrderStatus(order.status)}`,
  ].join('\n');

  await Promise.allSettled(targets.map((chatId) => sendTelegramMessage({ chatId, text })));
};

export const notifyAdminOrderStatusChanged = async (
  orderId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!order) return;
  const targets = resolveTargets();
  if (targets.length === 0) return;

  const customerName = order.user?.name || 'មិនមាន';
  const customerPhone = order.user?.phone || 'មិនមាន';

  const text = [
    '🛠️ <b>ការកែប្រែស្ថានភាពការបញ្ជាទិញ (Status Updated)</b>',
    ``,
    `📝 <b>លេខកម្មង់:</b> <code>${order.orderNumber}</code>`,
    `📅 <b>ថ្ងៃ/ម៉ោង:</b> <i>${formatDateTime24(new Date())}</i>`,
    `👤 <b>អតិថិជន:</b> ${customerName}`,
    `📞 <b>ទូរស័ព្ទ:</b> <code>${customerPhone}</code>`,
    `🔄 <b>ស្ថានភាពចាស់:</b> ${khOrderStatus(oldStatus)}`,
    `➡️ <b>ស្ថានភាពថ្មី:</b> <b>${khOrderStatus(newStatus)}</b>`,
    `💵 <b>ស្ថានភាពបង់ប្រាក់:</b> ${khPaymentStatus(order.paymentStatus)}`,
  ].join('\n');

  await Promise.allSettled(targets.map((chatId) => sendTelegramMessage({ chatId, text })));
};
