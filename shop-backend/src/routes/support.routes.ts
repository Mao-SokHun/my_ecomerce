import { Router } from 'express';
import { createSupportInquiry, listSupportInquiries } from '../controllers/support.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { publicContactFormLimiter } from '../middleware/rateLimiters';

const router = Router();

router.post('/inquiries', publicContactFormLimiter, createSupportInquiry);
router.get('/inquiries', authenticate, requireAdmin, listSupportInquiries);

export default router;
