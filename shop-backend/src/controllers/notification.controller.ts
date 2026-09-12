import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendTelegramMessage } from '../lib/notifier';
import { emitToAdmin, emitToUser, broadcastRealtime } from '../lib/socket';

// ─── HELPER: Parse CSV string ───────────────────────────────────────────────
const parseCsv = (v?: string): string[] =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// ─── ADMIN: Broadcast / Send Notification ──────────────────────────────────
export const broadcastNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    const {
      title,
      message,
      type = 'ANNOUNCEMENT',
      target = 'ALL',
      targetUserIdentifier,
      link,
      sendTelegram = false,
    } = req.body;

    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ success: false, message: 'Title and message are required' });
      return;
    }

    let targetUserId: string | null = null;
    let targetUserName: string | null = null;
    let targetUserEmail: string | null = null;

    // Resolve specific user if targeted
    if (target === 'USER') {
      if (!targetUserIdentifier?.trim()) {
        res.status(400).json({ success: false, message: 'Please specify a customer name, email, phone or user ID' });
        return;
      }

      const identifier = targetUserIdentifier.trim();
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: identifier },
            { email: { equals: identifier, mode: 'insensitive' } },
            { phone: identifier },
            { name: { contains: identifier, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, email: true, phone: true },
      });

      if (!user) {
        res.status(404).json({ success: false, message: `No customer found matching "${identifier}"` });
        return;
      }

      targetUserId = user.id;
      targetUserName = user.name;
      targetUserEmail = user.email;
    }

    // Create Notification Record in Database
    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: title.trim(),
        message: message.trim(),
        type,
        target,
        link: link?.trim() || null,
        sentBy: adminUser?.name || 'Administrator',
      },
    });

    // Optionally broadcast to Telegram channel / subscribers
    if (sendTelegram) {
      const telegramTargets = parseCsv(
        process.env.TELEGRAM_USER_CHAT_ID || process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID
      );
      const botToken = process.env.TELEGRAM_USER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

      const typeEmoji =
        type === 'PROMOTION'
          ? '🎁'
          : type === 'URGENT'
          ? '🚨'
          : type === 'ORDER_UPDATE'
          ? '📦'
          : '📢';

      const telegramLines = [
        `<b>${typeEmoji} ការជូនដំណឹងពី SH-Shop</b>`,
        `<b>ចំណងជើង:</b> ${title.trim()}`,
        ``,
        `${message.trim()}`,
      ];

      if (target === 'USER' && targetUserName) {
        telegramLines.push(``, `👤 <i>ផ្ញើជូនអតិថិជន: ${targetUserName} (${targetUserEmail || targetUserId})</i>`);
      } else if (target === 'SUBSCRIBERS') {
        telegramLines.push(``, `📬 <i>ផ្ញើជូនអ្នកចុះឈ្មោះ Subscribe ទាំងអស់</i>`);
      } else {
        telegramLines.push(``, `🌐 <i>ផ្ញើជូនអតិថិជនទាំងអស់</i>`);
      }

      if (link?.trim()) {
        telegramLines.push(`🔗 <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${link.trim()}">ចូលមើលលម្អិត</a>`);
      }

      const telegramText = telegramLines.join('\n');

      if (telegramTargets.length > 0 && botToken) {
        await Promise.allSettled(
          telegramTargets.map((chatId) =>
            sendTelegramMessage({
              chatId,
              text: telegramText,
              botToken,
            })
          )
        );
      }
    }

    // Realtime notification dispatch
    if (target === 'USER' && targetUserId) {
      emitToUser(targetUserId, 'NOTIFICATION_NEW', notification);
    } else {
      broadcastRealtime('NOTIFICATION_NEW', notification);
    }
    emitToAdmin('NOTIFICATION_CREATED', notification);

    res.status(201).json({
      success: true,
      message:
        target === 'USER'
          ? `បានផ្ញើសេចក្តីជូនដំណឹងទៅកាន់ ${targetUserName || 'អតិថិជន'} ដោយជោគជ័យ!`
          : target === 'SUBSCRIBERS'
          ? 'បានផ្ញើសេចក្តីជូនដំណឹងទៅកាន់អ្នក Subscribe ទាំងអស់ដោយជោគជ័យ!'
          : 'បានប្រកាសសេចក្តីជូនដំណឹងទៅកាន់អតិថិជនទាំងអស់ដោយជោគជ័យ!',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get All Broadcast Notifications ─────────────────────────────────
export const getAdminNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (type && type !== 'ALL') {
      where.type = type;
    }
    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { message: { contains: search.trim(), mode: 'insensitive' } },
        { sentBy: { contains: search.trim(), mode: 'insensitive' } },
        { user: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, avatar: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Delete Notification ─────────────────────────────────────────────
export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.notification.delete({
      where: { id },
    });
    emitToAdmin('NOTIFICATION_DELETED', { id });
    broadcastRealtime('NOTIFICATION_DELETED', { id });
    res.json({ success: true, message: 'សេចក្តីជូនដំណឹងត្រូវបានលុបដោយជោគជ័យ' });
  } catch (error) {
    next(error);
  }
};

// ─── CUSTOMER: Get Customer Notifications ───────────────────────────────────
export const getCustomerNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    // Combine global broadcast notifications (target = ALL) and personal notifications (userId)
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ target: 'ALL' }, ...(userId ? [{ userId }] : [])],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// ─── CUSTOMER: Get Unread Count ─────────────────────────────────────────────
export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    const count = await prisma.notification.count({
      where: {
        isRead: false,
        OR: [{ target: 'ALL' }, ...(userId ? [{ userId }] : [])],
      },
    });

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

// ─── CUSTOMER: Mark Single Notification As Read ─────────────────────────────
export const markNotificationAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

// ─── CUSTOMER: Mark All Notifications As Read ───────────────────────────────
export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    await prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [{ target: 'ALL' }, ...(userId ? [{ userId }] : [])],
      },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// ─── PUBLIC: Get Latest Active Store Announcement ───────────────────────────
export const getLatestStoreAnnouncement = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const announcement = await prisma.notification.findFirst({
      where: {
        target: 'ALL',
        type: { in: ['ANNOUNCEMENT', 'PROMOTION', 'URGENT'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: announcement || null,
    });
  } catch (error) {
    next(error);
  }
};
