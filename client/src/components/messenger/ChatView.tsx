/**
 * Компонент просмотра чата
 */
import { useRef, useEffect } from 'react';
import { ChevronLeft, Bot, Lock, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageBubble, TypingIndicator, type Message } from './MessageBubble';
import { MessageInput } from './MessageInput';
import type { Chat } from './ChatList';

interface ChatViewProps {
  chat: Chat;
  messages: Message[];
  isLoading?: boolean;
  isTyping?: boolean;
  onBack: () => void;
  onSendMessage: (text: string) => void;
  onAttach?: () => void;
}

export function ChatView({
  chat,
  messages,
  isLoading,
  isTyping,
  onBack,
  onSendMessage,
  onAttach,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const haptic = (intensity: number = 10) => {
    if (navigator.vibrate) navigator.vibrate(intensity);
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="chat-container bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <ChatHeader chat={chat} onBack={onBack} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <MessagesLoading />
        ) : messages.length === 0 ? (
          <EmptyMessages chat={chat} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                showSenderName={chat.type === 'doctor'}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={onSendMessage}
        onAttach={onAttach}
        placeholder={chat.type === 'support' ? 'Задайте вопрос AI...' : 'Сообщение...'}
      />
    </div>
  );
}

function ChatHeader({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const haptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <header className="mobile-header bg-white border-b border-gray-100">
      <div className="flex items-center gap-3 flex-1">
        <button
          className="btn-icon -ml-2"
          onClick={() => {
            haptic();
            onBack();
          }}
          aria-label="Назад к списку чатов"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
            chat.avatar === '✨'
              ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white"
              : "bg-teal-100 text-teal-700"
          )}>
            {chat.avatar}
          </div>
          {chat.online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h2 className="font-semibold text-foreground truncate">{chat.name}</h2>
            {chat.aiActive && chat.avatar !== '✨' && (
              <Bot size={14} className="text-teal-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock size={10} />
            <span>Защищённый чат</span>
            {chat.online && <span className="text-green-500 ml-1">• В сети</span>}
          </div>
        </div>
      </div>

      {/* Menu button */}
      <button className="btn-icon" aria-label="Меню чата">
        <MoreVertical size={20} />
      </button>
    </header>
  );
}

function MessagesLoading() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
          <div className={cn(
            "rounded-2xl px-4 py-3 animate-pulse",
            i % 2 === 0 ? "bg-teal-200 w-2/3" : "bg-gray-200 w-1/2"
          )}>
            <div className="h-4 bg-white/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyMessages({ chat }: { chat: Chat }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className={cn(
        "w-20 h-20 rounded-full flex items-center justify-center mb-4",
        chat.avatar === '✨'
          ? "bg-gradient-to-br from-teal-500 to-teal-600"
          : "bg-teal-100"
      )}>
        {chat.avatar === '✨' ? (
          <Bot size={40} className="text-white" />
        ) : (
          <span className="text-3xl">{chat.avatar}</span>
        )}
      </div>
      <h3 className="font-semibold text-lg text-foreground mb-1">{chat.name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{chat.role}</p>
      <p className="text-sm text-gray-400">
        {chat.type === 'support' 
          ? 'Задайте любой вопрос о лечении сколиоза'
          : 'Начните диалог с врачом'}
      </p>
    </div>
  );
}
