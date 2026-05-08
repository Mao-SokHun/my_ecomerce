import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createKhqr,
  getKhqrStatus,
  getKhqrStaticImage,
  khqrWebhook,
  mockConfirmKhqrPayment,
} from '../controllers/payment.controller';

const router = Router();

// Public callback for payment provider
router.post('/khqr/webhook', khqrWebhook);
router.get('/khqr/static-image', getKhqrStaticImage);

// Authenticated endpoints
router.use(authenticate);
router.post('/khqr/create', createKhqr);
router.get('/khqr/status/:orderId', getKhqrStatus);
router.post('/khqr/mock-confirm/:orderId', mockConfirmKhqrPayment);

export default router;

