'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAdminLanguageStore } from '@/store/adminLanguageStore';
import { supportApi } from '@/lib/api';
import { Phone, Send, MessageSquare, RefreshCw, Volume2, VolumeX } from 'lucide-react';
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
    title: language === 'km' ? 'ប្រអប់សារគាំទ្រ Live Chat' : language === 'zh' ? '客服实时聊天' : 'Live Support Inbox',
    allPriorities: language === 'km' ? 'អាទិភាពទាំងអស់' : language === 'zh' ? '所有优先级' : 'All priorities',
    allStatuses: language === 'km' ? 'ស្ថានភាពទាំងអស់' : language === 'zh' ? '所有状态' : 'All statuses',
    selectChat: language === 'km' ? 'សូមជ្រើសរើសការជជែកពីបញ្ជីដើម្បីចាប់ផ្តើមឆ្លើយតប' : language === 'zh' ? '请从列表中选择聊天以开始回复' : 'Select a conversation from the list to start chatting',
    typeReply: language === 'km' ? 'សរសេរសារឆ្លើយតប...' : language === 'zh' ? '输入回复内容...' : 'Type a reply...',
    send: language === 'km' ? 'ផ្ញើ' : language === 'zh' ? '发送' : 'Send',
    status: language === 'km' ? 'ស្ថានភាព' : language === 'zh' ? '状态' : 'Status',
    priority: language === 'km' ? 'អាទិភាព' : language === 'zh' ? '优先级' : 'Priority',
    customer: language === 'km' ? 'អតិថិជន' : language === 'zh' ? '客户' : 'Customer',
    phone: language === 'km' ? 'ទូរស័ព្ទ' : language === 'zh' ? '电话' : 'Phone',
    date: language === 'km' ? 'កាលបរិច្ឆេទ' : language === 'zh' ? '日期' : 'Date',
    open: language === 'km' ? 'មិនទាន់ដោះស្រាយ' : language === 'zh' ? '待处理' : 'Open',
    inProgress: language === 'km' ? 'កំពុងដោះស្រាយ' : language === 'zh' ? '处理中' : 'In Progress',
    resolved: language === 'km' ? 'ដោះស្រាយរួច' : language === 'zh' ? '已解决' : 'Resolved',
    noMessages: language === 'km' ? 'មិនទាន់មានសារជជែក' : language === 'zh' ? '暂无消息' : 'No messages yet',
    lastUpdate: language === 'km' ? 'អាប់ដេតចុងក្រោយ' : language === 'zh' ? '最后更新' : 'Last update',
    noInquiries: language === 'km' ? 'មិនទាន់មានសំណួរគាំទ្រ' : language === 'zh' ? '暂无咨询记录' : 'No inquiries found.'
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

  // Scroll to bottom when messages load or change (chat box only, never scrolls parent page)
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
        loadInquiries(true); // Update left sidebar status
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
    supportApi.updateStatus(id, newStatus)
      .then(() => {
        toast.success('Status updated');
        loadInquiries(true);
      })
      .catch(() => {
        toast.error('Failed to update status');
      });
  };

  const priorityLabel = (priority: string) => {
    if (language === 'km') {
      if (priority === 'ORDER') return 'បញ្ហាកម្មង់';
      if (priority === 'PAYMENT') return 'បញ្ហាបង់ប្រាក់';
      if (priority === 'PRODUCT') return 'សំណួរផលិតផល';
      return 'ទូទៅ';
    }
    if (language === 'zh') {
      if (priority === 'ORDER') return '订单问题';
      if (priority === 'PAYMENT') return '支付问题';
      if (priority === 'PRODUCT') return '产品问题';
      return '一般';
    }
    if (priority === 'ORDER') return 'Order issue';
    if (priority === 'PAYMENT') return 'Payment issue';
    if (priority === 'PRODUCT') return 'Product question';
    return 'General';
  };

  const priorityClasses = (priority: string) => {
    if (priority === 'ORDER') return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
    if (priority === 'PAYMENT') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
    if (priority === 'PRODUCT') return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800';
    return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-surface-800 dark:text-gray-300 dark:border-gray-700';
  };

  const statusClasses = (status?: string) => {
    if (status === 'resolved') return 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400';
    return 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400';
  };

  const statusLabel = (status?: string) => {
    if (status === 'resolved') return t.resolved;
    if (status === 'in_progress') return t.inProgress;
    return t.open;
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
    <div className="h-[calc(100vh-140px)] min-h-[500px] max-h-[calc(100vh-140px)] flex gap-4 text-sm overflow-hidden">
      {/* LEFT COLUMN: Conversation List */}
      <div className="w-[320px] shrink-0 card p-0 flex flex-col h-full overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 space-y-3 bg-gray-50/50 dark:bg-surface-900/50">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary-500" />
              <span>{t.title}</span>
            </h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) {
                    playMessageAlertChime();
                    toast.success('សំឡេងជូនដំណឹង៖ បើក');
                  } else {
                    toast('សំឡេងជូនដំណឹង៖ បិទ');
                  }
                }}
                title={soundEnabled ? 'Sound alert ON (Click to mute)' : 'Sound alert OFF (Click to unmute)'}
                className={`p-1.5 rounded-lg transition ${
                  soundEnabled ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-800'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button 
                type="button" 
                onClick={() => loadInquiries(false)} 
                title="Refresh List"
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CustomDropdown
              size="xs"
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val as 'ALL' | 'ORDER' | 'PAYMENT' | 'PRODUCT' | 'GENERAL')}
              options={priorityOptions}
            />

            <CustomDropdown
              size="xs"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as 'ALL' | 'open' | 'in_progress' | 'resolved')}
              options={statusFilterOptions}
            />
          </div>
        </div>

        {/* Inquiry Cards List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5 bg-gray-50/20 dark:bg-surface-950/20">
          {loading ? (
            <p className="text-center py-6 text-xs text-gray-500">Loading inquiries...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-center py-6 text-xs text-gray-500">{t.noInquiries}</p>
          ) : (
            filteredRows.map((r) => {
              const isActive = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 ${
                    isActive
                      ? 'bg-primary-50 border-primary-200 dark:bg-primary-950/20 dark:border-primary-800'
                      : 'bg-white hover:bg-gray-50 border-gray-100 dark:bg-surface-800 dark:hover:bg-surface-750 dark:border-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs text-gray-800 dark:text-white truncate max-w-[130px]">
                      {r.name || 'Guest'}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full">
                    {r.question}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${priorityClasses(r.priority || 'GENERAL')}`}>
                      {priorityLabel(r.priority || 'GENERAL')}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${statusClasses(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="p-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 text-center shrink-0">
          {t.lastUpdate}: {lastUpdated || 'N/A'}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Panel */}
      <div className="flex-1 card p-0 flex flex-col h-full overflow-hidden border border-gray-100 dark:border-gray-800">
        {activeInquiry ? (
          <>
            {/* Active Thread Header */}
            <div className="px-4 py-3 bg-gray-50/50 dark:bg-surface-900/50 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-xs shrink-0">
                  {(activeInquiry.name || 'G').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-xs text-gray-900 dark:text-white leading-tight">
                    {activeInquiry.name}
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    <Phone className="w-2.5 h-2.5 shrink-0" />
                    <span>{activeInquiry.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Status and Actions Control */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 font-medium">{t.status}:</span>
                  <CustomDropdown
                    size="xs"
                    align="right"
                    value={activeInquiry.status || 'open'}
                    onChange={(val) => handleStatusChange(activeInquiry.id, val)}
                    options={statusActionOptions}
                  />
                </div>
              </div>
            </div>

            {/* Chat Messages Timeline */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 bg-gray-50/20 dark:bg-surface-950/10"
            >
              {messagesLoading && messages.length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-400">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-400">{t.noMessages}</p>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender === 'ADMIN';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[70%] ${isAdmin ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className="text-[10px] text-gray-400 font-medium mb-0.5 px-1">
                        {m.senderName}
                      </div>
                      <div
                        className={`text-xs p-3 rounded-2xl leading-relaxed whitespace-pre-line ${
                          isAdmin
                            ? 'bg-primary-600 text-white rounded-tr-none'
                            : 'bg-white border border-gray-100 dark:bg-surface-850 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[9px] text-gray-400 px-1 mt-1 font-medium">
                        {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input Box */}
            <div className="p-3 bg-white dark:bg-surface-900 border-t border-gray-100 dark:border-gray-800 flex gap-2 shrink-0">
              <input
                type="text"
                className="input text-xs flex-1 h-9 px-3"
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
                className="btn-primary h-9 px-4 flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-50 shrink-0"
              >
                <span>{t.send}</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400 select-none">
            <MessageSquare className="w-12 h-12 text-gray-200 dark:text-surface-800 mb-2 animate-bounce" />
            <p className="text-xs font-medium">{t.selectChat}</p>
          </div>
        )}
      </div>
    </div>
  );
}

