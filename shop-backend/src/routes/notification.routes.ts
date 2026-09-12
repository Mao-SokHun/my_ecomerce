import { Router } from 'express';
import {
  broadcastNotification,
  getAdminNotifications,
  deleteNotification,
  getCustomerNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getLatestStoreAnnouncement,
} from '../controllers/notification.controller';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// ─── PUBLIC STORE ANNOUNCEMENT ──────────────────────────────────────────────
router.get('/store-announcement', getLatestStoreAnnouncement);

// ─── CUSTOMER NOTIFICATIONS ─────────────────────────────────────────────────
router.get('/', optionalAuth, getCustomerNotifications);
router.get('/unread-count', optionalAuth, getUnreadCount);
router.put('/:id/read', optionalAuth, markNotificationAsRead);
router.put('/read-all', optionalAuth, markAllNotificationsAsRead);

// ─── ADMIN BROADCAST & MANAGEMENT ───────────────────────────────────────────
router.post('/admin/broadcast', authenticate, requireAdmin, broadcastNotification);
router.get('/admin/list', authenticate, requireAdmin, getAdminNotifications);
router.delete('/admin/:id', authenticate, requireAdmin, deleteNotification);

export default router;
