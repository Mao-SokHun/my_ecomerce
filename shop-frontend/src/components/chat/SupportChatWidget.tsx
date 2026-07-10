'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supportApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';

type Msg = { role: 'user' | 'bot'; text: string };

const inferPriority = (text: string): 'ORDER' | 'PAYMENT' | 'PRODUCT' | 'GENERAL' => {
  const s = text.toLowerCase();
  if (/(ord-|order|tracking|ship|deliver|cancel)/.test(s)) return 'ORDER';
  if (/(pay|payment|bakong|visa|master|refund|card)/.test(s)) return 'PAYMENT';
  if (/(product|stock|color|size|variant|price)/.test(s)) return 'PRODUCT';
  return 'GENERAL';
};

export default function SupportChatWidget() {
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const label = {
    title: language === 'km' ? 'ជំនួយ' : language === 'zh' ? '客服支持' : 'Support',
    greeting:
      language === 'km'
        ? 'សួស្តី! តើខ្ញុំអាចជួយអ្វីបាន? (សរសេរសំណួររបស់អ្នក — យើងនឹងតបមកវិញ)'
        : language === 'zh'
          ? '您好！请描述您的问题，我们会尽快回复您。'
          : 'Hi! Describe your issue and we\'ll get back to you shortly.',
    placeholder:
      language === 'km' ? 'សរសេរសារ...' : language === 'zh' ? '输入消息...' : 'Type your message...',
    send: language === 'km' ? 'ផ្ញើ' : language === 'zh' ? '发送' : 'Send',
    talkToHuman:
      language === 'km' ? 'ផ្ញើទៅ Admin ផ្ទាល់' : language === 'zh' ? '发送给管理员' : 'Send to Admin',
    sent:
      language === 'km'
        ? '✅ Admin ទទួលបានសាររបស់អ្នកហើយ! យើងនឹងទំនាក់ទំនងតាម Telegram ឬទូរស័ព្ទ។'
        : language === 'zh'
          ? '✅ 管理员已收到您的消息！我们将通过 Telegram 或电话与您联系。'
          : '✅ Admin received your message! We\'ll contact you via Telegram or phone.',
    needPhone:
      language === 'km'
        ? '⚠️ សូមផ្ដល់លេខទូរស័ព្ទ ឬ email ក្នុងសារ ដើម្បីឱ្យ admin ទំនាក់ទំនងមកវិញ។'
        : language === 'zh'
          ? '⚠️ 请在消息中提供您的手机号或邮箱，以便我们联系您。'
          : '⚠️ Please include your phone or email so admin can reach you.',
  };

  const [messages, setMessages] = useState<Msg[]>([{ role: 'bot', text: label.greeting }]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const contactInfo = useMemo(
    () => ({
      name: user?.name || 'Guest',
      phone: user?.phone || '',
      email: user?.email || '',
    }),
    [user]
  );

  const submitToAdmin = async (question: string, forceSubmit = false) => {
    const transcript = messages.slice(-12).map((m) => `${m.role === 'user' ? 'អតិថិជន' : 'Bot'}: ${m.text}`).join('\n');
    try {
      await supportApi.createInquiry({
        name: contactInfo.name,
        phone: contactInfo.phone || contactInfo.email || 'N/A',
        question,
        priority: inferPriority(question),
        language,
        source: forceSubmit ? 'manual-button' : 'chat-widget',
        transcript,
      });
      setSubmitted(true);
      setMessages((prev) => [...prev, { role: 'bot', text: label.sent }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text:
            language === 'km'
              ? '❌ ផ្ញើមិនបាន សូមព្យាយាមម្ដងទៀត។'
              : language === 'zh'
                ? '❌ 发送失败，请重试。'
                : '❌ Failed to send. Please try again.',
        },
      ]);
    }
  };

  const send = async (inputText?: string) => {
    const text = (inputText ?? input).trim();
    if (!text || sending || submitted) return;
    setSending(true);

    const next: Msg[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');

    // Small delay to feel natural
    await new Promise((r) => setTimeout(r, 600));

    // Always forward to admin DB + Telegram
    await submitToAdmin(text, false);

    setSending(false);
  };

  const handleTalkToHuman = async () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.text || input.trim();
    if (!lastUserMsg) {
      setMessages((prev) => [...prev, { role: 'bot', text: label.needPhone }]);
      return;
    }
    setSending(true);
    await submitToAdmin(lastUserMsg, true);
    setSending(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary-600 text-white shadow-xl flex items-center justify-center hover:bg-primary-700 transition-colors"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-24px)] card p-0 overflow-hidden shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          <p className="font-semibold text-sm">{label.title}</p>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Online" />
        </div>
        <button type="button" onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 h-64 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-surface-900">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-xs p-2.5 rounded-xl leading-relaxed max-w-[85%] ${
              m.role === 'user'
                ? 'bg-primary-600 text-white ml-auto'
                : 'bg-white dark:bg-surface-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700'
            }`}
          >
            {m.text}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{language === 'km' ? 'កំពុងផ្ញើ...' : language === 'zh' ? '发送中...' : 'Sending...'}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Action button */}
      {!submitted && (
        <div className="px-3 pt-2">
          <button
            type="button"
            onClick={handleTalkToHuman}
            disabled={sending}
            className="w-full btn-secondary text-xs py-2 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-900/50 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition"
          >
            {label.talkToHuman}
          </button>
        </div>
      )}

      {/* Input */}
      {!submitted && (
        <div className="flex gap-2 p-3">
          <input
            className="input text-xs flex-1 h-9"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) send();
            }}
            placeholder={label.placeholder}
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={sending || !input.trim()}
            className="btn-primary h-9 px-3 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
