import { Router } from 'express';
import {
  createSupportInquiry,
  listSupportInquiries,
  updateSupportInquiryStatus,
} from '../controllers/support.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { publicContactFormLimiter } from '../middleware/rateLimiters';

const router = Router();

// Public: any visitor or logged-in user can submit a support inquiry
router.post('/inquiries', publicContactFormLimiter, createSupportInquiry);

// Admin-only: list with pagination + filters
router.get('/inquiries', authenticate, requireAdmin, listSupportInquiries);

// Admin-only: update inquiry status (open → in_progress → resolved)
router.patch('/inquiries/:id/status', authenticate, requireAdmin, updateSupportInquiryStatus);

export default router;
