import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createKhqrForOrder, verifyKhqrWebhookSignature } from '../lib/khqr';
import { sendInvoiceNotification } from '../lib/invoice';
import { notifyAdminOrderEvent } from '../lib/adminNotifier';
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

