import { Router } from 'express';
import {
  createOrder,
  previewCoupon,
  getUserOrders,
  getOrder,
  getOrderInvoice,
  cancelOrder,
  confirmPayment,
  createStripePaymentIntentForOrder,
  archiveOrderHistory,
  adminGetOrders,
  adminUpdateOrderStatus,
} from '../controllers/order.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { paymentRateLimiter, logPaymentAttempt } from '../middleware/security';

const router = Router();

router.use(authenticate);

router.post('/', paymentRateLimiter, logPaymentAttempt, createOrder);
router.post('/coupon-preview', previewCoupon);
router.get('/', getUserOrders);

// Static routes must come BEFORE /:id wildcard routes
router.post('/confirm-payment', paymentRateLimiter, logPaymentAttempt, confirmPayment);
router.post('/stripe-payment-intent', paymentRateLimiter, logPaymentAttempt, createStripePaymentIntentForOrder);

// Admin routes
router.get('/admin/all', requireAdmin, adminGetOrders);
router.put('/admin/:id/status', requireAdmin, adminUpdateOrderStatus);

// Wildcard /:id routes
router.get('/:id', getOrder);
router.get('/:id/invoice', getOrderInvoice);
router.delete('/:id/history', archiveOrderHistory);
router.put('/:id/cancel', cancelOrder);

export default router;
