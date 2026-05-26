import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createKhqr,
  getKhqrStatus,
  getKhqrStaticImage,
  khqrWebhook,
  mockConfirmKhqrPayment,
  createAbaPayment,
  abaCallback,
  checkAbaPaymentStatus,
} from '../controllers/payment.controller';
import {
  paymentRateLimiter,
  webhookRateLimiter,
  abaIpWhitelist,
  sanitizePaymentInputs,
  logPaymentAttempt,
} from '../middleware/security';

const router = Router();

// Public callbacks — rate-limited, IP-filtered, sanitized
router.post('/khqr/webhook', webhookRateLimiter, sanitizePaymentInputs, khqrWebhook);
router.get('/khqr/static-image', getKhqrStaticImage);
router.post('/aba/callback', webhookRateLimiter, abaIpWhitelist, sanitizePaymentInputs, abaCallback);

// Authenticated endpoints — rate-limited, logged, sanitized
router.use(authenticate);
router.post('/khqr/create', paymentRateLimiter, logPaymentAttempt, createKhqr);
router.get('/khqr/status/:orderId', getKhqrStatus);
router.post('/khqr/mock-confirm/:orderId', paymentRateLimiter, logPaymentAttempt, mockConfirmKhqrPayment);
router.post('/aba/create', paymentRateLimiter, logPaymentAttempt, sanitizePaymentInputs, createAbaPayment);
router.get('/aba/status/:orderId', checkAbaPaymentStatus);

export default router;

