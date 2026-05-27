import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createKhqrForOrder, verifyKhqrWebhookSignature } from '../lib/khqr';
import { sendInvoiceNotification } from '../lib/invoice';
import { notifyAdminOrderEvent } from '../lib/adminNotifier';
import { isAbaConfigured, buildCheckoutPayload, verifyCallbackHash, checkTransactionStatus, createAbaPurchase } from '../lib/abaPayway';
import { isWebhookReplay } from '../middleware/security';
import path from 'path';

export const createKhqr = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId } = req.body as { orderId?: string };
    if (!orderId) throw new AppError('orderId is required', 400);

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user!.id },
    });

    if (!order) throw new AppError('Order not found', 404);
    if (order.paymentStatus === 'PAID') throw new AppError('Order already paid', 400);
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') throw new AppError('This order cannot be paid', 400);

    if (order.paymentMethod !== 'bakong') {
      await prisma.order.update({ where: { id: order.id }, data: { paymentMethod: 'bakong' } });
    }

    if (order.khqrPayload && order.khqrQrUrl && order.khqrExpiresAt && order.khqrExpiresAt > new Date()) {
      res.json({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.total,
          currency: 'USD',
          reference: order.khqrRef,
          qrString: order.khqrPayload,
          qrImageUrl: order.khqrQrUrl,
          expiresAt: order.khqrExpiresAt,
        },
      });
      return;
    }

    const khqr = await createKhqrForOrder(order);

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        khqrRef: khqr.reference,
        khqrPayload: khqr.qrPayload,
        khqrQrUrl: khqr.qrUrl,
        khqrExpiresAt: khqr.expiresAt,
      },
    });

    res.json({
      success: true,
      data: {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        amount: updated.total,
        currency: 'USD',
        reference: updated.khqrRef,
        qrString: updated.khqrPayload,
        qrImageUrl: updated.khqrQrUrl,
        expiresAt: updated.khqrExpiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getKhqrStaticImage = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const staticPath = process.env.KHQR_STATIC_QR_IMAGE_PATH;
    if (!staticPath) throw new AppError('KHQR static image path is not configured', 404);
    const absolutePath = path.isAbsolute(staticPath)
      ? staticPath
      : path.resolve(process.cwd(), staticPath);
    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
};

export const getKhqrStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderId = String(req.params.orderId);
    const order = await prisma.order.findFirst({
      where: req.user!.role === 'ADMIN' ? { id: orderId } : { id: orderId, userId: req.user!.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        khqrRef: true,
        khqrQrUrl: true,
        khqrPayload: true,
        khqrExpiresAt: true,
      },
    });
    if (!order) throw new AppError('Order not found', 404);

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const khqrWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const signature = req.headers['x-khqr-signature'] as string | undefined;
    const rawBody = JSON.stringify(req.body || {});
    if (!verifyKhqrWebhookSignature(rawBody, signature)) {
      throw new AppError('Invalid webhook signature', 401);
    }

    const payload = req.body as {
      reference?: string;
      orderNumber?: string;
      status?: string;
      transactionId?: string;
    };

    const isPaid = String(payload.status || '').toUpperCase() === 'PAID';
    if (!isPaid) {
      res.json({ success: true, message: 'Ignored non-paid webhook' });
      return;
    }

    const webhookKey = payload.reference || payload.orderNumber || payload.transactionId || '';
    if (webhookKey && isWebhookReplay('khqr', webhookKey)) {
      console.warn('[KHQR] Duplicate webhook blocked for:', webhookKey);
      res.json({ success: true, message: 'Already processed' });
      return;
    }

    const order = await prisma.order.findFirst({
      where: payload.reference
        ? { khqrRef: payload.reference }
        : payload.orderNumber
          ? { orderNumber: payload.orderNumber }
          : undefined,
    });

    if (!order) throw new AppError('Order not found for webhook', 404);

    if (order.paymentStatus !== 'PAID') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          paymentIntentId: payload.transactionId || order.paymentIntentId,
        },
      });

      sendInvoiceNotification(order.id).catch((err) => console.error('[KHQR] Invoice notification failed', err));
      notifyAdminOrderEvent(order.id, 'PAYMENT_PAID').catch((err) => console.error('[KHQR] Admin payment notification failed', err));
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const mockConfirmKhqrPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderId = String(req.params.orderId);
    const order = await prisma.order.findFirst({ where: { id: orderId, userId: req.user!.id } });
    if (!order) throw new AppError('Order not found', 404);
    if (order.paymentMethod !== 'bakong') throw new AppError('Order is not Bakong payment', 400);

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
    });

    sendInvoiceNotification(order.id).catch((err) => console.error('[KHQR] Invoice notification failed', err));
    notifyAdminOrderEvent(order.id, 'PAYMENT_PAID').catch((err) => console.error('[KHQR] Admin payment notification failed', err));
    res.json({ success: true, message: 'Mock KHQR payment confirmed' });
  } catch (error) {
    next(error);
  }
};

/* ─────────────── ABA PayWay ─────────────── */

export const createAbaPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAbaConfigured()) throw new AppError('ABA PayWay is not configured', 503);

    const { orderId } = req.body as { orderId?: string };
    if (!orderId) throw new AppError('orderId is required', 400);

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user!.id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    if (!order) throw new AppError('Order not found', 404);
    if (order.paymentStatus === 'PAID') throw new AppError('Order already paid', 400);
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new AppError('This order cannot be paid', 400);
    }

    if (order.paymentMethod !== 'aba') {
      await prisma.order.update({ where: { id: order.id }, data: { paymentMethod: 'aba' } });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4000';

    const nameParts = (order.user.name || 'Customer').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const itemsJson = JSON.stringify(
      order.items.map((i) => ({
        name: String(i.product.name).slice(0, 100),
        quantity: i.quantity,
        price: Number(i.price).toFixed(2),
      }))
    );
    const itemsSummary = Buffer.from(itemsJson).toString('base64');

    const payload = buildCheckoutPayload({
      transactionId: order.orderNumber,
      amount: Number(order.total).toFixed(2),
      shipping: Number(order.shippingCost || 0).toFixed(2),
      firstName,
      lastName,
      phone: order.user.phone || '0000000000',
      email: order.user.email || 'customer@shophub.local',
      items: itemsSummary,
      returnUrl: `${frontendUrl}/dashboard/orders/${order.id}?aba=success`,
      cancelUrl: `${frontendUrl}/dashboard/orders/${order.id}?aba=cancelled`,
      callbackUrl: `${backendUrl}/api/payments/aba/callback`,
      currency: 'USD',
      paymentOption: 'abapay',
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: `aba_${order.orderNumber}` },
    });

    const purchaseRes = await createAbaPurchase(payload);
    const statusObj = (purchaseRes.status || {}) as { code?: string; message?: string };
    const statusCode = String(statusObj.code || '');
    if (statusCode !== '00') {
      throw new AppError(statusObj.message || 'Failed to initiate ABA payment', 400);
    }

    const qrBase64Candidate = Object.values(purchaseRes).find(
      (v) => typeof v === 'string' && String(v).length > 800
    ) as string | undefined;

    const deeplink = (purchaseRes.abapay_deeplink as string | undefined) || null;
    const qrStringMatch = deeplink ? deeplink.match(/[?&]qrcode=([^&]+)/i) : null;
    const qrString = qrStringMatch ? decodeURIComponent(qrStringMatch[1]) : null;

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: statusObj,
        deeplink,
        qrString,
        appStore: (purchaseRes.app_store as string | undefined) || null,
        playStore: (purchaseRes.play_store as string | undefined) || null,
        qrBase64: qrBase64Candidate || null,
        raw: purchaseRes,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const abaCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tran_id, status, amount, hash } = req.body as {
      tran_id?: string;
      status?: string;
      amount?: string;
      hash?: string;
    };

    console.log('[ABA] Callback received:', { tran_id, status, amount });

    if (!tran_id) {
      res.status(400).json({ success: false, message: 'Missing tran_id' });
      return;
    }

    if (isWebhookReplay('aba', tran_id)) {
      console.warn('[ABA] Duplicate callback blocked for tran_id:', tran_id);
      res.json({ success: true, message: 'Already processed' });
      return;
    }

    const order = await prisma.order.findFirst({
      where: { orderNumber: tran_id },
    });

    if (!order) {
      console.error('[ABA] Order not found for tran_id:', tran_id);
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (hash && amount && !verifyCallbackHash(tran_id, amount, hash)) {
      console.error('[ABA] Invalid callback hash for tran_id:', tran_id);
      res.status(401).json({ success: false, message: 'Invalid hash' });
      return;
    }

    const isPaid = String(status || '').toUpperCase() === '0' || String(status || '').toUpperCase() === 'APPROVED';

    if (isPaid && order.paymentStatus !== 'PAID') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
      });

      sendInvoiceNotification(order.id).catch(err => console.error('[ABA] Invoice notification failed', err));
      notifyAdminOrderEvent(order.id, 'PAYMENT_PAID').catch(err => console.error('[ABA] Admin notification failed', err));
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const checkAbaPaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAbaConfigured()) throw new AppError('ABA PayWay is not configured', 503);

    const orderId = String(req.params.orderId);
    const order = await prisma.order.findFirst({
      where: req.user!.role === 'ADMIN' ? { id: orderId } : { id: orderId, userId: req.user!.id },
      select: { id: true, orderNumber: true, paymentStatus: true, paymentMethod: true },
    });

    if (!order) throw new AppError('Order not found', 404);

    if (order.paymentStatus === 'PAID') {
      res.json({ success: true, data: { status: 'PAID', orderId: order.id } });
      return;
    }

    try {
      const abaStatus = await checkTransactionStatus(order.orderNumber);
      const isPaid = abaStatus.status === 0;

      if (isPaid) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
        });
        sendInvoiceNotification(order.id).catch(err => console.error('[ABA] Invoice notification failed', err));
        notifyAdminOrderEvent(order.id, 'PAYMENT_PAID').catch(err => console.error('[ABA] Admin notification failed', err));
      }

      res.json({
        success: true,
        data: {
          status: isPaid ? 'PAID' : 'PENDING',
          orderId: order.id,
          abaStatus: abaStatus.description,
        },
      });
    } catch (abaErr) {
      console.error('[ABA] Check transaction API error', abaErr);
      res.json({
        success: true,
        data: { status: order.paymentStatus, orderId: order.id },
      });
    }
  } catch (error) {
    next(error);
  }
};

