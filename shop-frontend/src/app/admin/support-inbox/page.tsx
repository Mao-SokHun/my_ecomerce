'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { supportApi } from '@/lib/api';
import { Phone, Send, MessageSquare, RefreshCw, Volume2, VolumeX, CheckCircle2, AlertCircle, Clock, User } from 'lucide-react';
import { playMessageAlertChime } from '@/lib/soundAlert';
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
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'ORDER' | 'PAYMENT' | 'PRODUCT' | 'GENERAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'open' | 'in_progress' | 'resolved'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevInquiriesCountRef = useRef<number>(-1);
  const prevUserMsgCountRef = useRef<number>(-1);
  const isFirstLoadInquiries = useRef<boolean>(true);
  const isFirstLoadMessages = useRef<boolean>(true);

  // Localization labels
  const t = {
    title: isKhmer ? 'ប្រអប់សារគាំទ្រ Live Chat' : language === 'zh' ? '客服实时聊天' : 'Live Support Inbox',
    allPriorities: isKhmer ? 'អាទិភាពទាំងអស់' : language === 'zh' ? '所有优先级' : 'All Priority',
    allStatuses: isKhmer ? 'ស្ថានភាពទាំងអស់' : language === 'zh' ? '所有状态' : 'All Status',
    selectChat: isKhmer ? 'សូមជ្រើសរើសការជជែកពីបញ្ជីខាងឆ្វេងដើម្បីចាប់ផ្តើមឆ្លើយតប' : language === 'zh' ? '请从左侧列表中选择聊天以开始回复' : 'Select a conversation from the left to start chatting',
    typeReply: isKhmer ? 'សរសេរសារឆ្លើយតប...' : language === 'zh' ? '输入回复内容...' : 'Type a reply...',
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
    lastUpdate: isKhmer ? 'អាប់ដេតចុងក្រោយ' : language === 'zh' ? '最后更新' : 'Last update',
    noInquiries: isKhmer ? 'មិនមានសំណួរគាំទ្រត្រូវនឹងតម្រងនេះទេ' : language === 'zh' ? '暂无匹配的咨询记录' : 'No inquiries match this filter.'
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

  // Poll active chat messages every 1.5s
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
    }, 1500);

    return () => clearInterval(messagesTimer);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    scrollToBottom(false);
  }, [selectedId, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);

  const handleSendReply = () => {
    const text = replyText.trim();
    if (!text || !selectedId) return;

    setSending(true);
    supportApi.createMessage(selectedId, text)
      .then(() => {
        setReplyText('');
        loadMessages(selectedId);
        loadInquiries(true);
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

  // Filters
  const priorityOptions: DropdownOption[] = [
    { value: 'ALL', label: t.allPriorities, dotColor: '#94a3b8' },
    { value: 'ORDER', label: priorityLabel('ORDER'), dotColor: '#3b82f6' },
    { value: 'PAYMENT', label: priorityLabel('PAYMENT'), dotColor: '#f59e0b' },
    { value: 'PRODUCT', label: priorityLabel('PRODUCT'), dotColor: '#8b5cf6' },
    { value: 'GENERAL', label: priorityLabel('GENERAL'), dotColor: '#64748b' },
  ];

  const statusFilterOptions: DropdownOption[] = [
    { value: 'ALL', label: t.allStatuses, dotColor: '#94a3b8' },
    { value: 'open', label: t.open, dotColor: '#ef4444' },
    { value: 'in_progress', label: t.inProgress, dotColor: '#3b82f6' },
    { value: 'resolved', label: t.resolved, dotColor: '#10b981' },
  ];

  const statusActionOptions: DropdownOption[] = [
    { value: 'open', label: t.open, dotColor: '#ef4444' },
    { value: 'in_progress', label: t.inProgress, dotColor: '#3b82f6' },
    { value: 'resolved', label: t.resolved, dotColor: '#10b981' },
  ];

  const filteredRows = rows.filter((r) => {
    const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter || (statusFilter === 'open' && !r.status);
    return matchesPriority && matchesStatus;
  });

  const activeInquiry = rows.find((r) => r.id === selectedId);

  return (
    <div
      className="h-[calc(100vh-140px)] min-h-[520px] max-h-[calc(100vh-140px)] flex flex-col md:flex-row gap-3.5 text-sm overflow-hidden"
      style={isKhmer ? { fontFamily: "'Kantumruy Pro', 'Noto Sans Khmer', 'Khmer OS Siemreap', 'Inter', sans-serif" } : undefined}
    >
      {/* LEFT COLUMN: Conversation List */}
      <div className="w-full md:w-[350px] shrink-0 bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col h-full overflow-hidden">
        {/* Header toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/90 shrink-0 space-y-3 bg-slate-50/50 dark:bg-[#0f172a]/70">
          <div className="flex items-center justify-between">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
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
                    ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40'
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

          {/* Filter Dropdowns */}
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
        <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3 space-y-2 bg-slate-50/30 dark:bg-[#070a10]">
          {loading ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading inquiries...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.noInquiries}</p>
            </div>
          ) : (
            filteredRows.map((r) => {
              const isActive = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex flex-col gap-2 relative overflow-hidden group ${
                    isActive
                      ? 'bg-primary-50/80 dark:bg-primary-950/30 border-primary-500/60 shadow-sm ring-1 ring-primary-500/20'
                      : 'bg-white hover:bg-slate-50/90 dark:bg-[#111827] dark:hover:bg-[#162032] border-slate-200/80 dark:border-slate-800/80 shadow-2xs'
                  }`}
                >
                  {/* Left active border accent */}
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r" />
                  )}

                  {/* Header: Sender & Timestamp */}
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {(r.name || 'G').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                        {r.name || 'Guest'}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                      {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  {/* Message Preview */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 w-full font-normal leading-relaxed pl-8">
                    {r.question || '...'}
                  </div>

                  {/* Footer Badges */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 pl-8">
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
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 text-center shrink-0 bg-slate-50/50 dark:bg-[#0B0F17]">
          {t.lastUpdate}: <span className="font-mono">{lastUpdated || 'N/A'}</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Panel */}
      <div className="flex-1 bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col h-full overflow-hidden">
        {activeInquiry ? (
          <>
            {/* Active Thread Header */}
            <div className="px-4 py-3.5 bg-slate-50/70 dark:bg-[#0f172a]/70 border-b border-slate-100 dark:border-slate-800/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                  {(activeInquiry.name || 'G').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                    {activeInquiry.name || 'Customer'}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-mono">{activeInquiry.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Status and Actions Control */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">{t.status}:</span>
                <CustomDropdown
                  size="xs"
                  align="right"
                  value={activeInquiry.status || 'open'}
                  onChange={(val) => handleStatusChange(activeInquiry.id, val)}
                  options={statusActionOptions}
                  className="w-[135px]"
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
                      className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${isAdmin ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className="text-[10px] text-slate-400 font-medium mb-1 px-1">
                        {m.senderName || (isAdmin ? 'Admin' : 'Customer')}
                      </div>
                      <div
                        className={`text-xs sm:text-sm p-3.5 rounded-2xl leading-relaxed whitespace-pre-line shadow-2xs ${
                          isAdmin
                            ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-[#162032] border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 px-1 mt-1 font-medium">
                        {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input Box */}
            <div className="p-3 bg-white dark:bg-[#0B0F17] border-t border-slate-100 dark:border-slate-800/90 flex gap-2 shrink-0">
              <input
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
                onClick={handleSendReply}
                disabled={!replyText.trim() || sending}
                className="h-10 px-4 sm:px-5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold shadow-sm shadow-primary-500/25 transition active:scale-95 disabled:opacity-50 disabled:active:scale-100 shrink-0"
              >
                <span>{t.send}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 select-none space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 shadow-inner">
              <MessageSquare className="w-7 h-7" />
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

