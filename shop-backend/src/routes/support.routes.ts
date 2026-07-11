import { Router } from 'express';
import {
  createSupportInquiry,
  listSupportInquiries,
  updateSupportInquiryStatus,
  getSupportMessages,
  createSupportMessage,
} from '../controllers/support.controller';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';
import { publicContactFormLimiter } from '../middleware/rateLimiters';

const router = Router();

// Public: any visitor or logged-in user can submit a support inquiry
router.post('/inquiries', publicContactFormLimiter, createSupportInquiry);

// Message routes: accessible by visitors (via session token) or admins
router.get('/inquiries/:id/messages', optionalAuth, getSupportMessages);
router.post('/inquiries/:id/messages', optionalAuth, createSupportMessage);

// Admin-only: list with pagination + filters
router.get('/inquiries', authenticate, requireAdmin, listSupportInquiries);

// Admin-only: update inquiry status (open → in_progress → resolved)
router.patch('/inquiries/:id/status', authenticate, requireAdmin, updateSupportInquiryStatus);

export default router;

