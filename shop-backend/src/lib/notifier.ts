import nodemailer from 'nodemailer';
import twilio from 'twilio';
import axios from 'axios';
import { Resend } from 'resend';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface SmsPayload {
  to: string;
  text: string;
}

interface TelegramPayload {
  chatId: string;
  text: string;
  botToken?: string;
}

export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const resendFrom = process.env.RESEND_FROM?.trim();
  if (resendApiKey && resendFrom) {
    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: resendFrom,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      console.log(`[Email] ✅ Sent via Resend to ${payload.to}`);
      return true;
    } catch (err: any) {
      console.error(`[Email] ❌ Resend error:`, err?.message || err);
    }
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!user || !pass) {
    console.log(`[Email] ⚠️ SMTP user or password not configured; skipped email to ${payload.to}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    const info = await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    console.log(`[Email] ✅ Successfully delivered via SMTP (${host}) to ${payload.to}. MessageId: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`[Email] ❌ SMTP delivery failed to ${payload.to}:`, err?.message || err);
    if (err?.message?.includes('535') || err?.message?.includes('BadCredentials')) {
      console.error(`[Email] ⚠️ Gmail Authentication Notice: Google rejected normal password. To allow Gmail SMTP, generate a 16-character App Password at https://myaccount.google.com/apppasswords and set it as SMTP_PASS in .env`);
    }
    return false;
  }
};

export const sendSms = async (payload: SmsPayload): Promise<boolean> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    console.log(`[Invoice] Twilio not configured; skipped SMS to ${payload.to}`);
    return false;
  }

  const client = twilio(accountSid, authToken);

  await client.messages.create({
    from: fromPhone,
    to: payload.to,
    body: payload.text,
  });

  return true;
};

export const escapeTelegramHtml = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export const sendTelegramMessage = async (payload: TelegramPayload): Promise<boolean> => {
  const token =
    payload.botToken ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_USER_BOT_TOKEN ||
    '8616756630:AAHSoeWM_-V8gmUAoDtMTGbyyoT29roSfDk';

  if (!token || !payload.chatId || !payload.text) {
    console.log('[Notify] Telegram not configured; skipped Telegram message');
    return false;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: payload.chatId,
      text: payload.text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    });
    console.log(`[Telegram] ✅ Broadcast delivered to ${payload.chatId}`);
    return true;
  } catch (err: any) {
    console.error(`[Telegram] ⚠️ HTML delivery failed to ${payload.chatId}:`, err?.response?.data || err?.message);
    // Fallback: send as plain text without parse_mode if HTML entities failed
    try {
      const plain = payload.text.replace(/<[^>]*>/g, '');
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: payload.chatId,
        text: plain,
      });
      console.log(`[Telegram] ✅ Fallback plain text delivered to ${payload.chatId}`);
      return true;
    } catch (fallbackErr: any) {
      console.error(`[Telegram] ❌ Fallback plain text failed to ${payload.chatId}:`, fallbackErr?.response?.data || fallbackErr?.message);
      return false;
    }
  }
};
