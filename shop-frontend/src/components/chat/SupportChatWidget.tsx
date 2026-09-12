'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Phone,
  Mail,
  Facebook,
  Send as TelegramIcon,
  RefreshCw,
  User,
  ShieldCheck,
  Minus,
  Bell,
  Headphones,
  ArrowRight,
  Loader2,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { supportApi } from '@/lib/api';
import { playMessageAlertChime } from '@/lib/soundAlert';
import { useRealtime } from '@/providers/RealtimeProvider';
import toast from 'react-hot-toast';

type Msg = {
  role: 'user' | 'bot' | 'admin';
  text: string;
  senderName?: string;
  createdAt?: string;
  isContactOptions?: boolean;
};

type FAQItem = {
  key: string;
  question: { km: string; en: string; zh: string };
  answer: { km: string; en: string; zh: string };
};

export default function SupportChatWidget() {
  const pathname = usePathname();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  // Drag tracking to distinguish click vs drag
  const isDraggingRef = useRef(false);
  const prevAdminMsgCountRef = useRef<number>(0);
  const isFirstLoadRef = useRef(true);

  // Live Chat States
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [tempInput, setTempInput] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [lastPendingQuestion, setLastPendingQuestion] = useState<{ name: string; phone: string; text: string } | null>(null);

  // Auto-fill user information if logged in
  useEffect(() => {
    if (user) {
      if (user.name && !clientName) setClientName(user.name);
      if (user.phone && !clientPhone) setClientPhone(user.phone);
    }
  }, [user, clientName, clientPhone]);

  // FAQ Data definition
  const faqList: FAQItem[] = [
    {
      key: 'order_status',
      question: {
        km: '📦 របៀបឆែកមើលស្ថានភាពការបញ្ជាទិញ',
        en: '📦 How to check order status',
        zh: '📦 如何查询订单状态',
      },
      answer: {
        km: 'របៀបឆែកមើលស្ថានភាព Order ៖ ចូលទៅកាន់គណនីរបស់អ្នក ➔ "ការបញ្ជាទិញរបស់ខ្ញុំ" ដើម្បីមើលស្ថានភាពចុងក្រោយ (Pending, Confirmed, Shipped, Delivered)។',
        en: 'To check order status: Go to your Account ➔ "My Orders" to see the latest status (Pending, Confirmed, Shipped, Delivered).',
        zh: '如何查询订单状态：登录您的账户 ➔ “我的订单”，即可查看当前状态（待付款、已确认、已发货、已送达）。',
      },
    },
    {
      key: 'payment',
      question: {
        km: '💳 របៀបទូទាត់ប្រាក់តាម KHQR / Bakong',
        en: '💳 How to pay via KHQR / Bakong',
        zh: '💳 如何通过 KHQR / Bakong 付款',
      },
      answer: {
        km: 'យើងខ្ញុំទទួលការទូទាត់តាម Bakong KHQR (ស្កែនបានគ្រប់ធនាគារទាំងអស់ដូចជា ABA, ACLEDA, Canadia, Wing, etc.) ទាំងប្រាក់រៀល (KHR) និងដុល្លារ (USD) ដោយសុវត្ថិភាពខ្ពស់។',
        en: 'We accept payments via Bakong KHQR (Scan from any KH bank app: ABA, ACLEDA, Wing, Canadia, etc.) in both USD and KHR safely.',
        zh: '我们支持 Bakong KHQR 扫码支付（支持所有柬埔寨银行 APP），支持美元（USD）和瑞尔（KHR）。',
      },
    },
    {
      key: 'shipping',
      question: {
        km: '🚚 ព័ត៌មានដឹកជញ្ជូន និងថ្លៃសេវា',
        en: '🚚 Shipping info & fees',
        zh: '🚚 配送信息与费用',
      },
      answer: {
        km: 'ព័ត៌មានសេវាដឹកជញ្ជូន៖\n- ភ្នំពេញ៖ ១ ទៅ ២ ថ្ងៃ ($1.00)\n- តាមខេត្ត៖ ២ ទៅ ៣ ថ្ងៃតាមរយៈក្រុមហ៊ុន VET ឬ J&T ($1.00)\n*ឥតគិតថ្លៃសម្រាប់ការទិញចាប់ពី $50 ឡើងទៅ!*',
        en: 'Shipping details:\n- Phnom Penh: 1-2 days ($1.00)\n- Provinces: 2-3 days via VET or J&T Express ($1.00)\n*Free shipping for orders over $50!*',
        zh: '配送信息：\n- 金边：1 至 2 天（$1.00）\n- 其他省份：2 至 3 天，通过 VET 或 J&T 快递（$1.00）\n*订单满 $50 免运费！*',
      },
    },
    {
      key: 'hours_address',
      question: {
        km: '⏱️ ម៉ោងធ្វើការ និងអាសយដ្ឋានហាង',
        en: '⏱️ Working hours & Address',
        zh: '⏱️ 营业时间与地址',
      },
      answer: {
        km: 'ព័ត៌មានហាង៖\n- ម៉ោងធ្វើការ៖ រៀងរាល់ថ្ងៃ ម៉ោង 8:00 ព្រឹក - 9:00 យប់\n- អាសយដ្ឋាន៖ ផ្ទះលេខ ២៤៧, ផ្លូវបឹងសាឡាង, ទួលគោក, ភ្នំពេញ។',
        en: 'Store Information:\n- Working hours: Daily 8:00 AM - 9:00 PM\n- Address: 247 Beong Salang St, Toul Kork, Phnom Penh.',
        zh: '店铺信息：\n- 营业时间：每日早上 8:00 - 晚上 9:00\n- 地址：金边市堆谷区沙南社路 247 号。',
      },
    },
  ];

  const label = {
    title: language === 'km' ? 'ជំនួយការ SH-Shop' : language === 'zh' ? 'SH-Shop 智能助理' : 'SH-Shop Assistant',
    liveTitle: language === 'km' ? 'ជជែកជាមួយ Admin ផ្ទាល់' : language === 'zh' ? '人工客服' : 'Live Admin Support',
    greeting:
      language === 'km'
        ? 'សួស្តី! ខ្ញុំជាជំនួយការវៃឆ្លាតរបស់ SH-Shop។ តើអ្នកចង់សួរអំពីអ្វីដែរ? សូមជ្រើសរើសសំណួរគំរូខាងក្រោម ឬជជែកជាមួយ Admin ផ្ទាល់៖'
        : language === 'zh'
          ? '您好！我是 SH-Shop 智能助理。请选择常见问题或直接联系人工客服：'
          : 'Hi! I am the SH-Shop Smart Assistant. Choose a topic below or chat directly with Admin:',
    talkToHuman:
      language === 'km' ? '💬 ជជែកជាមួយ Admin ផ្ទាល់' : language === 'zh' ? '💬 联系人工客服' : '💬 Talk to Admin Directly',
    placeholder:
      language === 'km' ? 'សរសេរសារ...' : language === 'zh' ? '输入消息...' : 'Type a message...',
    you: language === 'km' ? 'អ្នក' : language === 'zh' ? '您' : 'You',
    admin: language === 'km' ? 'Admin ជំនួយការ' : language === 'zh' ? '客服管理' : 'Admin Support',
    supportBadge: language === 'km' ? 'ជំនួយ ២៤/៧' : language === 'zh' ? '24/7 客服' : '24/7 Support',
  };

  // Load chat session if it exists with sound alert
  const loadChatMessages = useCallback((id: string, token: string, isPolling = false) => {
    supportApi.getMessages(id, token)
      .then(({ data }) => {
        if (data.success && data.data) {
          const rawList = data.data as Array<{ sender: string; text: string; senderName?: string; createdAt?: string }>;
          const mapped: Msg[] = rawList.map((m) => ({
            role: m.sender === 'ADMIN' ? 'admin' : 'user',
            text: m.text,
            senderName: m.senderName,
            createdAt: m.createdAt,
          }));
          setMessages(mapped);

          // Count admin messages
          const adminMsgs = mapped.filter((m) => m.role === 'admin');
          const currentAdminCount = adminMsgs.length;

          if (isPolling && !isFirstLoadRef.current && currentAdminCount > prevAdminMsgCountRef.current) {
            const newAdminMsg = adminMsgs[adminMsgs.length - 1];
            playMessageAlertChime();

            if (!open) {
              setUnreadCount((prev) => prev + (currentAdminCount - prevAdminMsgCountRef.current));
              if (newAdminMsg) {
                toast(`💬 Admin: ${newAdminMsg.text.length > 50 ? newAdminMsg.text.slice(0, 50) + '...' : newAdminMsg.text}`, {
                  icon: '🔔',
                  duration: 5000,
                  id: 'customer-chat-incoming',
                });
              }
            }
          }

          prevAdminMsgCountRef.current = currentAdminCount;
          isFirstLoadRef.current = false;
        }
      })
      .catch((err) => {
        console.error('Failed to load support messages:', err);
      });
  }, [open]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('chat_inquiry_id');
      const storedToken = localStorage.getItem('chat_session_token');
      if (storedId && storedToken) {
        setInquiryId(storedId);
        setSessionToken(storedToken);
        loadChatMessages(storedId, storedToken, false);
      } else {
        setMessages([{ role: 'bot', text: label.greeting }]);
      }
    }
  }, [language, label.greeting, loadChatMessages]);

  const { socket } = useRealtime();

  // Instant Real-time WebSocket listener for Customer Live Chat
  useEffect(() => {
    if (!socket || !inquiryId) return;

    socket.emit('join:inquiry', inquiryId);

    const handleMessageCreated = (payload: any) => {
      if (!payload) return;
      const m = payload.message || (payload.sender ? payload : null);
      const targetInquiryId = payload.inquiryId || (payload.message as any)?.inquiryId || payload.inquiryId;

      if (targetInquiryId && targetInquiryId !== inquiryId) return;
      if (!m || !m.text) return;

      const newMsg: Msg = {
        role: m.sender === 'ADMIN' ? 'admin' : 'user',
        text: m.text,
        senderName: m.senderName,
        createdAt: m.createdAt || new Date().toISOString(),
      };

      setMessages((prev) => {
        // Prevent duplicate if already in list
        const exists = prev.some((existing) => 
          existing.text === newMsg.text && 
          existing.role === newMsg.role && 
          (existing.createdAt === newMsg.createdAt || (newMsg.createdAt && existing.createdAt && Math.abs(new Date(existing.createdAt).getTime() - new Date(newMsg.createdAt).getTime()) < 3000))
        );
        if (exists) return prev;
        return [...prev, newMsg];
      });

      if (m.sender === 'ADMIN') {
        playMessageAlertChime();
        if (!open) {
          setUnreadCount((prev) => prev + 1);
          toast(`💬 Admin: ${m.text.length > 50 ? m.text.slice(0, 50) + '...' : m.text}`, {
            icon: '🔔',
            duration: 6000,
            id: 'customer-chat-incoming',
          });
        }
      }
    };

    socket.on('SUPPORT_MESSAGE_CREATED', handleMessageCreated);
    socket.on(`support:inquiry:${inquiryId}`, handleMessageCreated);

    return () => {
      socket.emit('leave:inquiry', inquiryId);
      socket.off('SUPPORT_MESSAGE_CREATED', handleMessageCreated);
      socket.off(`support:inquiry:${inquiryId}`, handleMessageCreated);
    };
  }, [socket, inquiryId, open]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showDetailsForm]);

  // Background and Active Messages Polling fallback
  useEffect(() => {
    if (!inquiryId || !sessionToken) return;

    const interval = setInterval(() => {
      loadChatMessages(inquiryId, sessionToken, true);
    }, 4000);

    return () => clearInterval(interval);
  }, [inquiryId, sessionToken, loadChatMessages]);

  const handleFAQClick = (faq: FAQItem) => {
    if (inquiryId && sessionToken) {
      const qText = faq.question[language] || faq.question['en'];
      handleSendText(qText);
      return;
    }

    const qText = faq.question[language] || faq.question['en'];
    const aText = faq.answer[language] || faq.answer['en'];

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: qText },
      { role: 'bot', text: aText },
    ]);
  };

  const startInquiryRequest = (name: string, phone: string, initialQuestion: string) => {
    setIsStartingChat(true);
    setLastPendingQuestion({ name, phone, text: initialQuestion });
    supportApi.createInquiry({
      name: name || 'Customer',
      phone: phone || 'N/A',
      question: initialQuestion,
      priority: 'GENERAL',
      source: 'chat-widget',
      language,
    })
      .then(({ data }) => {
        if (data.success && data.data) {
          const inquiry = data.data;
          const token = data.sessionToken;
          localStorage.setItem('chat_inquiry_id', inquiry.id);
          localStorage.setItem('chat_session_token', token);
          setInquiryId(inquiry.id);
          setSessionToken(token);
          loadChatMessages(inquiry.id, token);
          setShowDetailsForm(false);
          setTempInput('');
          setShowFallbackModal(false);
        }
      })
      .catch((err) => {
        console.error('Failed to start chat session:', err);
        // Replace native browser alert with modern luxury Fallback / Direct Contact Modal
        setShowFallbackModal(true);
      })
      .finally(() => {
        setIsStartingChat(false);
      });
  };

  const handleSwitchToOfflineMockup = () => {
    setShowFallbackModal(false);
    setShowDetailsForm(false);
    const questionText = lastPendingQuestion?.text || tempInput.trim();
    if (questionText) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: questionText, createdAt: new Date().toISOString() },
        {
          role: 'bot',
          text:
            language === 'km'
              ? '✅ យើងខ្ញុំបានកត់ត្រាសាររបស់អ្នកទុកក្នុងប្រព័ន្ធរួចរាល់! Admin នឹងពិនិត្យ និងឆ្លើយតបមកកាន់អ្នកវិញឱ្យបានលឿនបំផុត។ ប្រសិនបើបន្ទាន់ សូមទាក់ទងមក Telegram ផ្ទាល់: @new_user_sh_shop_bot ឬទូរស័ព្ទ 097 494 4390។'
              : '✅ We have recorded your inquiry! Admin will review and reply as soon as possible. If urgent, please reach out directly on Telegram: @new_user_sh_shop_bot or call 097 494 4390.',
          isContactOptions: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      setTempInput('');
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text:
            language === 'km'
              ? 'លោកអ្នកអាចសរសេរសារ ឬសំណួរទុកនៅទីនេះបាន។ ប្រព័ន្ធបានកត់ត្រាទុក ហើយ Admin នឹងឆ្លើយតបមកកាន់លោកអ្នកវិញក្នុងពេលឆាប់ៗ!'
              : 'You can leave your question or message here. Our system has logged it and Admin will get back to you shortly!',
        },
      ]);
    }
  };

  const handleContactAdmin = () => {
    if (inquiryId && sessionToken) return;
    const defaultText = language === 'km' ? 'សួស្តី! ខ្ញុំចង់ជជែកជាមួយ Admin' : 'Hello, I want to talk to Admin';
    if (user && user.name) {
      startInquiryRequest(user.name, user.phone || 'N/A', defaultText);
    } else {
      setTempInput(defaultText);
      setShowDetailsForm(true);
    }
  };

  const handleSendCustom = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    handleSendText(text);
  };

  const handleSendText = (text: string) => {
    if (inquiryId && sessionToken) {
      setIsSending(true);
      setMessages((prev) => [...prev, { role: 'user', text, createdAt: new Date().toISOString() }]);
      supportApi.createMessage(inquiryId, text, sessionToken)
        .then(() => {
          loadChatMessages(inquiryId, sessionToken);
        })
        .catch((err) => {
          console.error('Failed to send message:', err);
        })
        .finally(() => {
          setIsSending(false);
        });
    } else {
      if (user && user.name) {
        startInquiryRequest(user.name, user.phone || 'N/A', text);
      } else {
        setTempInput(text);
        setShowDetailsForm(true);
      }
    }
  };

  const handleStartChatFromForm = () => {
    const finalName = clientName.trim() || user?.name || (language === 'km' ? 'អតិថិជន' : 'Customer');
    const finalPhone = clientPhone.trim() || user?.phone || 'N/A';
    const initialText = tempInput.trim() || (language === 'km' ? 'សួស្តី! ខ្ញុំចង់ជជែកជាមួយ Admin' : 'Hello, I want to talk to Admin');
    startInquiryRequest(finalName, finalPhone, initialText);
  };

  const handleResetChat = () => {
    setShowResetConfirmModal(true);
  };

  const confirmResetChat = () => {
    localStorage.removeItem('chat_inquiry_id');
    localStorage.removeItem('chat_session_token');
    setInquiryId(null);
    setSessionToken(null);
    setShowDetailsForm(false);
    setShowResetConfirmModal(false);
    setMessages([{ role: 'bot', text: label.greeting }]);
    toast.success(language === 'km' ? 'បានចាប់ផ្តើមការជជែកថ្មី' : 'Chat session reset');
  };

  // Hide chat widget on admin portal
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const handleOpenWidget = () => {
    if (!isDraggingRef.current) {
      setOpen(true);
      setUnreadCount(0);
    }
  };

  return (
    <>
      {/* Draggable Floating Trigger Button */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.08}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={() => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 150);
        }}
        className="fixed bottom-6 right-6 z-50 select-none touch-none"
        style={{ touchAction: 'none' }}
      >
        {!open && (
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="relative flex items-center group cursor-grab active:cursor-grabbing"
            onClick={handleOpenWidget}
          >
            {/* Sleek Gradient Trigger Button */}
            <button
              type="button"
              aria-label="Open support chat"
              className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 via-indigo-600 to-violet-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.45)] flex items-center justify-center hover:shadow-[0_14px_32px_rgba(79,70,229,0.6)] transition-all border border-white/30 backdrop-blur-xl relative"
            >
              <MessageCircle className="w-6 h-6 text-white drop-shadow" />

              {/* Green Alert Notification Badge - ONLY shown when someone chats / unreadCount > 0 */}
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center"
                >
                  <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-emerald-500 text-white text-[11px] font-black rounded-full ring-2 ring-white dark:ring-surface-900 shadow-lg shadow-emerald-500/50">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </motion.div>
              )}
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Floating Chat Modal Box - iOS Liquid Glass */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[350px] max-w-[calc(100vw-24px)] rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.2)] flex flex-col h-[500px] max-h-[calc(100vh-32px)] bg-white/95 dark:bg-surface-900/95 backdrop-blur-2xl border border-white/60 dark:border-white/10"
          >
            {/* Header: iOS Curved Liquid Glass Bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 text-white shrink-0 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-md pointer-events-none" />
              <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                <div className="relative w-8 h-8 rounded-xl bg-white/20 backdrop-blur-lg flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-700 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs leading-tight truncate drop-shadow-sm">
                    {inquiryId ? label.liveTitle : label.title}
                  </p>
                  <p className="text-[10px] text-indigo-100 flex items-center gap-1 mt-0.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{inquiryId ? 'Live Admin Connected' : 'Online • 24/7 Support'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 relative z-10">
                {inquiryId && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title={language === 'km' ? 'ជជែកសារថ្មី' : 'Restart Chat'}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/25 text-white transition backdrop-blur-sm"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/25 text-white transition backdrop-blur-sm"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Body / Messages Timeline */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/60 dark:bg-surface-950/60 scroll-smooth">
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                const isAdmin = m.role === 'admin';

                return (
                  <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-0.5`}>
                    {/* Sender Identity */}
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium px-1">
                      {isAdmin ? (
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                          <ShieldCheck className="w-3 h-3 text-indigo-500" />
                          {m.senderName || label.admin}
                        </span>
                      ) : isUser ? (
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <User className="w-2.5 h-2.5" />
                          {label.you}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-semibold">
                          <MessageSquare className="w-2.5 h-2.5 text-primary-500" />
                          SH-Shop Assistant
                        </span>
                      )}
                      {m.createdAt && (
                        <span className="text-[9px] opacity-70">
                          • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`text-xs p-2.5 rounded-xl leading-relaxed max-w-[88%] whitespace-pre-line ${
                        isUser
                          ? 'bg-gradient-to-tr from-primary-600 via-primary-500 to-indigo-600 text-white rounded-tr-xs shadow-[0_4px_14px_rgba(79,70,229,0.25)]'
                          : isAdmin
                            ? 'bg-white dark:bg-surface-800 text-gray-800 dark:text-gray-100 border border-indigo-200 dark:border-indigo-900/60 rounded-tl-xs shadow-sm ring-1 ring-indigo-500/10'
                            : 'bg-white dark:bg-surface-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-surface-700/80 rounded-tl-xs shadow-sm'
                      }`}
                    >
                      {m.text}
                    </div>

                    {/* Interactive Contact Channels */}
                    {m.isContactOptions && (
                      <div className="bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 rounded-xl p-2.5 space-y-1.5 max-w-[90%] shadow-sm mt-1">
                        <a
                          href="https://t.me/+855974944390"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-white bg-[#0088cc] rounded-lg hover:opacity-90 transition shadow-sm"
                        >
                          <TelegramIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Telegram: @new_user_sh_shop_bot</span>
                        </a>

                        <a
                          href="https://facebook.com/maosokhun"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-white bg-[#1877f2] rounded-lg hover:opacity-90 transition shadow-sm"
                        >
                          <Facebook className="w-3.5 h-3.5 shrink-0" />
                          <span>Facebook: Mao Sokhun</span>
                        </a>

                        <div className="border-t border-gray-100 dark:border-surface-700 pt-1 space-y-1">
                          <a
                            href="tel:0974944390"
                            className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-surface-900 rounded-md hover:bg-gray-100 dark:hover:bg-surface-800 transition"
                          >
                            <Phone className="w-3 h-3 text-gray-500" />
                            <span>097 494 4390</span>
                          </a>
                          <a
                            href="mailto:shshopbyonline@gmail.com"
                            className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-surface-900 rounded-md hover:bg-gray-100 dark:hover:bg-surface-800 transition"
                          >
                            <Mail className="w-3 h-3 text-gray-500" />
                            <span>shshopbyonline@gmail.com</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* In-Timeline FAQ Suggestions (Compact & Clean) */}
              {!inquiryId && !showDetailsForm && (
                <div className="pt-1.5 space-y-1.5 shrink-0">
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1 uppercase tracking-wider">
                    {language === 'km' ? 'សំណួរដែលសួរញឹកញាប់ ៖' : language === 'zh' ? '常见问题：' : 'Frequently Asked Questions:'}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {faqList.map((faq) => (
                      <button
                        key={faq.key}
                        type="button"
                        onClick={() => handleFAQClick(faq)}
                        className="w-full text-left text-xs px-3 py-2 bg-white dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-surface-700 text-gray-800 dark:text-gray-100 hover:text-primary-600 rounded-xl border border-gray-200/80 dark:border-surface-700/80 shadow-2xs transition-all duration-150 flex items-center justify-between group font-medium shrink-0"
                      >
                        <span className="truncate pr-2">{faq.question[language] || faq.question['en']}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-primary-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleContactAdmin}
                      className="w-full text-left text-xs px-3 py-2 bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white rounded-xl shadow-sm shadow-primary-500/25 transition-all duration-150 font-semibold flex items-center justify-between shrink-0 mt-0.5"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-white shrink-0" />
                        <span>{label.talkToHuman}</span>
                      </span>
                      <Send className="w-3.5 h-3.5 text-white shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* Form to connect directly with Admin */}
              {showDetailsForm && (
                <div className="bg-white dark:bg-surface-850 border border-primary-200 dark:border-primary-800 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === 'km' ? 'ព័ត៌មានសម្រាប់ការជជែកជាមួយ Admin' : 'Information for Live Support'}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-tight">
                    {language === 'km' ? 'សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទរបស់អ្នក ដើម្បីឱ្យ Admin ងាយស្រួលឆ្លើយតប៖' : 'Please enter your name and phone number so Admin can assist you:'}
                  </p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input text-xs w-full h-9 px-3 rounded-xl"
                      placeholder={language === 'km' ? 'ឈ្មោះរបស់អ្នក (ឧ. សុខា)' : 'Your name (e.g. John)'}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input text-xs w-full h-9 px-3 rounded-xl"
                      placeholder={language === 'km' ? 'លេខទូរស័ព្ទ (ឧ. 012 345 678)' : 'Phone number (e.g. 012 345 678)'}
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDetailsForm(false)}
                      className="btn text-xs h-8 px-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-surface-700 text-gray-700 dark:text-gray-300 rounded-xl"
                    >
                      {language === 'km' ? 'បោះបង់' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleStartChatFromForm}
                      disabled={isStartingChat}
                      className="btn-primary text-xs h-8 px-4 rounded-xl font-bold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isStartingChat ? (
                        <span>Connecting...</span>
                      ) : (
                        <>
                          <span>{language === 'km' ? 'ចាប់ផ្តើមជជែក' : 'Start Chat'}</span>
                          <Send className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Bottom Input Dock - Ultra Clean iOS Style */}
            <div className="p-3 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-surface-800 shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-surface-800/80 p-1.5 rounded-2xl border border-gray-200/80 dark:border-surface-700 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
                <input
                  className="flex-1 bg-transparent text-xs text-gray-800 dark:text-white px-2.5 py-1.5 focus:outline-none placeholder-gray-400"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendCustom();
                  }}
                  placeholder={label.placeholder}
                  disabled={showDetailsForm || isStartingChat}
                />
                <button
                  type="button"
                  onClick={handleSendCustom}
                  disabled={!input.trim() || showDetailsForm || isStartingChat || isSending}
                  className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center disabled:opacity-30 shrink-0 shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support Connection Fallback / Direct Admin Contact Modal */}
      <AnimatePresence>
        {showFallbackModal && (
          <div
            className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-md flex items-center justify-center p-4 select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFallbackModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white dark:bg-surface-900 rounded-3xl shadow-2xl shadow-black/35 w-full max-w-sm overflow-hidden border border-slate-200/90 dark:border-surface-750 p-6 space-y-4 text-center"
            >
              {/* Header Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-primary-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-primary-500/30">
                <Headphones className="w-7 h-7" />
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'km' ? 'ជំនួយការផ្ទាល់ពី Admin' : 'Direct Admin Support'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {language === 'km'
                    ? 'ប្រព័ន្ធ Chat ផ្ទាល់កំពុងមមាញឹក ឬមិនទាន់ឆ្លើយតបទាន់។ លោកអ្នកអាចទាក់ទងមក Admin ផ្ទាល់ភ្លាមៗតាមបណ្តាញខាងក្រោម ឬផ្ញើសារទុកក្នុងប្រព័ន្ធ៖'
                    : 'Live chat server is momentarily reconnecting. You can reach our Admin directly via the channels below or leave an offline message:'}
                </p>
              </div>

              {/* Instant Contact Channels */}
              <div className="space-y-2 text-left">
                <a
                  href="https://t.me/+855974944390"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold transition shadow-md shadow-[#0088cc]/20 active:scale-98"
                >
                  <span className="flex items-center gap-2.5">
                    <TelegramIcon className="w-4 h-4" />
                    <span>{language === 'km' ? 'Telegram ផ្ទាល់' : 'Direct Telegram'} (@new_user_sh_shop_bot)</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                </a>

                <a
                  href="https://facebook.com/maosokhun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold transition shadow-md shadow-[#1877f2]/20 active:scale-98"
                >
                  <span className="flex items-center gap-2.5">
                    <Facebook className="w-4 h-4" />
                    <span>Facebook: Mao Sokhun</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                </a>

                <a
                  href="tel:0974944390"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-200/80 dark:border-surface-700 active:scale-98"
                >
                  <span className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span>{language === 'km' ? 'ទូរស័ព្ទហៅផ្ទាល់' : 'Direct Call'}: 097 494 4390</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (lastPendingQuestion) {
                      startInquiryRequest(lastPendingQuestion.name, lastPendingQuestion.phone, lastPendingQuestion.text);
                    } else {
                      setShowFallbackModal(false);
                    }
                  }}
                  disabled={isStartingChat}
                  className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-surface-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  {isStartingChat ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === 'km' ? 'កំពុងភ្ជាប់...' : 'Retrying...'}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{language === 'km' ? 'សាកម្តងទៀត' : 'Retry'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToOfflineMockup}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-xs font-bold hover:from-primary-700 hover:to-indigo-700 shadow-md shadow-primary-500/20 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{language === 'km' ? 'ផ្ញើសារទុក' : 'Leave Message'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Chat Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirmModal && (
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowResetConfirmModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white dark:bg-surface-900 rounded-3xl shadow-2xl shadow-black/30 w-full max-w-xs overflow-hidden border border-slate-200/90 dark:border-surface-750 p-5 space-y-3.5 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/60">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'km' ? 'ចាប់ផ្តើមការជជែកថ្មី?' : 'Start New Conversation?'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'km'
                    ? 'ប្រវត្តិជជែកបច្ចុប្បន្ននឹងត្រូវជម្រះ ដើម្បីចាប់ផ្តើមសន្ទនាថ្មី។'
                    : 'Current conversation history will be cleared for a new session.'}
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(false)}
                  className="flex-1 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                >
                  {language === 'km' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={confirmResetChat}
                  className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
                >
                  {language === 'km' ? 'យល់ព្រម' : 'Restart'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
