import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/setting.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Public route to get site settings
router.get('/', getSettings);

// Admin route to update site settings
router.put('/', authenticate, requireAdmin, updateSettings);

export default router;
