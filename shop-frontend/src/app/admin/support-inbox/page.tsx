'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { supportApi } from '@/lib/api';
import {
  Phone,
  Send,
  MessageSquare,
  RefreshCw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  Search,
  X,
  Copy,
  Check,
  Sparkles,
  Zap,
  Smile,
  ShieldCheck,
  AlertCircle,
  User,
} from 'lucide-react';
import { playMessageAlertChime } from '@/lib/soundAlert';
import { useRealtime } from '@/providers/RealtimeProvider';
import toast from 'react-hot-toast';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';

type Inquiry = {
  id: string;
  name: string;
  phone: string;
  question: string;
  priority?: string;
  status?: string;
  transcript?: string;
  createdAt: string;
  updatedAt?: string;
  messages?: { id: string; sender: 'USER' | 'ADMIN'; text: string; createdAt: string }[];
};

type ChatMessage = {
  id: string;
  inquiryId: string;
  sender: 'USER' | 'ADMIN';
  senderName: string;
  text: string;
  createdAt: string;
};

export default function AdminSupportInboxPage() {
  const { language } = useAdminLanguageStore();
  const isKhmer = language === 'km';
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'ORDER' | 'PAYMENT' | 'PRODUCT' | 'GENERAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'open' | 'in_progress' | 'resolved'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showQuickTemplates, setShowQuickTemplates] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevInquiriesCountRef = useRef<number>(-1);
  const prevUserMsgCountRef = useRef<number>(-1);
  const isFirstLoadInquiries = useRef<boolean>(true);
  const isFirstLoadMessages = useRef<boolean>(true);

  // Quick Reply Templates
  const quickTemplates = useMemo(() => {
    if (isKhmer) {
      return [
        { id: 'greet', label: '👋 ស្វាគមន៍', text: 'សួស្តីបាទ! តើខ្ញុំអាចជួយសម្រួលអ្វីបានដែរ?' },
        { id: 'order_prep', label: '📦 រៀបចំដឹក', text: 'ទំនិញរបស់អ្នកកំពុងរៀបចំ និងត្រៀមដឹកជញ្ជូនហើយបាទ!' },
        { id: 'receipt_req', label: '💳 សុំបង្កាន់ដៃ', text: 'សូមផ្ញើរូបភាពបង្កាន់ដៃបង់ប្រាក់មកទីនេះ ដើម្បីក្រុមការងារពិនិត្យបាទ!' },
        { id: 'address_req', label: '📍 សុំទីតាំង', text: 'សូមផ្តល់លេខទូរស័ព្ទ និងទីតាំងជាក់ស្តែងសម្រាប់អ្នកដឹកជញ្ជូនបាទ!' },
        { id: 'call_back', label: '📞 ខលត្រឡប់', text: 'ក្រុមការងារនឹងទូរស័ព្ទទៅបញ្ជាក់ព័ត៌មានបន្ថែមក្នុងពេលបន្តិចទៀតនេះបាទ!' },
        { id: 'resolved', label: '✅ ដោះស្រាយរួច', text: 'សំណួរ ឬបញ្ហារបស់អ្នកត្រូវបានដោះស្រាយរួចរាល់ហើយ! សូមអរគុណច្រើនបាទ 🙏' },
      ];
    }
    return [
      { id: 'greet', label: '👋 Greeting', text: 'Hello! How can we assist you today?' },
      { id: 'order_prep', label: '📦 Order Ready', text: 'Your order is being prepared and will be shipped shortly!' },
      { id: 'receipt_req', label: '💳 Slip Request', text: 'Please send your payment transfer slip here for verification.' },
      { id: 'address_req', label: '📍 Location', text: 'Please share your contact number and delivery location.' },
      { id: 'call_back', label: '📞 Call Back', text: 'Our team will call you shortly to confirm further details.' },
      { id: 'resolved', label: '✅ Resolved', text: 'Your request has been resolved. Thank you for choosing us! 🙏' },
    ];
  }, [isKhmer]);

  const quickEmojis = ['👍', '🙏', '😊', '❤️', '📦', '💳', '📍', '📞', '✅', '🔥'];

  // Localization labels
  const t = {
    title: isKhmer ? 'ប្រអប់សារគាំទ្រ Live Support' : language === 'zh' ? '客服实时聊天' : 'Live Support Inbox',
    subtitle: isKhmer ? 'គ្រប់គ្រងការសាកសួរ និងជជែកជាមួយអតិថិជនផ្ទាល់' : 'Manage live chats and customer inquiries',
    searchPlaceholder: isKhmer ? 'ស្វែងរកឈ្មោះ លេខទូរស័ព្ទ ឬសារ...' : 'Search name, phone or message...',
    allPriorities: isKhmer ? 'អាទិភាពទាំងអស់' : language === 'zh' ? '所有优先级' : 'All Priority',
    allStatuses: isKhmer ? 'ស្ថានភាពទាំងអស់' : language === 'zh' ? '所有状态' : 'All Status',
    selectChat: isKhmer ? 'សូមជ្រើសរើសការជជែកពីបញ្ជីខាងឆ្វេងដើម្បីចាប់ផ្តើមឆ្លើយតប' : language === 'zh' ? '请从左侧列表中选择聊天以开始回复' : 'Select a conversation from the left to start chatting',
    typeReply: isKhmer ? 'សរសេរសារឆ្លើយតប... (ចុច Enter ដើម្បីផ្ញើ)' : language === 'zh' ? '输入回复内容...' : 'Type a reply... (Press Enter to send)',
    send: isKhmer ? 'ផ្ញើសារ' : language === 'zh' ? '发送' : 'Send',
    status: isKhmer ? 'ស្ថានភាព' : language === 'zh' ? '状态' : 'Status',
    priority: isKhmer ? 'អាទិភាព' : language === 'zh' ? '优先级' : 'Priority',
    customer: isKhmer ? 'អតិថិជន' : language === 'zh' ? '客户' : 'Customer',
    phone: isKhmer ? 'លេខទូរស័ព្ទ' : language === 'zh' ? '电话' : 'Phone',
    date: isKhmer ? 'កាលបរិច្ឆេទ' : language === 'zh' ? '日期' : 'Date',
    open: isKhmer ? 'មិនទាន់ដោះស្រាយ' : language === 'zh' ? '待处理' : 'Open',
    inProgress: isKhmer ? 'កំពុងដោះស្រាយ' : language === 'zh' ? '处理中' : 'In Progress',
    resolved: isKhmer ? 'ដោះស្រាយរួច' : language === 'zh' ? '已解决' : 'Resolved',
    noMessages: isKhmer ? 'មិនទាន់មានសារជជែកនៅឡើយទេ' : language === 'zh' ? '暂无消息' : 'No messages in this chat yet',
    lastUpdate: isKhmer ? 'អាប់ដេត' : language === 'zh' ? '最后更新' : 'Last update',
    noInquiries: isKhmer ? 'មិនមានសំណួរគាំទ្រត្រូវនឹងតម្រងនេះទេ' : language === 'zh' ? '暂无匹配的咨询记录' : 'No inquiries match this filter.',
    quickReplies: isKhmer ? 'សាររហ័ស:' : 'Quick Replies:',
    copyPhone: isKhmer ? 'ចម្លងលេខ' : 'Copy Phone',
    callNow: isKhmer ? 'ខលផ្ទាល់' : 'Call Now',
    markResolved: isKhmer ? 'សម្គាល់ថាដោះស្រាយរួច' : 'Mark Resolved',
    markOpen: isKhmer ? 'បើកឡើងវិញ' : 'Reopen',
  };

  const scrollToBottom = useCallback((smooth = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  const loadInquiries = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    supportApi
      .getInquiries({ limit: 100 })
      .then(({ data }) => {
        const list = data.data || [];
        setRows(list);
        setLastUpdated(new Date().toLocaleTimeString());

        if (silent && !isFirstLoadInquiries.current && list.length > prevInquiriesCountRef.current && prevInquiriesCountRef.current >= 0) {
          if (soundEnabled) playMessageAlertChime();
          toast('💬 មានសារសាកសួរថ្មីពីអតិថិជន!', { icon: '🔔', id: 'admin-new-inquiry' });
        }
        prevInquiriesCountRef.current = list.length;
        isFirstLoadInquiries.current = false;
      })
      .catch(() => setRows([]))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [soundEnabled]);

  const loadMessages = useCallback((id: string, silent = false) => {
    if (!silent) setMessagesLoading(true);
    supportApi.getMessages(id)
      .then(({ data }) => {
        if (data.success && data.data) {
          const list = data.data as ChatMessage[];
          setMessages(list);

          const userMsgs = list.filter((m) => m.sender === 'USER');
          if (silent && !isFirstLoadMessages.current && userMsgs.length > prevUserMsgCountRef.current && prevUserMsgCountRef.current >= 0) {
            const latestUserMsg = userMsgs[userMsgs.length - 1];
            if (soundEnabled) playMessageAlertChime();
            toast(`💬 ${latestUserMsg.senderName || 'អតិថិជន'}: ${latestUserMsg.text.length > 40 ? latestUserMsg.text.slice(0, 40) + '...' : latestUserMsg.text}`, {
              icon: '💬',
              id: 'admin-new-msg',
            });
          }
          prevUserMsgCountRef.current = userMsgs.length;
          isFirstLoadMessages.current = false;
        }
      })
      .catch((err) => {
        console.error('Failed to load chat history:', err);
      })
      .finally(() => {
        if (!silent) setMessagesLoading(false);
      });
  }, [soundEnabled]);

  // Poll inquiry list every 4s
  useEffect(() => {
    loadInquiries();
    const timer = setInterval(() => loadInquiries(true), 4000);
    return () => clearInterval(timer);
  }, [loadInquiries]);

  const { socket } = useRealtime();

  // Instant Real-time WebSocket listener for Admin Support Inbox
  useEffect(() => {
    if (!socket) return;

    const handleInquiryCreated = (newInquiry: Inquiry) => {
      if (!newInquiry || !newInquiry.id) return;
      setRows((prev) => {
        const exists = prev.some((r) => r.id === newInquiry.id);
        if (exists) return prev;
        return [newInquiry, ...prev];
      });
      if (soundEnabled) playMessageAlertChime();
      toast(`💬 សំណួរថ្មីពី ${newInquiry.name || 'អតិថិជន'}!`, { icon: '🔔', id: 'admin-live-inquiry' });
    };

    const handleMessageCreated = (payload: any) => {
      if (!payload) return;
      const m = payload.message || (payload.sender ? payload : null);
      const inqId = payload.inquiryId || (payload.message as any)?.inquiryId || payload.inquiryId;

      setRows((prev) =>
        prev.map((r) =>
          r.id === inqId
            ? { ...r, status: m?.sender === 'ADMIN' ? 'in_progress' : r.status, updatedAt: new Date().toISOString() }
            : r
        )
      );

      if (selectedId && inqId === selectedId && m && m.text) {
        const newMsg: ChatMessage = {
          id: m.id || String(Date.now()),
          inquiryId: inqId,
          sender: m.sender || 'USER',
          senderName: m.senderName || 'User',
          text: m.text,
          createdAt: m.createdAt || new Date().toISOString(),
        };

        setMessages((prev) => {
          const exists = prev.some((existing) => existing.id === newMsg.id || (existing.text === newMsg.text && existing.sender === newMsg.sender));
          if (exists) return prev;
          return [...prev, newMsg];
        });

        if (m.sender === 'USER') {
          if (soundEnabled) playMessageAlertChime();
          toast(`💬 ${m.senderName || 'អតិថិជន'}: ${m.text.slice(0, 40)}`, { icon: '💬', id: 'admin-live-msg' });
        }
      }
    };

    socket.on('SUPPORT_INQUIRY_CREATED', handleInquiryCreated);
    socket.on('SUPPORT_MESSAGE_CREATED', handleMessageCreated);

    return () => {
      socket.off('SUPPORT_INQUIRY_CREATED', handleInquiryCreated);
      socket.off('SUPPORT_MESSAGE_CREATED', handleMessageCreated);
    };
  }, [socket, selectedId, soundEnabled]);

  // Poll active chat messages fallback
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      prevUserMsgCountRef.current = -1;
      isFirstLoadMessages.current = true;
      return;
    }

    isFirstLoadMessages.current = true;
    prevUserMsgCountRef.current = -1;
    loadMessages(selectedId, false);

    const messagesTimer = setInterval(() => {
      loadMessages(selectedId, true);
    }, 2500);

    return () => clearInterval(messagesTimer);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    scrollToBottom(false);
  }, [selectedId, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);

  const handleSendReply = (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : replyText).trim();
    if (!textToSend || !selectedId) return;

    setSending(true);
    supportApi.createMessage(selectedId, textToSend)
      .then(() => {
        setReplyText('');
        loadMessages(selectedId);
        loadInquiries(true);
        inputRef.current?.focus();
      })
      .catch((err) => {
        console.error('Failed to send reply:', err);
        toast.error('Failed to send reply');
      })
      .finally(() => {
        setSending(false);
      });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    supportApi.updateStatus(id, newStatus)
      .then(() => {
        toast.success(isKhmer ? 'បានផ្លាស់ប្តូរស្ថានភាពជោគជ័យ ✅' : 'Status updated successfully');
        loadInquiries(true);
      })
      .catch(() => {
        toast.error(isKhmer ? 'បរាជ័យក្នុងការកែប្រែស្ថានភាព' : 'Failed to update status');
        loadInquiries(true);
      });
  };

  const handleCopyPhone = (phone: string) => {
    if (!phone || phone === 'N/A') return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    toast.success(isKhmer ? 'បានចម្លងលេខទូរស័ព្ទ! 📋' : 'Phone copied! 📋');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const priorityLabel = (priority: string) => {
    if (isKhmer) {
      if (priority === 'ORDER') return 'បញ្ហាកម្មង់';
      if (priority === 'PAYMENT') return 'បញ្ហាបង់ប្រាក់';
      if (priority === 'PRODUCT') return 'សំណួរទំនិញ';
      return 'ទូទៅ';
    }
    if (language === 'zh') {
      if (priority === 'ORDER') return '订单问题';
      if (priority === 'PAYMENT') return '支付问题';
      if (priority === 'PRODUCT') return '产品问题';
      return '一般';
    }
    if (priority === 'ORDER') return 'Order Issue';
    if (priority === 'PAYMENT') return 'Payment Issue';
    if (priority === 'PRODUCT') return 'Product Question';
    return 'General';
  };

  const priorityClasses = (priority: string) => {
    if (priority === 'ORDER') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (priority === 'PAYMENT') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    if (priority === 'PRODUCT') return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  };

  const statusBadge = (status?: string) => {
    if (status === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>{t.resolved}</span>
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
          <span>{t.inProgress}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
        <span>{t.open}</span>
      </span>
    );
  };

  // URL Query Sync
  const searchParams = useSearchParams();

  useEffect(() => {
    const idFromQuery = searchParams.get('id');
    if (idFromQuery) {
      setSelectedId(idFromQuery);
    }
  }, [searchParams]);

  // Counts Calculation
  const counts = useMemo(() => {
    const total = rows.length;
    const open = rows.filter((r) => !r.status || r.status === 'open').length;
    const inProgress = rows.filter((r) => r.status === 'in_progress').length;
    const resolved = rows.filter((r) => r.status === 'resolved').length;
    return { total, open, inProgress, resolved };
  }, [rows]);

  const priorityOptions: DropdownOption[] = [
    { value: 'ALL', label: t.allPriorities, dotColor: '#94a3b8' },
    { value: 'ORDER', label: priorityLabel('ORDER'), dotColor: '#3b82f6' },
    { value: 'PAYMENT', label: priorityLabel('PAYMENT'), dotColor: '#f59e0b' },
    { value: 'PRODUCT', label: priorityLabel('PRODUCT'), dotColor: '#8b5cf6' },
    { value: 'GENERAL', label: priorityLabel('GENERAL'), dotColor: '#64748b' },
  ];

  const statusFilterOptions: DropdownOption[] = [
    { value: 'ALL', label: t.allStatuses, dotColor: '#94a3b8' },
    { value: 'open', label: `${t.open} (${counts.open})`, dotColor: '#ef4444' },
    { value: 'in_progress', label: `${t.inProgress} (${counts.inProgress})`, dotColor: '#3b82f6' },
    { value: 'resolved', label: `${t.resolved} (${counts.resolved})`, dotColor: '#10b981' },
  ];

  const statusActionOptions: DropdownOption[] = [
    { value: 'open', label: t.open, dotColor: '#ef4444' },
    { value: 'in_progress', label: t.inProgress, dotColor: '#3b82f6' },
    { value: 'resolved', label: t.resolved, dotColor: '#10b981' },
  ];

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter || (statusFilter === 'open' && !r.status);
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.phone && r.phone.toLowerCase().includes(q)) ||
        (r.question && r.question.toLowerCase().includes(q));

      return matchesPriority && matchesStatus && matchesSearch;
    });
  }, [rows, priorityFilter, statusFilter, searchQuery]);

  const activeInquiry = rows.find((r) => r.id === selectedId);

  return (
    <div
      className="h-[calc(100vh-140px)] min-h-[560px] max-h-[calc(100vh-140px)] flex flex-col md:flex-row gap-3 text-sm overflow-hidden"
      style={isKhmer ? { fontFamily: "'Kantumruy Pro', 'Noto Sans Khmer', 'Khmer OS Siemreap', 'Inter', sans-serif" } : undefined}
    >
      {/* LEFT COLUMN: Conversation List & Filter Hub */}
      <div className="w-full md:w-[370px] shrink-0 bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col h-full overflow-hidden">
        {/* Header Toolbar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/90 shrink-0 space-y-2.5 bg-slate-50/50 dark:bg-[#0f172a]/70">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shadow-primary-500/20">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="tracking-tight">{t.title}</span>
            </h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) {
                    playMessageAlertChime();
                    toast.success(isKhmer ? 'សំឡេងជូនដំណឹង៖ បើក' : 'Sound Alert: ON');
                  } else {
                    toast(isKhmer ? 'សំឡេងជូនដំណឹង៖ បិទ' : 'Sound Alert: OFF');
                  }
                }}
                title={soundEnabled ? 'Sound alert ON (Click to mute)' : 'Sound alert OFF (Click to unmute)'}
                className={`p-1.5 rounded-lg transition ${
                  soundEnabled
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button 
                type="button" 
                onClick={() => loadInquiries(false)} 
                title="Refresh List"
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>


          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full h-9 pl-9 pr-8 text-xs rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Priority & Status Dropdown Filters */}
          <div className="grid grid-cols-2 gap-2">
            <CustomDropdown
              size="xs"
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val as 'ALL' | 'ORDER' | 'PAYMENT' | 'PRODUCT' | 'GENERAL')}
              options={priorityOptions}
              className="w-full"
            />

            <CustomDropdown
              size="xs"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as 'ALL' | 'open' | 'in_progress' | 'resolved')}
              options={statusFilterOptions}
              className="w-full"
            />
          </div>
        </div>

        {/* Inquiry Cards List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 space-y-2 bg-slate-50/30 dark:bg-[#070a10]">
          {loading ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading inquiries...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-14 px-4 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.noInquiries}</p>
            </div>
          ) : (
            filteredRows.map((r) => {
              const isActive = r.id === selectedId;
              const latestMsg = r.messages?.[0];
              const isUnread = (!r.status || r.status === 'open') || (latestMsg && latestMsg.sender === 'USER' && r.status !== 'resolved');
              const displayDate = latestMsg?.createdAt || r.updatedAt || r.createdAt;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 flex flex-col gap-2 relative overflow-hidden group cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500/12 via-primary-500/5 to-transparent dark:from-primary-950/60 dark:to-transparent border-primary-500/80 shadow-md ring-1 ring-primary-500/30'
                      : isUnread
                      ? 'bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/30 dark:from-indigo-950/40 dark:via-[#111827] dark:to-indigo-950/20 border-indigo-300 dark:border-indigo-800/80 shadow-xs ring-1 ring-indigo-500/20 hover:border-indigo-400'
                      : 'bg-white hover:bg-slate-50/90 dark:bg-[#111827] dark:hover:bg-[#162032] border-slate-200/80 dark:border-slate-800/80 shadow-2xs'
                  }`}
                >
                  {/* Left vibrant indicator line */}
                  {isActive ? (
                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary-600 to-indigo-600 rounded-r" />
                  ) : isUnread ? (
                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-rose-500 rounded-r animate-pulse" />
                  ) : null}

                  {/* Header: Avatar, Sender, New Badge & Timestamp */}
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar with unread ring */}
                      <div className="relative shrink-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-xs ${
                          isActive
                            ? 'bg-primary-600 text-white shadow-primary-500/30'
                            : isUnread
                            ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-indigo-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {(r.name || 'G').charAt(0).toUpperCase()}
                        </div>
                        {isUnread && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-surface-900 animate-pulse" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-xs sm:text-sm truncate ${
                          isUnread || isActive
                            ? 'font-extrabold text-slate-950 dark:text-white'
                            : 'font-semibold text-slate-800 dark:text-slate-200'
                        }`}>
                          {r.name || 'Guest'}
                        </span>

                        {isUnread && (
                          <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-rose-500 text-white shadow-xs uppercase animate-pulse shrink-0 tracking-wider">
                            {isKhmer ? 'សារថ្មី' : 'NEW'}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono shrink-0 ${
                      isUnread ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 font-medium'
                    }`}>
                      {new Date(displayDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </div>

                  {/* Message Preview (Bold if unread) */}
                  <div className={`text-xs line-clamp-2 w-full leading-snug pl-10.5 ${
                    isUnread
                      ? 'font-bold text-slate-900 dark:text-slate-100'
                      : 'font-normal text-slate-500 dark:text-slate-400'
                  }`}>
                    {latestMsg?.text || r.question || '...'}
                  </div>

                  {/* Footer Badges */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 pl-10.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${priorityClasses(r.priority || 'GENERAL')}`}>
                      {priorityLabel(r.priority || 'GENERAL')}
                    </span>
                    <div>
                      {statusBadge(r.status)}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 text-center shrink-0 bg-slate-50/50 dark:bg-[#0B0F17]">
          {t.lastUpdate}: <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{lastUpdated || 'N/A'}</span> · {filteredRows.length} chats
        </div>
      </div>

      {/* RIGHT COLUMN: Active Live Chat Panel & Quick Action Center */}
      <div className="flex-1 bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col h-full overflow-hidden">
        {activeInquiry ? (
          <>
            {/* Active Thread Header & Customer Quick Actions */}
            <div className="px-4 py-3 bg-slate-50/80 dark:bg-[#0f172a]/80 border-b border-slate-100 dark:border-slate-800/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm shadow-primary-500/20">
                  {(activeInquiry.name || 'G').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate">
                      {activeInquiry.name || 'Customer'}
                    </h2>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${priorityClasses(activeInquiry.priority || 'GENERAL')}`}>
                      {priorityLabel(activeInquiry.priority || 'GENERAL')}
                    </span>
                  </div>
                  
                  {/* Phone & Contact Buttons */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <div className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-primary-500 shrink-0" />
                      <span>{activeInquiry.phone || 'N/A'}</span>
                    </div>

                    {activeInquiry.phone && activeInquiry.phone !== 'N/A' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(activeInquiry.phone)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                          title="Copy Phone Number"
                        >
                          {copiedPhone ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                          <span>{copiedPhone ? 'Copied' : t.copyPhone}</span>
                        </button>

                        <a
                          href={`tel:${activeInquiry.phone}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{t.callNow}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and 1-Click Quick Resolve Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                {activeInquiry.status !== 'resolved' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(activeInquiry.id, 'resolved')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
                    title="Mark this inquiry as resolved"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.markResolved}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(activeInquiry.id, 'open')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t.markOpen}</span>
                  </button>
                )}

                <CustomDropdown
                  size="xs"
                  align="right"
                  value={activeInquiry.status || 'open'}
                  onChange={(val) => handleStatusChange(activeInquiry.id, val)}
                  options={statusActionOptions}
                  className="w-[130px]"
                />
              </div>
            </div>

            {/* Chat Messages Timeline */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 bg-slate-50/20 dark:bg-[#070a10]"
            >
              {messagesLoading && messages.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 px-4 text-slate-400 select-none space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-medium">{t.noMessages}</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender === 'ADMIN';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isAdmin ? 'ml-auto items-end' : 'mr-auto items-start'} space-y-1`}
                    >
                      {/* Sender Identity Bar */}
                      <div className={`flex items-center gap-1.5 text-[10px] px-1 ${isAdmin ? 'flex-row-reverse text-slate-400' : 'text-slate-500'}`}>
                        {isAdmin ? (
                          <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-extrabold bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-200/60 dark:border-primary-800/60">
                            <ShieldCheck className="w-3 h-3 text-primary-500" />
                            {isKhmer ? 'Admin (អ្នក)' : 'Admin (You)'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                            <User className="w-3 h-3 text-slate-500" />
                            {m.senderName || activeInquiry.name || (isKhmer ? 'អតិថិជន' : 'Customer')}
                          </span>
                        )}
                        <span className="text-[9px] font-mono opacity-70">
                          {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`text-xs sm:text-sm p-3.5 rounded-2xl leading-relaxed whitespace-pre-line ${
                          isAdmin
                            ? 'bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-600 text-white rounded-tr-none shadow-md shadow-primary-500/20 font-medium'
                            : 'bg-white dark:bg-[#162032] border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Reply Template Pills Bar */}
            <div className="px-3 pt-2.5 pb-1 bg-white dark:bg-[#0B0F17] border-t border-slate-100 dark:border-slate-800/90 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{t.quickReplies}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickTemplates(!showQuickTemplates)}
                  className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {showQuickTemplates ? 'Hide' : 'Show'}
                </button>
              </div>

              {showQuickTemplates && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                  {quickTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setReplyText(template.text);
                        inputRef.current?.focus();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-surface-800 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-950/40 dark:hover:text-primary-300 text-slate-700 dark:text-slate-300 text-[11px] font-medium whitespace-nowrap transition border border-slate-200/70 dark:border-slate-700/60 shadow-2xs active:scale-95"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply Input Box & Emoji Shelf */}
            <div className="p-3 bg-white dark:bg-[#0B0F17] space-y-2 shrink-0">
              {/* Emoji bar */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                <Smile className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 mr-0.5" />
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setReplyText((prev) => prev + emoji);
                      inputRef.current?.focus();
                    }}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-800 text-xs transition active:scale-90 shrink-0"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 h-10 px-3.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition shadow-inner"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendReply();
                  }}
                  placeholder={t.typeReply}
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={() => handleSendReply()}
                  disabled={!replyText.trim() || sending}
                  className="h-10 px-4 sm:px-5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold shadow-sm shadow-primary-500/25 transition active:scale-95 disabled:opacity-50 disabled:active:scale-100 shrink-0 cursor-pointer"
                >
                  <span>{t.send}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 select-none space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              {t.selectChat}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


