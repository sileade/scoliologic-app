import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SwipeableCard } from '@/components/SwipeableCard';
import { cn } from '@/lib/utils';
import { Lock, Sparkles, Bot, Check, CheckCheck, ChevronLeft, User } from 'lucide-react';
import { keyStore } from '@/lib/crypto';

interface Chat {
  id: string;
  name: string;
  role: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
  type: 'doctor' | 'support';
  aiActive?: boolean;
}

interface Message {
  id: string;
  text: string;
  time: string;
  timestamp: Date;
  isOwn: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isEncrypted: boolean;
  isAI?: boolean;
  senderName?: string;
}

// Mock data
const mockChats: Chat[] = [
  { 
    id: '1', 
    name: 'Иванов И.И.', 
    role: 'Ортопед',
    avatar: 'ИИ',
    lastMessage: 'Продолжайте носить корсет',
    lastMessageTime: '10:30',
    unread: 2,
    online: true,
    type: 'doctor',
    aiActive: true,
  },
  { 
    id: '2', 
    name: 'Петрова А.С.', 
    role: 'Врач ЛФК',
    avatar: 'ПА',
    lastMessage: 'Не забудьте про упражнения',
    lastMessageTime: 'Вчера',
    unread: 0,
    online: false,
    type: 'doctor',
    aiActive: false,
  },
  { 
    id: '3', 
    name: 'AI-ассистент', 
    role: 'Scoliologic',
    avatar: '✨',
    lastMessage: 'Чем могу помочь?',
    lastMessageTime: 'сейчас',
    unread: 0,
    online: true,
    type: 'support',
    aiActive: true,
  },
];

const mockMessages: Message[] = [
  { id: '1', text: 'Добрый день! Как вы себя чувствуете?', time: '10:15', timestamp: new Date(Date.now() - 3600000), isOwn: false, status: 'read', isEncrypted: true, senderName: 'Иванов И.И.' },
  { id: '2', text: 'Здравствуйте! Чувствую себя хорошо', time: '10:20', timestamp: new Date(Date.now() - 3500000), isOwn: true, status: 'read', isEncrypted: true },
  { id: 'ai-1', text: 'Отлично! Продолжайте соблюдать режим ношения корсета. Врач ответит в ближайшее время.', time: '10:21', timestamp: new Date(Date.now() - 3450000), isOwn: false, status: 'read', isEncrypted: true, isAI: true },
  { id: '3', text: 'Продолжайте носить корсет по графику', time: '10:25', timestamp: new Date(Date.now() - 3400000), isOwn: false, status: 'read', isEncrypted: true, senderName: 'Иванов И.И.' },
];

export default function Messages() {
  const { t, language } = useLanguage();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Haptic feedback
  const haptic = (intensity: number = 10) => {
    if (navigator.vibrate) navigator.vibrate(intensity);
  };

  useEffect(() => {
    async function initKeys() {
      await keyStore.getOrCreateKeyPair();
    }
    initKeys();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedChat) {
      setMessages(mockMessages);
    }
  }, [selectedChat]);

  const getAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('корсет') || lowerMessage.includes('носить')) {
      return language === 'ru'
        ? 'Корсет следует носить 20-23 часа в сутки. Снимайте только для гигиены и упражнений.'
        : 'Wear the corset 20-23 hours daily. Remove only for hygiene and exercises.';
    }
    if (lowerMessage.includes('упражнен') || lowerMessage.includes('лфк')) {
      return language === 'ru'
        ? 'Рекомендую выполнять упражнения 2 раза в день по 30 минут.'
        : 'Do exercises twice daily for 30 minutes.';
    }
    if (lowerMessage.includes('боль') || lowerMessage.includes('болит')) {
      return language === 'ru'
        ? '⚠️ При острой боли обратитесь к врачу. Небольшой дискомфорт при адаптации — нормально.'
        : '⚠️ For sharp pain, see a doctor. Some discomfort during adaptation is normal.';
    }
    return language === 'ru'
      ? 'Спасибо за вопрос. Врач ответит в ближайшее время.'
      : 'Thank you. The doctor will reply soon.';
  };

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    haptic(25);
    
    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(),
      isOwn: true,
      status: 'sending',
      isEncrypted: true
    };
    
    setMessages(prev => [...prev, message]);
    const sentText = newMessage;
    setNewMessage('');

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'delivered' } : m));
    }, 500);

    // AI responds if active
    if (selectedChat.aiActive) {
      setAiTyping(true);
      setTimeout(() => {
        setAiTyping(false);
        haptic(10);
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: getAIResponse(sentText),
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(),
          isOwn: false,
          status: 'read',
          isEncrypted: true,
          isAI: true
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1500);
    }
  }, [newMessage, selectedChat, language]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusIcon = (status: Message['status'], isOwn: boolean) => {
    if (!isOwn) return null;
    switch (status) {
      case 'read': return <CheckCheck size={14} className="text-white/70" />;
      case 'delivered': return <CheckCheck size={14} className="text-white/50" />;
      case 'sent': return <Check size={14} className="text-white/50" />;
      default: return <span className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />;
    }
  };

  // Chat List View
  if (!selectedChat) {
    return (
      <div className="mobile-page">
        {/* Header */}
        <header className="mobile-header">
          <div>
            <h1 className="mobile-header-title">
              {language === 'ru' ? 'Сообщения' : 'Messages'}
            </h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Lock size={10} />
              <span>{language === 'ru' ? 'Сквозное шифрование' : 'E2E encrypted'}</span>
            </div>
          </div>
        </header>

        {/* Chat List */}
        <div className="mobile-content has-bottom-nav">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {mockChats.map((chat, index) => (
              <SwipeableCard
                key={chat.id}
                onSwipeLeft={() => {
                  haptic(25);
                  // Archive action
                }}
                leftAction={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                }
              >
                <button
                  onClick={() => {
                    haptic();
                    setSelectedChat(chat);
                  }}
                  className={cn(
                    "w-full mobile-list-item",
                    index === mockChats.length - 1 && "border-b-0"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg",
                      chat.avatar === '✨' 
                        ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white"
                        : "bg-teal-100 text-teal-700"
                    )}>
                      {chat.avatar}
                    </div>
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 ml-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate flex items-center gap-1">
                        {chat.name}
                        {chat.aiActive && chat.avatar !== '✨' && (
                          <Bot size={14} className="text-teal-500" />
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {chat.lastMessageTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm text-muted-foreground truncate pr-2">
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <span className="w-5 h-5 bg-teal-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </SwipeableCard>
            ))}
          </div>
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  // Chat View
  return (
    <div className="chat-container bg-gray-50">
      {/* Chat Header */}
      <header className="mobile-header bg-white">
        <div className="flex items-center gap-3">
          <button 
            className="btn-icon -ml-2"
            onClick={() => {
              haptic();
              setSelectedChat(null);
            }}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
              selectedChat.avatar === '✨'
                ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white text-lg"
                : "bg-teal-100 text-teal-700"
            )}>
              {selectedChat.avatar}
            </div>
            {selectedChat.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{selectedChat.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{selectedChat.role}</span>
              {selectedChat.aiActive && (
                <>
                  <span>•</span>
                  <span className="text-teal-500 flex items-center gap-0.5">
                    <Sparkles size={10} /> AI
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
            <Lock size={10} />
            <span>E2EE</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={cn("flex mb-2", message.isOwn ? "justify-end" : "justify-start")}
          >
            <div className={cn(
              "chat-bubble",
              message.isOwn ? "sent" : message.isAI ? "ai" : "received"
            )}>
              {!message.isOwn && message.isAI && (
                <div className="flex items-center gap-1 mb-1 text-white/80">
                  <Sparkles size={10} />
                  <span className="text-[10px] font-medium">AI-ассистент</span>
                </div>
              )}
              {!message.isOwn && !message.isAI && message.senderName && (
                <div className="flex items-center gap-1 mb-1 text-teal-600">
                  <User size={10} />
                  <span className="text-[10px] font-medium">{message.senderName}</span>
                </div>
              )}
              <p className="text-[15px] leading-relaxed">{message.text}</p>
              <div className={cn(
                "flex items-center justify-end gap-1 mt-1",
                message.isOwn ? "text-white/60" : "text-muted-foreground"
              )}>
                <span className="text-[10px]">{message.time}</span>
                {getStatusIcon(message.status, message.isOwn)}
              </div>
            </div>
          </div>
        ))}

        {aiTyping && (
          <div className="flex justify-start mb-2">
            <div className="chat-bubble ai">
              <div className="flex items-center gap-2">
                <Sparkles size={10} className="text-white/80" />
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-container">
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={language === 'ru' ? 'Сообщение...' : 'Message...'}
          className="chat-input"
        />
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          className="chat-send-btn"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
