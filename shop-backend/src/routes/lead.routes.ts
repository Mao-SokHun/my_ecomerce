import { Router } from 'express';
import { createLead, listLeads } from '../controllers/lead.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { publicContactFormLimiter } from '../middleware/rateLimiters';

const router = Router();

router.post('/subscribe', publicContactFormLimiter, createLead);
router.get('/', authenticate, requireAdmin, listLeads);

export default router;
