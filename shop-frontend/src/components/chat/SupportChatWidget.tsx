'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Phone, Mail, Facebook, Send as TelegramIcon, RefreshCw, User, ShieldCheck, Sparkles, Minus, Bell } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { supportApi } from '@/lib/api';
import { playMessageAlertChime } from '@/lib/soundAlert';
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

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showDetailsForm]);

  // Background and Active Messages Polling every 2.5s
  useEffect(() => {
    if (!inquiryId || !sessionToken) return;

    const interval = setInterval(() => {
      loadChatMessages(inquiryId, sessionToken, true);
    }, 2500);

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
        }
      })
      .catch((err) => {
        console.error('Failed to start chat session:', err);
        alert(language === 'km' ? 'មិនអាចភ្ជាប់ទៅ Admin បានទេ សូមព្យាយាមម្តងទៀត' : 'Could not connect to Admin. Please try again.');
      })
      .finally(() => {
        setIsStartingChat(false);
      });
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
    if (confirm(language === 'km' ? 'តើអ្នកចង់ចាប់ផ្តើមការជជែកថ្មីមែនទេ?' : 'Do you want to start a new chat conversation?')) {
      localStorage.removeItem('chat_inquiry_id');
      localStorage.removeItem('chat_session_token');
      setInquiryId(null);
      setSessionToken(null);
      setShowDetailsForm(false);
      setMessages([{ role: 'bot', text: label.greeting }]);
    }
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
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.22)] flex flex-col h-[560px] max-h-[calc(100vh-40px)] bg-white/95 dark:bg-surface-900/95 backdrop-blur-2xl border border-white/60 dark:border-white/10"
          >
            {/* Header: iOS Curved Liquid Glass Bar */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 text-white shrink-0 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-md pointer-events-none" />
              <div className="flex items-center gap-3 min-w-0 relative z-10">
                <div className="relative w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-indigo-700 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight truncate drop-shadow-sm">
                    {inquiryId ? label.liveTitle : label.title}
                  </p>
                  <p className="text-[11px] text-indigo-100 flex items-center gap-1.5 mt-0.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{inquiryId ? 'Live Admin Connected' : 'Online • 24/7 Support'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 relative z-10">
                {inquiryId && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title={language === 'km' ? 'ជជែកសារថ្មី' : 'Restart Chat'}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/25 text-white transition backdrop-blur-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/25 text-white transition backdrop-blur-sm"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body / Messages Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-surface-950/60 scroll-smooth">
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                const isAdmin = m.role === 'admin';

                return (
                  <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
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
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
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
                      className={`text-xs p-3.5 rounded-2xl leading-relaxed max-w-[88%] whitespace-pre-line ${
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
                      <div className="bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 rounded-2xl p-3 space-y-2 max-w-[90%] shadow-sm mt-1">
                        <a
                          href="https://t.me/+855974944390"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-white bg-[#0088cc] rounded-xl hover:opacity-90 transition shadow-sm"
                        >
                          <TelegramIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Telegram: @new_user_sh_shop_bot</span>
                        </a>

                        <a
                          href="https://facebook.com/maosokhun"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-white bg-[#1877f2] rounded-xl hover:opacity-90 transition shadow-sm"
                        >
                          <Facebook className="w-3.5 h-3.5 shrink-0" />
                          <span>Facebook: Mao Sokhun</span>
                        </a>

                        <div className="border-t border-gray-100 dark:border-surface-700 pt-1.5 space-y-1">
                          <a
                            href="tel:0974944390"
                            className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-surface-900 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-800 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                            <span>097 494 4390</span>
                          </a>
                          <a
                            href="mailto:shshopbyonline@gmail.com"
                            className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-surface-900 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-800 transition"
                          >
                            <Mail className="w-3.5 h-3.5 text-gray-500" />
                            <span>shshopbyonline@gmail.com</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* In-Timeline FAQ Suggestions (Clean Card Buttons) */}
              {!inquiryId && !showDetailsForm && (
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-400 px-1">
                    {language === 'km' ? 'សំណួរដែលសួរញឹកញាប់ ៖' : language === 'zh' ? '常见问题：' : 'Frequently Asked Questions:'}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {faqList.map((faq) => (
                      <button
                        key={faq.key}
                        type="button"
                        onClick={() => handleFAQClick(faq)}
                        className="w-full text-left text-xs px-3.5 py-2.5 bg-white dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-surface-700 text-gray-700 dark:text-gray-200 hover:text-primary-600 rounded-2xl border border-gray-100 dark:border-surface-700 shadow-xs transition-all flex items-center justify-between group font-medium"
                      >
                        <span className="truncate pr-2">{faq.question[language] || faq.question['en']}</span>
                        <span className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold shrink-0">➔</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleContactAdmin}
                      className="w-full text-left text-xs px-3.5 py-2.5 bg-gradient-to-r from-primary-500/10 via-indigo-500/10 to-violet-500/10 hover:from-primary-500/20 hover:to-violet-500/20 text-primary-700 dark:text-primary-300 rounded-2xl border border-primary-200/80 dark:border-primary-800/80 transition-all font-bold flex items-center justify-between shadow-xs mt-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-primary-600" />
                        <span>{label.talkToHuman}</span>
                      </span>
                      <Send className="w-3.5 h-3.5 text-primary-600 shrink-0" />
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
    </>
  );
}
