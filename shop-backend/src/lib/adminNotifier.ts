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

  const title = event === 'NEW_ORDER' ? 'មានការកម្មង់ថ្មី (New Order)' : 'បង់ប្រាក់បានជោគជ័យ (Payment Paid)';
  const customerName = order.user?.name || 'មិនមាន';
  const customerPhone = order.address?.phone || order.user?.phone || 'មិនមាន';

  // 1. Create in-app notification records in Database
  try {
    if (event === 'NEW_ORDER') {
      // Notification for admin
      await prisma.notification.create({
        data: {
          title: `🔔 ការកុម្ម៉ង់ថ្មី #${order.orderNumber}`,
          message: `អតិថិជន ${customerName} (${customerPhone}) បានធ្វើការកុម្ម៉ង់ចំនួន ${order.items.length} មុខ សរុប ${formatMoney(order.total)}`,
          type: 'ORDER_UPDATE',
          target: 'ALL',
          link: '/admin/orders',
          sentBy: 'ប្រព័ន្ធស្វ័យប្រវត្តិ (System)',
        },
      });

      // Notification for customer (if registered)
      if (order.userId) {
        await prisma.notification.create({
          data: {
            userId: order.userId,
            title: `📦 ការកុម្ម៉ង់ #${order.orderNumber} ត្រូវបានទទួល`,
            message: `ការកុម្ម៉ង់របស់អ្នកត្រូវបានទទួលជោគជ័យ។ យើងខ្ញុំនឹងរៀបចំផ្ញើជូនបន្ទាប់ពីបានទូទាត់ប្រាក់រួចរាល់!`,
            type: 'ORDER_UPDATE',
            target: 'USER',
            link: '/orders',
            sentBy: 'SH Shop',
          },
        });
      }
    } else if (event === 'PAYMENT_PAID') {
      // Admin notification for payment
      await prisma.notification.create({
        data: {
          title: `🟢 បានទទួលការទូទាត់ប្រាក់ #${order.orderNumber}`,
          message: `ការកុម្ម៉ង់ #${order.orderNumber} របស់ ${customerName} បានទូទាត់ប្រាក់ជោគជ័យចំនួន ${formatMoney(order.total)} តាម ${khPaymentType(order.paymentMethod)}`,
          type: 'ORDER_UPDATE',
          target: 'ALL',
          link: '/admin/orders',
          sentBy: 'ប្រព័ន្ធស្វ័យប្រវត្តិ (System)',
        },
      });

      // Customer notification for payment
      if (order.userId) {
        await prisma.notification.create({
          data: {
            userId: order.userId,
            title: `✅ ការទូទាត់ប្រាក់ជោគជ័យ #${order.orderNumber}`,
            message: `យើងខ្ញុំបានទទួលការទូទាត់ប្រាក់ចំនួន ${formatMoney(order.total)} រួចរាល់ហើយ។ ទំនិញរបស់អ្នកកំពុងត្រូវបានវេចខ្ចប់ និងរៀបចំផ្ញើជូន!`,
            type: 'ORDER_UPDATE',
            target: 'USER',
            link: '/orders',
            sentBy: 'SH Shop',
          },
        });
      }
    }
  } catch (err) {
    console.error('[Notification DB Record Error]', err);
  }

  // 2. Telegram Notifications
  const targets = resolveTargets();
  if (targets.length === 0) return;

  const eventTime = event === 'PAYMENT_PAID' ? order.updatedAt : order.createdAt;
  const shippingAddress = order.address
    ? [order.address.province, order.address.district, order.address.commune, order.address.village].filter(Boolean).join(', ')
    : 'មិនមាន';
  const roadNumber = order.address?.roadNumber || order.address?.street || 'មិនមាន';
  const customerEmail = order.user?.email || 'មិនមាន';
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
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: { select: { name: true, quantity: true, price: true } },
      address: true,
    },
  });
  if (!order) return;
  const targets = resolveTargets();
  if (targets.length === 0) return;

  const shippingAddress = order.address
    ? [order.address.province, order.address.district, order.address.commune, order.address.village].filter(Boolean).join(', ')
    : 'មិនមាន';
  const roadNumber = order.address?.roadNumber || order.address?.street || 'មិនមាន';
  const customerName = order.user?.name || 'មិនមាន';
  const customerEmail = order.user?.email || 'មិនមាន';
  const customerPhone = order.address?.phone || order.user?.phone || 'មិនមាន';

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
    '⚠️ <b>អតិថិជនបានបោះបង់ការបញ្ជាទិញ (Order Cancelled)</b>',
    ``,
    `📝 <b>លេខកម្មង់:</b> <code>${order.orderNumber}</code>`,
    `📅 <b>ថ្ងៃ/ម៉ោង:</b> <i>${formatDateTime24(new Date())}</i>`,
    `👤 <b>អតិថិជន:</b> ${customerName} (${customerEmail})`,
    `📞 <b>ទូរស័ព្ទ:</b> <code>${customerPhone}</code>`,
    `📍 <b>អាសយដ្ឋានដឹកជញ្ជូន:</b> ${shippingAddress}`,
    `🏠 <b>លេខផ្ទះ/ផ្លូវ:</b> ${roadNumber}`,
    ``,
    `💳 <b>ប្រភេទបង់ប្រាក់:</b> ${khPaymentType(order.paymentMethod)}`,
    `💵 <b>ស្ថានភាពបង់ប្រាក់:</b> ${khPaymentStatus(order.paymentStatus)}`,
    `📦 <b>ស្ថានភាពកម្មង់:</b> ${khOrderStatus(order.status)}`,
    `🚚 <b>ក្រុមហ៊ុនដឹកជញ្ជូន:</b> ${khShippingCarrier(order.shippingCarrier)}`,
    ``,
    `💰 <b>តម្លៃដើម:</b> ${formatMoney(order.subtotal)}`,
    `🎟️ <b>បញ្ចុះតម្លៃ:</b> -${formatMoney(order.discount)}`,
    `🚚 <b>ថ្លៃដឹកជញ្ជូន:</b> ${formatMoney(order.shippingCost)}`,
    `💵 <b>តម្លៃសរុបដែលបានបោះបង់:</b> <b>${formatMoney(order.total)}</b> (≈ ៛${Math.round(order.total * 4100).toLocaleString()})`,
    `🛒 <b>មុខទំនិញដែលបានបោះបង់:</b> ${totalLines} មុខ (ចំនួនសរុប ${totalUnits})`,
    ``,
    `🛍️ <b>បញ្ជីមុខទំនិញ៖</b>`,
    itemsBlock || 'មិនមានទំនិញ',
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
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: { select: { name: true, quantity: true, price: true } },
      address: true,
    },
  });
  if (!order) return;

  // 1. In-app notification for customer
  try {
    if (order.userId) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: `🚚 បច្ចុប្បន្នភាពកុម្ម៉ង់ #${order.orderNumber}`,
          message: `ការកុម្ម៉ង់ #${order.orderNumber} របស់អ្នកត្រូវបានផ្លាស់ប្តូរទៅជា: ${khOrderStatus(newStatus)}`,
          type: 'ORDER_UPDATE',
          target: 'USER',
          link: '/orders',
          sentBy: 'SH Shop',
        },
      });
    }
  } catch (err) {
    console.error('[Notification Status Change Error]', err);
  }

  // 2. Telegram message
  const targets = resolveTargets();
  if (targets.length === 0) return;

  const shippingAddress = order.address
    ? [order.address.province, order.address.district, order.address.commune, order.address.village].filter(Boolean).join(', ')
    : 'មិនមាន';
  const customerName = order.user?.name || 'មិនមាន';
  const customerEmail = order.user?.email || 'មិនមាន';
  const customerPhone = order.address?.phone || order.user?.phone || 'មិនមាន';

  const itemsBlock = order.items
    .map(
      (i, idx) =>
        `<b>${idx + 1}. ${i.name}</b> (${i.quantity}x @ ${formatMoney(i.price)})`
    )
    .join('\n');

  const text = [
    '🛠️ <b>ការកែប្រែស្ថានភាពការបញ្ជាទិញ (Status Updated)</b>',
    ``,
    `📝 <b>លេខកម្មង់:</b> <code>${order.orderNumber}</code>`,
    `📅 <b>ថ្ងៃ/ម៉ោង:</b> <i>${formatDateTime24(new Date())}</i>`,
    `👤 <b>អតិថិជន:</b> ${customerName} (${customerEmail})`,
    `📞 <b>ទូរស័ព្ទ:</b> <code>${customerPhone}</code>`,
    `📍 <b>អាសយដ្ឋាន:</b> ${shippingAddress}`,
    ``,
    `🔄 <b>ស្ថានភាពចាស់:</b> ${khOrderStatus(oldStatus)}`,
    `➡️ <b>ស្ថានភាពថ្មី:</b> <b>${khOrderStatus(newStatus)}</b>`,
    `💵 <b>ស្ថានភាពបង់ប្រាក់:</b> ${khPaymentStatus(order.paymentStatus)}`,
    `💰 <b>តម្លៃសរុប:</b> <b>${formatMoney(order.total)}</b>`,
    ``,
    `🛍️ <b>មុខទំនិញ៖</b>`,
    itemsBlock || 'មិនមានទំនិញ',
  ].join('\n');

  await Promise.allSettled(targets.map((chatId) => sendTelegramMessage({ chatId, text })));
};

export const notifyAdminLowStockAlert = async (
  products: Array<{ id: string; name: string; stock: number; price: number }>
): Promise<void> => {
  if (!products || products.length === 0) return;
  const targets = resolveTargets();
  if (targets.length === 0) return;

  for (const p of products) {
    const isOutOfStock = p.stock <= 0;
    const title = isOutOfStock
      ? '🚨 <b>ទំនិញអស់ពីស្តុក (Out of Stock Alert)</b>'
      : '⚠️ <b>ទំនិញជិតអស់ពីស្តុក (Low Stock Alert)</b>';

    const stockText = isOutOfStock
      ? '🔴 <b>0 (អស់ស្តុក)</b>'
      : `🟡 <b>នៅសល់តែ ${p.stock} ប៉ុណ្ណោះ!</b>`;

    const text = [
      title,
      ``,
      `📦 <b>ឈ្មោះទំនិញ:</b> <b>${p.name}</b>`,
      `📊 <b>ស្តុកបច្ចុប្បន្ន:</b> ${stockText}`,
      `💵 <b>តម្លៃទំនិញ:</b> ${formatMoney(p.price)}`,
      `📅 <b>ពេលវេលា:</b> <i>${formatDateTime24(new Date())}</i>`,
      ``,
      `💡 <i>សូម Admin បំពេញស្តុកបន្ថែម (Restock) ក្នុង Control Center ➡️ Products។</i>`,
    ].join('\n');

    await Promise.allSettled(targets.map((chatId) => sendTelegramMessage({ chatId, text })));
  }
};
