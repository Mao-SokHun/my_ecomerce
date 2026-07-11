import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { sendTelegramMessage } from '../lib/notifier';

// ─── Telegram helpers ────────────────────────────────────────────────────────

const parseCsv = (value?: string): string[] =>
  String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const resolveTargets = (): string[] =>
  parseCsv(process.env.TELEGRAM_USER_CHAT_ID || process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID);

const formatDateTime24 = (value: Date): string =>
  value.toLocaleString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const priorityLabel = (p: string): string => {
  if (p === 'ORDER') return '📦 ការបញ្ជាទិញ';
  if (p === 'PAYMENT') return '💳 ការទូទាត់';
  if (p === 'PRODUCT') return '🛍️ ផលិតផល';
  return '💬 ទូទៅ';
};

const inferPriority = (text: string): 'ORDER' | 'PAYMENT' | 'PRODUCT' | 'GENERAL' => {
  const s = String(text || '').toLowerCase();
  if (/(ord-|order|tracking|ship|deliver|cancel)/.test(s)) return 'ORDER';
  if (/(pay|payment|bakong|visa|master|refund|card)/.test(s)) return 'PAYMENT';
  if (/(product|stock|color|size|variant|price)/.test(s)) return 'PRODUCT';
  return 'GENERAL';
};

// ─── Controllers ─────────────────────────────────────────────────────────────

export const createSupportInquiry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, phone, question, priority, language, source, transcript } = req.body as {
      name?: string;
      phone?: string;
      question?: string;
      priority?: string;
      language?: string;
      source?: string;
      transcript?: string;
    };

    if (!question || String(question).trim().length < 2) {
      res.status(400).json({ success: false, message: 'Question is required' });
      return;
    }

    const p = (priority || inferPriority(question)) as 'ORDER' | 'PAYMENT' | 'PRODUCT' | 'GENERAL';
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Save to DB (SupportInquiry model in schema.prisma)
    const inquiry = await prisma.supportInquiry.create({
      data: {
        name: String(name || 'Guest').slice(0, 128),
        phone: String(phone || 'N/A').slice(0, 32),
        question: String(question).slice(0, 4000),
        priority: p,
        language: String(language || 'km').slice(0, 8),
        source: String(source || 'chat-widget').slice(0, 64),
        status: 'open',
        sessionToken,
        transcript: transcript ? String(transcript).slice(0, 8000) : null,
      },
    });

    // Create the first support message
    await prisma.supportMessage.create({
      data: {
        inquiryId: inquiry.id,
        sender: 'USER',
        senderName: inquiry.name || 'Guest',
        text: inquiry.question,
      },
    });

    // Notify admin via Telegram
    const targets = resolveTargets();
    if (targets.length > 0) {
      const telegramText = [
        `🆘 ការសួរថ្មីពី Chat Widget`,
        `ប្រភព: ${inquiry.source || 'chat-widget'}`,
        `ថ្ងៃ/ម៉ោង: ${formatDateTime24(inquiry.createdAt)}`,
        `អតិថិជន: ${inquiry.name}`,
        `ទូរស័ព្ទ: ${inquiry.phone}`,
        `ប្រភេទ: ${priorityLabel(inquiry.priority || 'GENERAL')}`,
        ``,
        `❓ សំណួរ:`,
        String(question).slice(0, 500),
        inquiry.transcript
          ? [``, `📜 Transcript:`, String(inquiry.transcript).slice(0, 800)].join('\n')
          : '',
      ]
        .filter((l) => l !== undefined)
        .join('\n');

      await Promise.allSettled(
        targets.map((chatId) =>
          sendTelegramMessage({
            chatId,
            text: telegramText,
            botToken: process.env.TELEGRAM_USER_BOT_TOKEN,
          })
        )
      );
    }

    res.status(201).json({ success: true, message: 'Inquiry created', data: inquiry, sessionToken });
  } catch (error) {
    next(error);
  }
};

export const getSupportMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const rawToken = req.headers['x-session-token'] || req.query.sessionToken;
    const sessionToken = rawToken ? String(rawToken) : undefined;
    const adminUser = req.user;

    const inquiry = await prisma.supportInquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      res.status(404).json({ success: false, message: 'Inquiry not found' });
      return;
    }

    const isAdmin = adminUser?.role === 'ADMIN';
    const isOwner = inquiry.sessionToken && inquiry.sessionToken === sessionToken;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const messages = await prisma.supportMessage.findMany({
      where: { inquiryId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

export const createSupportMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { text } = req.body as { text?: string };
    const rawToken = req.headers['x-session-token'] || req.query.sessionToken;
    const sessionToken = rawToken ? String(rawToken) : undefined;
    const adminUser = req.user;

    if (!text || String(text).trim().length === 0) {
      res.status(400).json({ success: false, message: 'Message text is required' });
      return;
    }

    const inquiry = await prisma.supportInquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      res.status(404).json({ success: false, message: 'Inquiry not found' });
      return;
    }

    const isAdmin = adminUser?.role === 'ADMIN';
    const isOwner = inquiry.sessionToken && inquiry.sessionToken === sessionToken;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const sender = isAdmin ? 'ADMIN' : 'USER';
    const senderName = isAdmin ? (adminUser.name || 'Admin') : (inquiry.name || 'Guest');

    const message = await prisma.supportMessage.create({
      data: {
        inquiryId: id,
        sender,
        senderName,
        text,
      },
    });

    await prisma.supportInquiry.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        status: isAdmin ? 'in_progress' : 'open',
      },
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};


export const listSupportInquiries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const status = req.query.status ? String(req.query.status) : undefined;
    const priority = req.query.priority ? String(req.query.priority) : undefined;

    const where = {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    };

    const [inquiries, total] = await Promise.all([
      prisma.supportInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportInquiry.count({ where }),
    ]);

    res.json({
      success: true,
      data: inquiries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSupportInquiryStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body as { status?: string };
    if (!status) {
      res.status(400).json({ success: false, message: 'Status is required' });
      return;
    }
    const updated = await prisma.supportInquiry.update({
      where: { id },
      data: { status: String(status) },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
