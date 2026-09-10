'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Phone, Mail, Facebook, Send as TelegramIcon, RefreshCw, User, ShieldCheck, Sparkles, Minus } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { supportApi } from '@/lib/api';

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
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  // Drag tracking to distinguish click vs drag
  const isDraggingRef = useRef(false);

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

  // Load chat session if it exists
  const loadChatMessages = (id: string, token: string) => {
    supportApi.getMessages(id, token)
      .then(({ data }) => {
        if (data.success && data.data) {
          const mapped: Msg[] = data.data.map((m: { sender: string; text: string; senderName?: string; createdAt?: string }) => ({
            role: m.sender === 'ADMIN' ? 'admin' : 'user',
            text: m.text,
            senderName: m.senderName,
            createdAt: m.createdAt,
          }));
          setMessages(mapped);
        }
      })
      .catch((err) => {
        console.error('Failed to load support messages:', err);
      });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('chat_inquiry_id');
      const storedToken = localStorage.getItem('chat_session_token');
      if (storedId && storedToken) {
        setInquiryId(storedId);
        setSessionToken(storedToken);
        loadChatMessages(storedId, storedToken);
      } else {
        setMessages([{ role: 'bot', text: label.greeting }]);
      }
    }
  }, [language, label.greeting]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showDetailsForm]);

  // Messages Polling every 2 seconds when open and active
  useEffect(() => {
    if (!open || !inquiryId || !sessionToken) return;

    const interval = setInterval(() => {
      loadChatMessages(inquiryId, sessionToken);
    }, 2000);

    return () => clearInterval(interval);
  }, [open, inquiryId, sessionToken]);

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
        className="fixed bottom-5 right-5 z-50 select-none touch-none"
        style={{ touchAction: 'none' }}
      >
        {!open && (
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="relative flex items-center group cursor-grab active:cursor-grabbing"
            onClick={() => {
              if (!isDraggingRef.current) {
                setOpen(true);
              }
            }}
          >
            {/* Sleek Gradient Trigger Button (48px / compact) */}
            <button
              type="button"
              aria-label="Open support chat"
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-600 via-primary-500 to-indigo-500 text-white shadow-[0_8px_20px_rgba(99,102,241,0.38)] flex items-center justify-center hover:shadow-[0_12px_28px_rgba(99,102,241,0.55)] transition-shadow border-2 border-white/40 dark:border-surface-800"
            >
              <MessageCircle className="w-5 h-5 text-white drop-shadow-sm" />
            </button>

            {/* Glowing Online Status Indicator */}
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white dark:ring-surface-900 shadow-sm" />
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Floating Chat Modal Box */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px] max-h-[calc(100vh-48px)] bg-white dark:bg-surface-900 border border-gray-100 dark:border-surface-700/80"
          >
            {/* Modern Glassmorphic Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 text-white shrink-0 shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8 h-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                  <MessageCircle className="w-4 h-4 text-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-primary-700 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs leading-tight truncate">
                    {inquiryId ? label.liveTitle : label.title}
                  </p>
                  <p className="text-[10px] text-primary-100/90 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{inquiryId ? 'Live Admin Connected' : 'Online • 24/7 Support'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {inquiryId && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title={language === 'km' ? 'ជជែកសារថ្មី' : 'Restart Chat'}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 text-white/90 hover:text-white transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 text-white/90 hover:text-white transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body / Messages Area */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-gray-50/70 dark:bg-surface-950/60">
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                const isAdmin = m.role === 'admin';

                return (
                  <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                    {/* Sender Tag */}
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium px-1">
                      {isAdmin ? (
                        <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          {m.senderName || label.admin}
                        </span>
                      ) : isUser ? (
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <User className="w-2.5 h-2.5" />
                          {label.you}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium">
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
                      className={`text-xs p-3 rounded-2xl leading-relaxed max-w-[85%] whitespace-pre-line shadow-sm ${
                        isUser
                          ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-tr-none shadow-primary-500/20'
                          : isAdmin
                            ? 'bg-white dark:bg-surface-800 text-gray-800 dark:text-gray-100 border border-primary-200 dark:border-primary-800/80 rounded-tl-none ring-1 ring-primary-500/10'
                            : 'bg-white dark:bg-surface-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-surface-700 rounded-tl-none'
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

              {/* Information Form for Direct Admin Connection */}
              {showDetailsForm && (
                <div className="bg-white dark:bg-surface-850 border border-primary-200 dark:border-primary-800 rounded-2xl p-3.5 space-y-2.5 max-w-[95%] shadow-md">
                  <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-semibold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === 'km' ? 'ព័ត៌មានសម្រាប់ការជជែកជាមួយ Admin' : 'Information for Live Support'}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-tight">
                    {language === 'km' ? 'សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទរបស់អ្នក ដើម្បីឱ្យ Admin ងាយស្រួលឆ្លើយតប៖' : 'Please enter your name and phone number so Admin can assist you:'}
                  </p>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      className="input text-xs w-full h-8 px-2.5"
                      placeholder={language === 'km' ? 'ឈ្មោះរបស់អ្នក (ឧ. សុខា)' : 'Your name (e.g. John)'}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input text-xs w-full h-8 px-2.5"
                      placeholder={language === 'km' ? 'លេខទូរស័ព្ទ (ឧ. 012 345 678)' : 'Phone number (e.g. 012 345 678)'}
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDetailsForm(false)}
                      className="btn text-[11px] h-7 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-surface-700 text-gray-700 dark:text-gray-300 rounded-lg"
                    >
                      {language === 'km' ? 'បោះបង់' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleStartChatFromForm}
                      disabled={isStartingChat}
                      className="btn-primary text-[11px] h-7 px-3.5 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-1.5"
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

            {/* Quick Option Menu & Chat Input */}
            <div className="p-3 bg-white dark:bg-surface-900 border-t border-gray-100 dark:border-surface-800 shrink-0 space-y-2">
              {/* Quick FAQ Question list */}
              {!inquiryId && !showDetailsForm && (
                <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {faqList.map((faq) => (
                    <button
                      key={faq.key}
                      type="button"
                      onClick={() => handleFAQClick(faq)}
                      className="text-left text-[11px] px-2.5 py-1.5 bg-gray-50 hover:bg-primary-50 dark:bg-surface-800 dark:hover:bg-surface-700 text-gray-700 dark:text-gray-300 hover:text-primary-600 rounded-xl border border-gray-100 dark:border-surface-700 transition truncate font-medium"
                    >
                      {faq.question[language] || faq.question['en']}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleContactAdmin}
                    className="text-left text-[11px] px-2.5 py-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:hover:bg-primary-950/60 text-primary-700 dark:text-primary-300 rounded-xl border border-primary-200/60 transition font-bold flex items-center justify-between"
                  >
                    <span>{label.talkToHuman}</span>
                    <Send className="w-3 h-3 opacity-70" />
                  </button>
                </div>
              )}

              {/* Input Box */}
              <div className="flex gap-2 pt-1">
                <input
                  className="input text-xs flex-1 h-9 px-3 rounded-xl border-gray-200 dark:border-surface-700"
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
                  className="btn-primary h-9 w-9 p-0 rounded-xl flex items-center justify-center disabled:opacity-40 shrink-0 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
