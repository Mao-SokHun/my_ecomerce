import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/setting.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Public route to get site settings
router.get('/', getSettings);

// Admin route to update site settings (Super Admin only)
router.put('/', authenticate, requireSuperAdmin, updateSettings);

export default router;
