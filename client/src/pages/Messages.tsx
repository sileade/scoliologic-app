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
  ProfileIcon
} from "@/components/NotionIcons";
import { Shield, Paperclip, Smile, MoreVertical, Phone, Video } from "lucide-react";

interface Chat {
  id: string;
  name: string;
  role: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  text: string;
  time: string;
  isOwn: boolean;
  status: 'sent' | 'delivered' | 'read';
}

// Mock data
const mockChats: Chat[] = [
  { 
    id: '1', 
    name: 'Иванов Иван Иванович', 
    role: 'Ортопед-вертебролог',
    avatar: 'ИИ',
    lastMessage: 'Результаты рентгена хорошие, продолжайте носить корсет',
    lastMessageTime: '10:30',
    unread: 2,
    online: true
  },
  { 
    id: '2', 
    name: 'Петрова Анна Сергеевна', 
    role: 'Врач ЛФК',
    avatar: 'ПА',
    lastMessage: 'Не забудьте про упражнения сегодня',
    lastMessageTime: 'Вчера',
    unread: 0,
    online: false
  },
  { 
    id: '3', 
    name: 'Служба поддержки', 
    role: 'Scoliologic',
    avatar: 'СП',
    lastMessage: 'Ваш запрос обработан',
    lastMessageTime: '15.01',
    unread: 0,
    online: true
  },
];

const mockMessages: Message[] = [
  { id: '1', text: 'Добрый день! Как вы себя чувствуете после последнего осмотра?', time: '10:15', isOwn: false, status: 'read' },
  { id: '2', text: 'Здравствуйте! Чувствую себя хорошо, спина меньше устаёт', time: '10:20', isOwn: true, status: 'read' },
  { id: '3', text: 'Отлично! Результаты рентгена хорошие, продолжайте носить корсет по графику', time: '10:25', isOwn: false, status: 'read' },
  { id: '4', text: 'Спасибо! А когда следующий приём?', time: '10:28', isOwn: true, status: 'delivered' },
];

export default function Messages() {
  const { t, language } = useLanguage();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(mockChats[0]);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      status: 'sent'
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
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
                  <div className="relative">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm",
                      chat.id === '1' ? "bg-accent text-white" :
                      chat.id === '2' ? "bg-[hsl(75,100%,45%)] text-[hsl(220,20%,15%)]" :
                      "bg-[hsl(30,100%,70%)] text-[hsl(220,20%,15%)]"
                    )}>
                      {chat.avatar}
                    </div>
                    {chat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-semibold text-sm truncate">{chat.name}</p>
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
                  ←
                </button>
                <div className="relative">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                    selectedChat.id === '1' ? "bg-accent text-white" :
                    selectedChat.id === '2' ? "bg-[hsl(75,100%,45%)] text-[hsl(220,20%,15%)]" :
                    "bg-[hsl(30,100%,70%)] text-[hsl(220,20%,15%)]"
                  )}>
                    {selectedChat.avatar}
                  </div>
                  {selectedChat.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{selectedChat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.online 
                      ? (language === 'ru' ? 'В сети' : 'Online')
                      : (language === 'ru' ? 'Был(а) недавно' : 'Last seen recently')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <Phone size={18} className="text-muted-foreground" />
                </button>
                <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <Video size={18} className="text-muted-foreground" />
                </button>
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
                  <LockIcon size={12} />
                  <span>{t("messages.encrypted")}</span>
                </div>
              </div>

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
                        : "bg-card border rounded-bl-md"
                    )}
                  >
                    <p className="text-sm">{message.text}</p>
                    <div className={cn(
                      "flex items-center justify-end gap-1 mt-1",
                      message.isOwn ? "text-accent-foreground/70" : "text-muted-foreground"
                    )}>
                      <span className="text-xs">{message.time}</span>
                      {message.isOwn && (
                        <span className="text-xs">
                          {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
              <MessageIcon size={48} className="mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-semibold mb-1">
                {language === 'ru' ? 'Выберите чат' : 'Select a chat'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'ru' 
                  ? 'Выберите диалог из списка слева' 
                  : 'Select a conversation from the list'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
