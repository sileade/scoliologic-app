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
import { Shield, Paperclip, Smile, MoreVertical, Phone, Video, Lock, Sparkles, Bot, Check, CheckCheck, Clock, AlertCircle, ChevronLeft, User, Info } from "lucide-react";
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
}

// Mock data
const mockChats: Chat[] = [
  { 
    id: 'ai', 
    name: 'AI-Ассистент', 
    role: 'Медицинский помощник • Ollama',
    avatar: 'AI',
    lastMessage: 'Чем могу помочь?',
    lastMessageTime: '10:30',
    unread: 0,
    online: true,
    type: 'ai'
  },
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
    isVerified: true
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
    isVerified: true
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
    type: 'support'
  },
];

const mockMessages: Message[] = [
  { id: '1', text: 'Добрый день! Как вы себя чувствуете после последнего осмотра?', time: '10:15', timestamp: new Date(Date.now() - 3600000), isOwn: false, status: 'read', isEncrypted: true },
  { id: '2', text: 'Здравствуйте! Чувствую себя хорошо, спина меньше устаёт', time: '10:20', timestamp: new Date(Date.now() - 3500000), isOwn: true, status: 'read', isEncrypted: true },
  { id: '3', text: 'Отлично! Результаты рентгена хорошие, продолжайте носить корсет по графику', time: '10:25', timestamp: new Date(Date.now() - 3400000), isOwn: false, status: 'read', isEncrypted: true },
  { id: '4', text: 'Спасибо! А когда следующий приём?', time: '10:28', timestamp: new Date(Date.now() - 3300000), isOwn: true, status: 'delivered', isEncrypted: true },
];

const aiInitialMessage: Message = {
  id: 'ai-init',
  text: 'Здравствуйте! Я AI-ассистент Scoliologic на базе локальной модели Ollama. Могу ответить на вопросы о вашем лечении, упражнениях и режиме ношения корсета. Все сообщения обрабатываются локально и защищены шифрованием. Чем могу помочь?',
  time: '10:30',
  timestamp: new Date(),
  isOwn: false,
  status: 'read',
  isEncrypted: true,
  isAI: true
};

export default function Messages() {
  const { t, language } = useLanguage();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [keyFingerprint, setKeyFingerprint] = useState<string>('');
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
      if (selectedChat.type === 'ai') {
        setMessages([{
          ...aiInitialMessage,
          text: language === 'ru' 
            ? 'Здравствуйте! Я AI-ассистент Scoliologic на базе локальной модели Ollama. Могу ответить на вопросы о вашем лечении, упражнениях и режиме ношения корсета. Все сообщения обрабатываются локально и защищены шифрованием. Чем могу помочь?'
            : 'Hello! I am the Scoliologic AI assistant powered by local Ollama model. I can answer questions about your treatment, exercises, and corset wearing schedule. All messages are processed locally and encrypted. How can I help?'
        }]);
      } else {
        setMessages(mockMessages);
      }
    }
  }, [selectedChat, language]);

  const getAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('корсет') || lowerMessage.includes('corset') || lowerMessage.includes('носить')) {
      return language === 'ru'
        ? 'Корсет Шено следует носить согласно рекомендациям врача. Обычно это 20-23 часа в сутки. Важно снимать его только для гигиенических процедур и специальных упражнений. Если у вас есть дискомфорт, обязательно сообщите врачу на следующем приёме.\n\nОсновные правила:\n• Надевайте корсет на тонкую хлопковую футболку\n• Проверяйте правильность посадки перед зеркалом\n• Следите за состоянием кожи под корсетом'
        : 'The Cheneau corset should be worn according to your doctor\'s recommendations. Usually this is 20-23 hours a day. It\'s important to remove it only for hygiene procedures and special exercises.\n\nMain rules:\n• Wear the corset over a thin cotton t-shirt\n• Check the fit in front of a mirror\n• Monitor the skin condition under the corset';
    }
    
    if (lowerMessage.includes('упражнен') || lowerMessage.includes('exercise') || lowerMessage.includes('лфк') || lowerMessage.includes('гимнастик')) {
      return language === 'ru'
        ? 'Рекомендую выполнять комплекс упражнений Шрот 2 раза в день по 30 минут. Основные упражнения:\n\n1. Дыхательная гимнастика (10 мин)\n2. Растяжка мышц спины (10 мин)\n3. Укрепляющие упражнения (10 мин)\n\nВидеоинструкции доступны в разделе "Реабилитация". Хотите, чтобы я напомнил вам о времени упражнений?'
        : 'I recommend doing the Schroth exercise complex twice a day for 30 minutes. Main exercises:\n\n1. Breathing exercises (10 min)\n2. Back muscle stretching (10 min)\n3. Strengthening exercises (10 min)\n\nVideo instructions are available in the "Rehabilitation" section. Would you like me to remind you about exercise time?';
    }
    
    if (lowerMessage.includes('боль') || lowerMessage.includes('pain') || lowerMessage.includes('болит') || lowerMessage.includes('дискомфорт')) {
      return language === 'ru'
        ? '⚠️ Если вы испытываете боль, важно определить её характер:\n\n• Небольшой дискомфорт при адаптации к корсету — это нормально (первые 2 недели)\n• Покраснение кожи в местах давления — нужна корректировка корсета\n• Острая боль или онемение — срочно обратитесь к врачу!\n\nЕсли боль не проходит более 2-3 дней, рекомендую записаться на внеплановый приём. Хотите, чтобы я помог записаться?'
        : '⚠️ If you\'re experiencing pain, it\'s important to identify its nature:\n\n• Some discomfort when adapting to the corset is normal (first 2 weeks)\n• Skin redness at pressure points — corset adjustment needed\n• Sharp pain or numbness — see a doctor urgently!\n\nIf the pain doesn\'t go away for more than 2-3 days, I recommend scheduling an appointment. Would you like me to help you book one?';
    }

    if (lowerMessage.includes('приём') || lowerMessage.includes('запис') || lowerMessage.includes('appointment') || lowerMessage.includes('врач')) {
      return language === 'ru'
        ? 'Для записи на приём вы можете:\n\n1. Перейти в раздел "Записи" в приложении\n2. Позвонить по телефону: +7 (495) 123-45-67\n3. Написать в этот чат вашему лечащему врачу\n\nБлижайшие свободные даты для планового осмотра: 20, 22, 25 января. Какой день вам удобен?'
        : 'To book an appointment you can:\n\n1. Go to the "Appointments" section in the app\n2. Call: +7 (495) 123-45-67\n3. Write to your doctor in this chat\n\nNearest available dates for a routine checkup: January 20, 22, 25. Which day works for you?';
    }

    if (lowerMessage.includes('угол') || lowerMessage.includes('кобб') || lowerMessage.includes('cobb') || lowerMessage.includes('градус')) {
      return language === 'ru'
        ? 'Угол Кобба — это показатель степени искривления позвоночника. По вашим последним данным:\n\n📊 Текущий угол: 25°\n📈 Предыдущий: 28° (3 месяца назад)\n✅ Динамика: -3° (положительная)\n\nЭто хороший результат! Продолжайте соблюдать режим ношения корсета и выполнять упражнения.'
        : 'The Cobb angle is a measure of spinal curvature. According to your latest data:\n\n📊 Current angle: 25°\n📈 Previous: 28° (3 months ago)\n✅ Progress: -3° (positive)\n\nThis is a good result! Continue following the corset wearing schedule and doing exercises.';
    }
    
    return language === 'ru'
      ? 'Спасибо за ваш вопрос. Я обработал его локально на сервере Ollama. Для более точного ответа рекомендую обсудить это с вашим лечащим врачом на следующем приёме.\n\nМогу помочь с информацией о:\n• Режиме ношения корсета\n• Упражнениях и ЛФК\n• Записи на приём\n• Результатах обследований'
      : 'Thank you for your question. I processed it locally on the Ollama server. For a more accurate answer, I recommend discussing this with your doctor at your next appointment.\n\nI can help with information about:\n• Corset wearing schedule\n• Exercises and physical therapy\n• Booking appointments\n• Examination results';
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

    // AI ответ
    if (selectedChat.type === 'ai') {
      setIsTyping(true);
      
      // Имитация обработки на Ollama
      const thinkingTime = 1500 + Math.random() * 1500;
      
      setTimeout(() => {
        setIsTyping(false);
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

  const filteredChats = mockChats.filter(chat => 
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
    if (chat.type === 'ai') {
      return (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
      );
    }
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
                        {chat.type === 'ai' && <Bot size={12} className="text-purple-500 flex-shrink-0" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{chat.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{chat.role}</p>
                    <p className="text-sm text-muted-foreground truncate mt-1">{chat.lastMessage}</p>
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
                    {selectedChat.type === 'ai' && <Bot size={12} className="text-purple-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.type === 'ai' 
                      ? (language === 'ru' ? 'Ollama • Локальная обработка' : 'Ollama • Local processing')
                      : selectedChat.online 
                        ? (language === 'ru' ? 'В сети' : 'Online')
                        : (language === 'ru' ? 'Был(а) недавно' : 'Last seen recently')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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

              {/* AI Notice */}
              {selectedChat.type === 'ai' && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs">
                    <Bot size={12} />
                    <span>{language === 'ru' ? 'AI на базе Ollama • Локальная сеть' : 'AI powered by Ollama • Local network'}</span>
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

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-purple-500" />
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
              <div className="flex items-end gap-2">
                <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0">
                  <Paperclip size={20} className="text-muted-foreground" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedChat.type === 'ai' 
                      ? (language === 'ru' ? 'Задайте вопрос AI-ассистенту...' : 'Ask the AI assistant...')
                      : t("messages.typeMessage")}
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
                <Sparkles size={14} />
                <span>{language === 'ru' ? 'AI-ассистент доступен 24/7' : 'AI assistant available 24/7'}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

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
