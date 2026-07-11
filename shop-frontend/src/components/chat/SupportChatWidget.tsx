'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Phone, Mail, Facebook, Send as TelegramIcon, RefreshCw } from 'lucide-react';
import { useLanguageStore } from '@/store/languageStore';
import { supportApi } from '@/lib/api';

type Msg = { 
  role: 'user' | 'bot'; 
  text: string; 
  isContactOptions?: boolean;
};

type FAQItem = {
  key: string;
  question: { km: string; en: string; zh: string };
  answer: { km: string; en: string; zh: string };
};

export default function SupportChatWidget() {
  const { language } = useLanguageStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  // Live Chat States
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [tempInput, setTempInput] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isSending, setIsSending] = useState(false);

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
        km: '💳 របៀបទូទាត់ប្រាក់តាម KHQR/ABA/Card',
        en: '💳 How to pay via KHQR/ABA/Card',
        zh: '💳 如何通过 KHQR/ABA/卡付款',
      },
      answer: {
        km: 'យើងខ្ញុំទទួលការទូទាត់តាម៖\n1. Visa / Mastercard\n2. Bakong KHQR (ស្កែនបានគ្រប់ធនាគារទាំងអស់)\n3. ABA PayWay\nរាល់ការទូទាត់គឺមានសុវត្ថិភាពខ្ពស់។',
        en: 'We accept payments via:\n1. Visa / Mastercard\n2. Bakong KHQR (Scan from any KH bank app)\n3. ABA PayWay\nAll payments are fully secured.',
        zh: '我们支持以下付款方式：\n1. Visa / Mastercard\n2. Bakong KHQR（扫码即付，支持所有银行 APP）\n3. ABA PayWay\n所有支付均保证安全。',
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
    title: language === 'km' ? 'ជំនួយការវៃឆ្លាត' : language === 'zh' ? '智能助理' : 'Smart Assistant',
    greeting:
      language === 'km'
        ? 'សួស្តី! ខ្ញុំជាជំនួយការវៃឆ្លាតរបស់ SH-Shop។ តើអ្នកចង់សួរអំពីអ្វីដែរ? សូមជ្រើសរើសសំណួរគំរូខាងក្រោម៖'
        : language === 'zh'
          ? '您好！我是 SH-Shop 智能助理。请选择您想咨询的问题：'
          : 'Hi! I am the SH-Shop Smart Assistant. Please choose a topic below:',
    talkToHuman:
      language === 'km' ? '💬 ជជែកជាមួយ Admin ផ្ទាល់' : language === 'zh' ? '💬 联系人工客服' : '💬 Talk to Admin Directly',
    contactTitle:
      language === 'km'
        ? 'សូមទំនាក់ទំនងមកកាន់ Admin តាមរយៈបណ្តាញខាងក្រោម៖'
        : language === 'zh'
          ? '您可以通过以下渠道联系我们的管理员：'
          : 'Please contact our Admin through the channels below:',
    placeholder:
      language === 'km' ? 'សរសេរសារ...' : language === 'zh' ? '输入消息...' : 'Type a message...',
    adminReply:
      language === 'km'
        ? 'ខ្ញុំបានទទួលសំណួររបស់អ្នកហើយ។ ខាងក្រោមនេះជាព័ត៌មានទំនាក់ទំនងរបស់ Admin៖'
        : language === 'zh'
          ? '我已经收到您的问题。以下是管理员的联系方式：'
          : 'I have received your question. Here is how you can reach our Admin:',
  };

  // Load chat session if it exists on load
  const loadChatMessages = (id: string, token: string) => {
    supportApi.getMessages(id, token)
      .then(({ data }) => {
        if (data.success && data.data) {
          const mapped: Msg[] = data.data.map((m: { sender: string; text: string }) => ({
            role: m.sender === 'USER' ? 'user' : 'bot',
            text: m.text,
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
        const greeting = language === 'km'
          ? 'សួស្តី! ខ្ញុំជាជំនួយការវៃឆ្លាតរបស់ SH-Shop។ តើអ្នកចង់សួរអំពីអ្វីដែរ? សូមជ្រើសរើសសំណួរគំរូខាងក្រោម៖'
          : language === 'zh'
            ? '您好！我是 SH-Shop 智能助理。请选择您想咨询的问题：'
            : 'Hi! I am the SH-Shop Smart Assistant. Please choose a topic below:';
        setMessages([{ role: 'bot', text: greeting }]);
      }
    }
  }, [language]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showDetailsForm]);

  // Messages Polling
  useEffect(() => {
    if (!open || !inquiryId || !sessionToken) return;

    const interval = setInterval(() => {
      loadChatMessages(inquiryId, sessionToken);
    }, 3000);

    return () => clearInterval(interval);
  }, [open, inquiryId, sessionToken]);

  const handleFAQClick = (faq: FAQItem) => {
    // If in live chat mode, prevent FAQ bubble adding
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

  const handleContactAdmin = () => {
    if (inquiryId && sessionToken) return;
    setTempInput(label.talkToHuman);
    setShowDetailsForm(true);
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
      setTempInput(text);
      setShowDetailsForm(true);
    }
  };

  const handleStartChat = () => {
    if (!clientName.trim() || !clientPhone.trim() || isStartingChat) return;

    setIsStartingChat(true);
    const initialText = tempInput || 'I would like to talk to support';

    supportApi.createInquiry({
      name: clientName,
      phone: clientPhone,
      question: initialText,
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
      })
      .finally(() => {
        setIsStartingChat(false);
      });
  };

  const handleResetChat = () => {
    if (confirm('Are you sure you want to end this chat and start a new one?')) {
      localStorage.removeItem('chat_inquiry_id');
      localStorage.removeItem('chat_session_token');
      setInquiryId(null);
      setSessionToken(null);
      setMessages([{ role: 'bot', text: label.greeting }]);
    }
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
    <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-24px)] card p-0 overflow-hidden shadow-2xl flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          <p className="font-semibold text-sm">{inquiryId ? (language === 'km' ? 'ជជែកផ្ទាល់' : language === 'zh' ? '人工客服' : 'Live Support') : label.title}</p>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          {inquiryId && (
            <button 
              type="button" 
              onClick={handleResetChat} 
              title="Restart Chat"
              className="opacity-80 hover:opacity-100 p-0.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages / Chat Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 dark:bg-surface-900 min-h-[300px]">
        {messages.map((m, i) => (
          <div key={i} className="space-y-2">
            {/* Standard bubble message */}
            <div
              className={`text-xs p-2.5 rounded-xl leading-relaxed max-w-[85%] whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-primary-600 text-white ml-auto'
                  : 'bg-white dark:bg-surface-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700'
              }`}
            >
              {m.text}
            </div>

            {/* Render interactive contact list if marked as isContactOptions */}
            {m.isContactOptions && (
              <div className="bg-white dark:bg-surface-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-2 max-w-[90%] shadow-sm">
                {/* Telegram */}
                <a
                  href="https://t.me/+855974944390"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-white bg-[#0088cc] rounded-lg hover:opacity-90 transition"
                >
                  <TelegramIcon className="w-4 h-4 shrink-0" />
                  <span>Telegram: @new_user_sh_shop_bot</span>
                </a>

                {/* Facebook */}
                <a
                  href="https://facebook.com/maosokhun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-white bg-[#1877f2] rounded-lg hover:opacity-90 transition"
                >
                  <Facebook className="w-4 h-4 shrink-0" />
                  <span>Facebook: Mao Sokhun</span>
                </a>

                {/* Phones */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 space-y-1.5">
                  <a
                    href="tel:0974944390"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-surface-900 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-950 transition border border-gray-200/55"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                    <span>Call: 097 494 4390</span>
                  </a>
                  <a
                    href="tel:0885459115"
                    className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-surface-900 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-950 transition border border-gray-200/55"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                    <span>Call: 088 545 9115</span>
                  </a>
                </div>

                {/* Email */}
                <a
                  href="mailto:shshopbyonline@gmail.com"
                  className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-surface-900 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-950 transition border border-gray-200/55"
                >
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <span>Email: shshopbyonline@gmail.com</span>
                </a>
              </div>
            )}
          </div>
        ))}

        {/* Details Form for Chat Setup */}
        {showDetailsForm && (
          <div className="bg-white dark:bg-surface-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3 max-w-[90%] shadow-sm transition-all duration-300">
            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">
              {language === 'km' ? 'សូមបញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទដើម្បីចាប់ផ្តើមជជែកផ្ទាល់៖' : language === 'zh' ? '请输入姓名和电话以开始实时聊天：' : 'Please enter your name and phone number to start live support:'}
            </p>
            <input
              type="text"
              className="input text-xs w-full h-8"
              placeholder={language === 'km' ? 'ឈ្មោះ' : language === 'zh' ? '姓名' : 'Name'}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <input
              type="text"
              className="input text-xs w-full h-8"
              placeholder={language === 'km' ? 'លេខទូរស័ព្ទ' : language === 'zh' ? '电话号码' : 'Phone number'}
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDetailsForm(false)}
                className="btn text-[10px] h-7 px-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-surface-700 dark:hover:bg-surface-650 text-gray-700 dark:text-gray-300"
              >
                {language === 'km' ? 'បោះបង់' : language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleStartChat}
                disabled={!clientName.trim() || !clientPhone.trim() || isStartingChat}
                className="btn-primary text-[10px] h-7 px-3 disabled:opacity-50"
              >
                {isStartingChat ? 'Loading...' : (language === 'km' ? 'ចាប់ផ្តើម' : language === 'zh' ? '开始' : 'Start')}
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Option Menu & Chat Input */}
      <div className="p-3 bg-white dark:bg-surface-900 border-t border-gray-100 dark:border-gray-800 shrink-0 space-y-2">
        {/* Quick FAQ Question list - hide if in live chat */}
        {!inquiryId && !showDetailsForm && (
          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
            {faqList.map((faq) => (
              <button
                key={faq.key}
                type="button"
                onClick={() => handleFAQClick(faq)}
                className="text-left text-[11px] px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-surface-800 dark:hover:bg-surface-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/30 transition truncate font-medium"
              >
                {faq.question[language] || faq.question['en']}
              </button>
            ))}
            <button
              type="button"
              onClick={handleContactAdmin}
              className="text-left text-[11px] px-2.5 py-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/20 dark:hover:bg-primary-950/40 text-primary-700 dark:text-primary-400 rounded-lg border border-primary-200/40 transition font-semibold"
            >
              {label.talkToHuman}
            </button>
          </div>
        )}

        {/* Input box */}
        <div className="flex gap-2 pt-1 border-t border-gray-50 dark:border-gray-800">
          <input
            className="input text-xs flex-1 h-9"
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
            className="btn-primary h-9 px-3 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

