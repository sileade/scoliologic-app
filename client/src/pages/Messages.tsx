import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  SendIcon,
  LockIcon,
} from "@/components/NotionIcons";
import { Lock, Sparkles, Bot, Check, CheckCheck, ChevronLeft, User } from "lucide-react";
import { keyStore, generateKeyFingerprint } from "@/lib/crypto";

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
    name: 'Поддержка', 
    role: 'Scoliologic',
    avatar: 'СП',
    lastMessage: 'Ваш запрос обработан',
    lastMessageTime: '15.01',
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

  useEffect(() => {
    async function initKeys() {
      await keyStore.getOrCreateKeyPair();
    }
    initKeys();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    const aiNote = language === 'ru' ? '\n\n🤖 AI-ассистент' : '\n\n🤖 AI Assistant';
    
    if (lowerMessage.includes('корсет') || lowerMessage.includes('носить')) {
      return (language === 'ru'
        ? 'Корсет следует носить 20-23 часа в сутки. Снимайте только для гигиены и упражнений.'
        : 'Wear the corset 20-23 hours daily. Remove only for hygiene and exercises.') + aiNote;
    }
    if (lowerMessage.includes('упражнен') || lowerMessage.includes('лфк')) {
      return (language === 'ru'
        ? 'Рекомендую выполнять упражнения 2 раза в день по 30 минут. Видео в разделе "Реабилитация".'
        : 'Do exercises twice daily for 30 minutes. Videos in "Rehabilitation" section.') + aiNote;
    }
    if (lowerMessage.includes('боль') || lowerMessage.includes('болит')) {
      return (language === 'ru'
        ? '⚠️ При острой боли обратитесь к врачу. Небольшой дискомфорт при адаптации — нормально.'
        : '⚠️ For sharp pain, see a doctor. Some discomfort during adaptation is normal.') + aiNote;
    }
    return (language === 'ru'
      ? 'Спасибо за вопрос. Врач ответит в ближайшее время.'
      : 'Thank you. The doctor will reply soon.') + aiNote;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
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
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusIcon = (status: Message['status'], isOwn: boolean) => {
    if (!isOwn) return null;
    switch (status) {
      case 'read': return <CheckCheck size={14} className="text-accent" />;
      case 'delivered': return <CheckCheck size={14} />;
      case 'sent': return <Check size={14} />;
      default: return <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />;
    }
  };

  // Chat List View
  const ChatList = () => (
    <div className="flex-1 overflow-y-auto">
      {mockChats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => setSelectedChat(chat)}
          className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center font-semibold text-accent">
              {chat.avatar}
            </div>
            {chat.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between">
              <span className="font-semibold truncate">{chat.name}</span>
              <span className="text-xs text-muted-foreground">{chat.lastMessageTime}</span>
            </div>
            <div className="flex items-center gap-1">
              {chat.aiActive && <Bot size={12} className="text-purple-500 flex-shrink-0" />}
              <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
            </div>
          </div>
          {chat.unread > 0 && (
            <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium">
              {chat.unread}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  // Chat View
  const ChatView = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <button onClick={() => setSelectedChat(null)} className="lg:hidden">
          <ChevronLeft size={24} />
        </button>
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-semibold text-accent">
          {selectedChat?.avatar}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{selectedChat?.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{selectedChat?.role}</span>
            {selectedChat?.aiActive && (
              <>
                <span>•</span>
                <span className="text-purple-500 flex items-center gap-1">
                  <Bot size={12} /> AI
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-accent">
          <Lock size={12} />
          <span>E2EE</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.isOwn ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2",
              message.isOwn
                ? "bg-accent text-accent-foreground rounded-br-sm"
                : message.isAI
                  ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-bl-sm"
                  : "bg-card border rounded-bl-sm"
            )}>
              {!message.isOwn && message.isAI && (
                <div className="flex items-center gap-1 mb-1 text-purple-600 dark:text-purple-400">
                  <Sparkles size={10} />
                  <span className="text-[10px] font-medium">AI</span>
                </div>
              )}
              {!message.isOwn && !message.isAI && message.senderName && (
                <div className="flex items-center gap-1 mb-1 text-accent">
                  <User size={10} />
                  <span className="text-[10px] font-medium">{message.senderName}</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              <div className={cn(
                "flex items-center justify-end gap-1 mt-1",
                message.isOwn ? "text-accent-foreground/60" : "text-muted-foreground"
              )}>
                <span className="text-[10px]">{message.time}</span>
                {getStatusIcon(message.status, message.isOwn)}
              </div>
            </div>
          </div>
        ))}

        {aiTyping && (
          <div className="flex justify-start">
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl rounded-bl-sm px-4 py-2">
              <div className="flex items-center gap-2">
                <Sparkles size={10} className="text-purple-500" />
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-card">
        <div className="flex items-center gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={language === 'ru' ? 'Сообщение...' : 'Message...'}
            className="flex-1 px-4 py-2.5 rounded-full bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              newMessage.trim()
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            <SendIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout title={t("messages.title")}>
      <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] flex">
        {/* Chat List - hidden on mobile when chat selected */}
        <Card className={cn(
          "flex-1 lg:flex-none lg:w-80 border-r flex flex-col",
          selectedChat && "hidden lg:flex"
        )}>
          {/* Header */}
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">{t("messages.title")}</h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Lock size={10} />
              <span>{language === 'ru' ? 'Сквозное шифрование' : 'End-to-end encrypted'}</span>
            </div>
          </div>
          <ChatList />
        </Card>

        {/* Chat View */}
        {selectedChat ? (
          <Card className={cn("flex-1 flex flex-col", !selectedChat && "hidden lg:flex")}>
            <ChatView />
          </Card>
        ) : (
          <Card className="flex-1 hidden lg:flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-muted-foreground" />
              </div>
              <p className="font-semibold mb-1">
                {language === 'ru' ? 'Выберите чат' : 'Select a chat'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'ru' ? 'Все сообщения зашифрованы' : 'All messages are encrypted'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
