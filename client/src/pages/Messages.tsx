import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  MessageIcon, 
  SearchIcon, 
  SendIcon,
  AttachIcon,
  LockIcon,
  CheckIcon,
  ProfileIcon,
  SparklesIcon
} from "@/components/NotionIcons";
import { Shield, Paperclip, Smile, MoreVertical, Phone, Video, Lock, Sparkles, Bot, Check, CheckCheck, Clock, AlertCircle, ChevronLeft, User, Info, ToggleLeft, ToggleRight, Timer } from "lucide-react";
import { keyStore, generateKeyFingerprint, encryptMessage, decryptMessage } from "@/lib/crypto";

interface Chat {
  id: string;
  name: string;
  role: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
  type: 'doctor' | 'ai' | 'support';
  isVerified?: boolean;
  aiActive?: boolean; // AI активен в этом чате
  lastDoctorResponse?: Date; // Время последнего ответа врача
  aiWillReturnAt?: Date; // Когда AI вернётся
}

interface Message {
  id: string;
  text: string;
  time: string;
  timestamp: Date;
  isOwn: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  isEncrypted: boolean;
  isAI?: boolean;
  senderName?: string;
}

// Mock data - теперь AI интегрирован во все чаты с врачами
const mockChats: Chat[] = [
  { 
    id: '1', 
    name: 'Иванов Иван Иванович', 
    role: 'Ортопед-вертебролог',
    avatar: 'ИИ',
    lastMessage: 'Результаты рентгена хорошие, продолжайте носить корсет',
    lastMessageTime: '10:30',
    unread: 2,
    online: true,
    type: 'doctor',
    isVerified: true,
    aiActive: true, // AI активен по умолчанию
  },
  { 
    id: '2', 
    name: 'Петрова Анна Сергеевна', 
    role: 'Врач ЛФК',
    avatar: 'ПА',
    lastMessage: 'Не забудьте про упражнения сегодня',
    lastMessageTime: 'Вчера',
    unread: 0,
    online: false,
    type: 'doctor',
    isVerified: true,
    aiActive: false, // AI отключен - врач недавно отвечал
    lastDoctorResponse: new Date(Date.now() - 30 * 60 * 1000), // 30 минут назад
    aiWillReturnAt: new Date(Date.now() + 60 * 60 * 1000), // Через 1 час
  },
  { 
    id: '3', 
    name: 'Служба поддержки', 
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
  { id: '1', text: 'Добрый день! Как вы себя чувствуете после последнего осмотра?', time: '10:15', timestamp: new Date(Date.now() - 3600000), isOwn: false, status: 'read', isEncrypted: true, senderName: 'Иванов И.И.' },
  { id: '2', text: 'Здравствуйте! Чувствую себя хорошо, спина меньше устаёт', time: '10:20', timestamp: new Date(Date.now() - 3500000), isOwn: true, status: 'read', isEncrypted: true },
  { id: 'ai-1', text: 'Отлично, что вы чувствуете улучшение! Это хороший знак. Продолжайте соблюдать режим ношения корсета. Врач ответит вам в ближайшее время.\n\n🤖 Автоматический ответ AI-ассистента', time: '10:21', timestamp: new Date(Date.now() - 3450000), isOwn: false, status: 'read', isEncrypted: true, isAI: true },
  { id: '3', text: 'Результаты рентгена хорошие, продолжайте носить корсет по графику', time: '10:25', timestamp: new Date(Date.now() - 3400000), isOwn: false, status: 'read', isEncrypted: true, senderName: 'Иванов И.И.' },
  { id: '4', text: 'Спасибо! А когда следующий приём?', time: '10:28', timestamp: new Date(Date.now() - 3300000), isOwn: true, status: 'delivered', isEncrypted: true },
];

export default function Messages() {
  const { t, language } = useLanguage();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [showAIInfo, setShowAIInfo] = useState(false);
  const [keyFingerprint, setKeyFingerprint] = useState<string>('');
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Инициализация ключей шифрования
  useEffect(() => {
    async function initKeys() {
      const keys = await keyStore.getOrCreateKeyPair();
      const fingerprint = await generateKeyFingerprint(keys.publicKey);
      setKeyFingerprint(fingerprint);
    }
    initKeys();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Загрузка сообщений при выборе чата
  useEffect(() => {
    if (selectedChat) {
      setMessages(mockMessages);
    }
  }, [selectedChat, language]);

  // Проверка таймера возврата AI каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      setChats(prevChats => prevChats.map(chat => {
        if (!chat.aiActive && chat.aiWillReturnAt && new Date() >= chat.aiWillReturnAt) {
          return { ...chat, aiActive: true, aiWillReturnAt: undefined };
        }
        return chat;
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Добавляем пометку что это AI
    const aiSignature = language === 'ru' 
      ? '\n\n🤖 Автоматический ответ AI-ассистента. Врач ответит вам в ближайшее время.'
      : '\n\n🤖 Automatic AI assistant response. The doctor will reply soon.';
    
    if (lowerMessage.includes('корсет') || lowerMessage.includes('corset') || lowerMessage.includes('носить')) {
      return (language === 'ru'
        ? 'Корсет Шено следует носить согласно рекомендациям врача. Обычно это 20-23 часа в сутки. Важно снимать его только для гигиенических процедур и специальных упражнений.\n\nОсновные правила:\n• Надевайте корсет на тонкую хлопковую футболку\n• Проверяйте правильность посадки перед зеркалом\n• Следите за состоянием кожи под корсетом'
        : 'The Cheneau corset should be worn according to your doctor\'s recommendations. Usually this is 20-23 hours a day.\n\nMain rules:\n• Wear the corset over a thin cotton t-shirt\n• Check the fit in front of a mirror\n• Monitor the skin condition under the corset') + aiSignature;
    }
    
    if (lowerMessage.includes('упражнен') || lowerMessage.includes('exercise') || lowerMessage.includes('лфк') || lowerMessage.includes('гимнастик')) {
      return (language === 'ru'
        ? 'Рекомендую выполнять комплекс упражнений Шрот 2 раза в день по 30 минут:\n\n1. Дыхательная гимнастика (10 мин)\n2. Растяжка мышц спины (10 мин)\n3. Укрепляющие упражнения (10 мин)\n\nВидеоинструкции доступны в разделе "Реабилитация".'
        : 'I recommend doing the Schroth exercise complex twice a day for 30 minutes:\n\n1. Breathing exercises (10 min)\n2. Back muscle stretching (10 min)\n3. Strengthening exercises (10 min)') + aiSignature;
    }
    
    if (lowerMessage.includes('боль') || lowerMessage.includes('pain') || lowerMessage.includes('болит') || lowerMessage.includes('дискомфорт')) {
      return (language === 'ru'
        ? '⚠️ Если вы испытываете боль, важно определить её характер:\n\n• Небольшой дискомфорт при адаптации к корсету — это нормально (первые 2 недели)\n• Покраснение кожи в местах давления — нужна корректировка корсета\n• Острая боль или онемение — срочно обратитесь к врачу!\n\nЕсли боль не проходит более 2-3 дней, рекомендую записаться на внеплановый приём.'
        : '⚠️ If you\'re experiencing pain, it\'s important to identify its nature:\n\n• Some discomfort when adapting to the corset is normal (first 2 weeks)\n• Skin redness at pressure points — corset adjustment needed\n• Sharp pain or numbness — see a doctor urgently!') + aiSignature;
    }

    if (lowerMessage.includes('приём') || lowerMessage.includes('запис') || lowerMessage.includes('appointment') || lowerMessage.includes('врач')) {
      return (language === 'ru'
        ? 'Для записи на приём вы можете:\n\n1. Перейти в раздел "Записи" в приложении\n2. Позвонить по телефону: +7 (495) 123-45-67\n3. Написать в этот чат — врач ответит в ближайшее время\n\nБлижайшие свободные даты: 20, 22, 25 января.'
        : 'To book an appointment you can:\n\n1. Go to the "Appointments" section in the app\n2. Call: +7 (495) 123-45-67\n3. Write in this chat — the doctor will reply soon') + aiSignature;
    }
    
    return (language === 'ru'
      ? 'Спасибо за ваш вопрос. Я передам его врачу.\n\nМогу помочь с информацией о:\n• Режиме ношения корсета\n• Упражнениях и ЛФК\n• Записи на приём\n• Результатах обследований'
      : 'Thank you for your question. I will pass it to the doctor.\n\nI can help with information about:\n• Corset wearing schedule\n• Exercises and physical therapy\n• Booking appointments\n• Examination results') + aiSignature;
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

    // Имитация отправки
    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => m.id === message.id ? { ...m, status: 'sent' } : m)
      );
    }, 300);

    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => m.id === message.id ? { ...m, status: 'delivered' } : m)
      );
    }, 600);

    // AI отвечает если активен в этом чате (для чатов с врачами)
    if (selectedChat.type === 'doctor' && selectedChat.aiActive) {
      setAiTyping(true);
      
      // Имитация обработки на Ollama
      const thinkingTime = 1500 + Math.random() * 1500;
      
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
      }, thinkingTime);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Симуляция ответа врача (деактивирует AI)
  const simulateDoctorResponse = () => {
    if (!selectedChat) return;
    
    const doctorMessage: Message = {
      id: Date.now().toString(),
      text: language === 'ru' 
        ? 'Добрый день! Я посмотрел ваш вопрос. Давайте обсудим подробнее.'
        : 'Good afternoon! I looked at your question. Let\'s discuss in detail.',
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(),
      isOwn: false,
      status: 'read',
      isEncrypted: true,
      senderName: selectedChat.name
    };
    
    setMessages(prev => [...prev, doctorMessage]);
    
    // Деактивируем AI на 1.5 часа
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === selectedChat.id) {
        return {
          ...chat,
          aiActive: false,
          lastDoctorResponse: new Date(),
          aiWillReturnAt: new Date(Date.now() + 90 * 60 * 1000) // 1.5 часа
        };
      }
      return chat;
    }));
    
    // Обновляем selectedChat
    setSelectedChat(prev => prev ? {
      ...prev,
      aiActive: false,
      lastDoctorResponse: new Date(),
      aiWillReturnAt: new Date(Date.now() + 90 * 60 * 1000)
    } : null);
  };

  const toggleAI = () => {
    if (!selectedChat) return;
    
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === selectedChat.id) {
        return { ...chat, aiActive: !chat.aiActive, aiWillReturnAt: undefined };
      }
      return chat;
    }));
    
    setSelectedChat(prev => prev ? { ...prev, aiActive: !prev.aiActive, aiWillReturnAt: undefined } : null);
  };

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: Message['status'], isOwn: boolean) => {
    if (!isOwn) return null;
    switch (status) {
      case 'sending':
        return <Clock size={14} className="text-accent-foreground/50" />;
      case 'sent':
        return <Check size={14} className="text-accent-foreground/50" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-accent-foreground/50" />;
      case 'read':
        return <CheckCheck size={14} className="text-accent-foreground/80" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-400" />;
    }
  };

  const getChatAvatar = (chat: Chat) => {
    return (
      <div className={cn(
        "w-full h-full rounded-full flex items-center justify-center font-bold text-sm",
        chat.id === '1' ? "bg-accent text-white" :
        chat.id === '2' ? "bg-[hsl(75,100%,45%)] text-[hsl(220,20%,15%)]" :
        "bg-[hsl(30,100%,70%)] text-[hsl(220,20%,15%)]"
      )}>
        {chat.avatar}
      </div>
    );
  };

  const formatTimeRemaining = (date: Date): string => {
    const diff = date.getTime() - Date.now();
    if (diff <= 0) return language === 'ru' ? 'скоро' : 'soon';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return language === 'ru' ? `${hours}ч ${mins}м` : `${hours}h ${mins}m`;
    }
    return language === 'ru' ? `${mins}м` : `${mins}m`;
  };

  return (
    <AppLayout title={t("messages.title")}>
      <div className="h-[calc(100vh-180px)] lg:h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-4 px-4 py-4 lg:px-8 lg:py-6 max-w-7xl mx-auto">
        {/* Chat List - Hidden on mobile when chat is selected */}
        <div className={cn(
          "w-full lg:w-80 flex-shrink-0 flex flex-col",
          selectedChat && "hidden lg:flex"
        )}>
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-xl font-bold mb-1">{t("messages.title")}</h1>
            <div className="flex items-center gap-2 text-sm text-accent">
              <Shield size={14} />
              <span>{t("messages.encrypted")}</span>
            </div>
          </div>

          {/* AI Info Banner */}
          <div className="mb-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-2">
              <Bot size={18} className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-700 dark:text-purple-300">
                <p className="font-medium mb-1">
                  {language === 'ru' ? 'AI-ассистент интегрирован' : 'AI assistant integrated'}
                </p>
                <p className="text-purple-600 dark:text-purple-400">
                  {language === 'ru' 
                    ? 'AI отвечает пока врач недоступен. Возвращается через 1.5ч после ответа врача.'
                    : 'AI responds while doctor is unavailable. Returns 1.5h after doctor\'s response.'}
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("messages.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-scolio pl-10 py-2.5 text-sm"
            />
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  "w-full p-3 rounded-xl text-left transition-all",
                  selectedChat?.id === chat.id
                    ? "bg-accent/10 border-2 border-accent/30"
                    : "hover:bg-muted border-2 border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    {getChatAvatar(chat)}
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{chat.name}</p>
                        {chat.isVerified && <Shield size={12} className="text-accent flex-shrink-0" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{chat.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{chat.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground truncate flex-1">{chat.lastMessage}</p>
                      {chat.type === 'doctor' && (
                        <span className={cn(
                          "flex-shrink-0 w-2 h-2 rounded-full",
                          chat.aiActive ? "bg-purple-500" : "bg-gray-300"
                        )} title={chat.aiActive ? 'AI активен' : 'AI неактивен'} />
                      )}
                    </div>
                  </div>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        {selectedChat ? (
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="lg:hidden w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="relative w-10 h-10">
                  {getChatAvatar(selectedChat)}
                  {selectedChat.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm">{selectedChat.name}</p>
                    {selectedChat.isVerified && <Shield size={12} className="text-accent" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.online 
                      ? (language === 'ru' ? 'В сети' : 'Online')
                      : (language === 'ru' ? 'Был(а) недавно' : 'Last seen recently')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* AI Status Toggle */}
                {selectedChat.type === 'doctor' && (
                  <button 
                    onClick={() => setShowAIInfo(true)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      selectedChat.aiActive 
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    )}
                  >
                    <Bot size={14} />
                    <span>{selectedChat.aiActive 
                      ? (language === 'ru' ? 'AI активен' : 'AI active')
                      : (language === 'ru' ? 'AI неактивен' : 'AI inactive')
                    }</span>
                    {!selectedChat.aiActive && selectedChat.aiWillReturnAt && (
                      <span className="flex items-center gap-1 text-xs opacity-70">
                        <Timer size={10} />
                        {formatTimeRemaining(selectedChat.aiWillReturnAt)}
                      </span>
                    )}
                  </button>
                )}
                <button 
                  onClick={() => setShowEncryptionInfo(true)}
                  className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center hover:bg-accent/20 transition-colors"
                  title={language === 'ru' ? 'Информация о шифровании' : 'Encryption info'}
                >
                  <Lock size={16} className="text-accent" />
                </button>
                {selectedChat.type === 'doctor' && (
                  <>
                    <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                      <Phone size={18} className="text-muted-foreground" />
                    </button>
                    <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                      <Video size={18} className="text-muted-foreground" />
                    </button>
                  </>
                )}
                <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <MoreVertical size={18} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
              {/* Encryption Notice */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs">
                  <Lock size={12} />
                  <span>{t("messages.encrypted")}</span>
                </div>
              </div>

              {/* AI Integration Notice */}
              {selectedChat.type === 'doctor' && (
                <div className="flex justify-center">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
                    selectedChat.aiActive 
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  )}>
                    <Bot size={12} />
                    <span>
                      {selectedChat.aiActive 
                        ? (language === 'ru' ? 'AI-ассистент отвечает пока врач недоступен' : 'AI assistant responds while doctor is unavailable')
                        : (language === 'ru' ? 'Врач в чате • AI вернётся через ' + (selectedChat.aiWillReturnAt ? formatTimeRemaining(selectedChat.aiWillReturnAt) : '1.5ч') : 'Doctor in chat • AI returns in ' + (selectedChat.aiWillReturnAt ? formatTimeRemaining(selectedChat.aiWillReturnAt) : '1.5h'))
                      }
                    </span>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.isOwn ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] lg:max-w-[60%] rounded-2xl px-4 py-2.5",
                      message.isOwn
                        ? "bg-accent text-accent-foreground rounded-br-md"
                        : message.isAI
                          ? "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-bl-md"
                          : "bg-card border rounded-bl-md"
                    )}
                  >
                    {/* Sender name for doctor messages */}
                    {!message.isOwn && !message.isAI && message.senderName && (
                      <div className="flex items-center gap-1.5 mb-1 text-accent">
                        <User size={12} />
                        <span className="text-xs font-medium">{message.senderName}</span>
                      </div>
                    )}
                    {message.isAI && (
                      <div className="flex items-center gap-1.5 mb-2 text-purple-600 dark:text-purple-400">
                        <Sparkles size={12} />
                        <span className="text-xs font-medium">AI Assistant</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <div className={cn(
                      "flex items-center justify-end gap-1.5 mt-1.5",
                      message.isOwn ? "text-accent-foreground/70" : "text-muted-foreground"
                    )}>
                      {message.isEncrypted && (
                        <Lock size={10} className={message.isOwn ? "text-accent-foreground/50" : "text-muted-foreground/50"} />
                      )}
                      <span className="text-xs">{message.time}</span>
                      {getStatusIcon(message.status, message.isOwn)}
                    </div>
                  </div>
                </div>
              ))}

              {/* AI Typing indicator */}
              {aiTyping && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-purple-500" />
                      <span className="text-xs text-purple-600 dark:text-purple-400 mr-2">AI</span>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-card">
              {/* Demo buttons for testing */}
              {selectedChat.type === 'doctor' && (
                <div className="flex gap-2 mb-3">
                  <button 
                    onClick={simulateDoctorResponse}
                    className="text-xs px-3 py-1 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    {language === 'ru' ? '🧪 Симуляция ответа врача' : '🧪 Simulate doctor response'}
                  </button>
                  <button 
                    onClick={toggleAI}
                    className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                  >
                    {selectedChat.aiActive 
                      ? (language === 'ru' ? '🤖 Выключить AI' : '🤖 Disable AI')
                      : (language === 'ru' ? '🤖 Включить AI' : '🤖 Enable AI')
                    }
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0">
                  <Paperclip size={20} className="text-muted-foreground" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t("messages.typeMessage")}
                    className="input-scolio py-2.5 pr-10 resize-none min-h-[44px] max-h-32"
                    rows={1}
                  />
                  <button className="absolute right-3 bottom-2.5">
                    <Smile size={20} className="text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </div>
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                    newMessage.trim()
                      ? "bg-accent text-accent-foreground hover:opacity-90"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <SendIcon size={20} />
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 hidden lg:flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-1">
                {language === 'ru' ? 'Выберите чат' : 'Select a chat'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'ru' 
                  ? 'Все сообщения защищены сквозным шифрованием' 
                  : 'All messages are end-to-end encrypted'}
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-purple-600">
                <Bot size={14} />
                <span>{language === 'ru' ? 'AI-ассистент интегрирован во все чаты' : 'AI assistant integrated in all chats'}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* AI Info Modal */}
      {showAIInfo && selectedChat && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowAIInfo(false)}
        >
          <Card 
            className="w-full max-w-md animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                  <Bot size={32} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {language === 'ru' ? 'AI-ассистент в чате' : 'AI Assistant in Chat'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'ru' 
                    ? 'AI-ассистент помогает отвечать на вопросы пока врач недоступен' 
                    : 'AI assistant helps answer questions while the doctor is unavailable'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      {language === 'ru' ? 'Статус AI' : 'AI Status'}
                    </p>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      selectedChat.aiActive 
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    )}>
                      {selectedChat.aiActive 
                        ? (language === 'ru' ? 'Активен' : 'Active')
                        : (language === 'ru' ? 'Неактивен' : 'Inactive')
                      }
                    </span>
                  </div>
                  {!selectedChat.aiActive && selectedChat.aiWillReturnAt && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Timer size={12} />
                      {language === 'ru' 
                        ? `Вернётся через ${formatTimeRemaining(selectedChat.aiWillReturnAt)}`
                        : `Returns in ${formatTimeRemaining(selectedChat.aiWillReturnAt)}`
                      }
                    </p>
                  )}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Sparkles size={18} className="text-purple-500 flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      {language === 'ru' 
                        ? 'AI отвечает на вопросы пока врач не в сети' 
                        : 'AI answers questions while doctor is offline'}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Timer size={18} className="text-purple-500 flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      {language === 'ru' 
                        ? 'Когда врач отвечает, AI уходит в фон на 1.5 часа' 
                        : 'When doctor responds, AI goes silent for 1.5 hours'}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield size={18} className="text-purple-500 flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      {language === 'ru' 
                        ? 'AI работает на локальном сервере Ollama' 
                        : 'AI runs on local Ollama server'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={toggleAI}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-medium transition-colors",
                    selectedChat.aiActive 
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                      : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 hover:bg-purple-200"
                  )}
                >
                  {selectedChat.aiActive 
                    ? (language === 'ru' ? 'Выключить AI' : 'Disable AI')
                    : (language === 'ru' ? 'Включить AI' : 'Enable AI')
                  }
                </button>
                <button 
                  onClick={() => setShowAIInfo(false)}
                  className="flex-1 btn-scolio-primary"
                >
                  {language === 'ru' ? 'Понятно' : 'Got it'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Encryption Info Modal */}
      {showEncryptionInfo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowEncryptionInfo(false)}
        >
          <Card 
            className="w-full max-w-md animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Lock size={32} className="text-accent" />
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {language === 'ru' ? 'Сквозное шифрование (E2EE)' : 'End-to-End Encryption (E2EE)'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'ru' 
                    ? 'Ваши сообщения защищены шифрованием. Только вы и получатель можете их прочитать.' 
                    : 'Your messages are protected by encryption. Only you and the recipient can read them.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted">
                  <p className="text-xs text-muted-foreground mb-2">
                    {language === 'ru' ? 'Ваш отпечаток ключа' : 'Your key fingerprint'}
                  </p>
                  <p className="font-mono text-sm">{keyFingerprint || 'Загрузка...'}</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Shield size={18} className="text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      {language === 'ru' 
                        ? 'AES-256-GCM для шифрования сообщений' 
                        : 'AES-256-GCM for message encryption'}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield size={18} className="text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      {language === 'ru' 
                        ? 'ECDH (P-256) для обмена ключами' 
                        : 'ECDH (P-256) for key exchange'}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield size={18} className="text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      {language === 'ru' 
                        ? 'Сервер не имеет доступа к содержимому' 
                        : 'Server has no access to content'}
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowEncryptionInfo(false)}
                className="w-full mt-6 btn-scolio-primary"
              >
                {language === 'ru' ? 'Понятно' : 'Got it'}
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
