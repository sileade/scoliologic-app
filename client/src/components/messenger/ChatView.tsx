/**
 * Компонент просмотра чата
 * Упрощённая версия с компактным header и улучшенной индикацией AI
 */
import { useRef, useEffect } from 'react';
import { ChevronLeft, Sparkles, Shield } from 'lucide-react';
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const isAIChat = chat.type === 'support' || chat.avatar === '✨';

  return (
    <div className="chat-container bg-gray-50 flex flex-col h-full">
      {/* Simplified Header */}
      <ChatHeader chat={chat} onBack={onBack} isAIChat={isAIChat} />

      {/* AI Mode Indicator - только для чатов с врачом когда AI активен */}
      {!isAIChat && chat.aiActive && (
        <div className="px-4 py-2 bg-teal-50 border-b border-teal-100">
          <div className="flex items-center gap-2 text-xs text-teal-700">
            <Sparkles size={12} className="animate-pulse" />
            <span>AI-ассистент отвечает пока врач недоступен</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <MessagesLoading />
        ) : messages.length === 0 ? (
          <EmptyMessages chat={chat} isAIChat={isAIChat} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                showSenderName={chat.type === 'doctor'}
                compact
              />
            ))}
            {isTyping && <TypingIndicator compact />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={onSendMessage}
        onAttach={onAttach}
        placeholder={isAIChat ? 'Задайте вопрос...' : 'Сообщение...'}
      />
    </div>
  );
}

/**
 * Упрощённый header чата
 */
function ChatHeader({ 
  chat, 
  onBack, 
  isAIChat 
}: { 
  chat: Chat; 
  onBack: () => void;
  isAIChat: boolean;
}) {
  const haptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <header className="flex items-center gap-2 px-2 py-3 bg-white border-b border-gray-100 safe-top">
      {/* Back button */}
      <button
        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors active:bg-gray-100"
        onClick={() => {
          haptic();
          onBack();
        }}
        aria-label="Назад"
      >
        <ChevronLeft size={24} className="text-gray-600" />
      </button>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold",
          isAIChat
            ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white"
            : "bg-gray-100 text-gray-700"
        )}>
          {isAIChat ? <Sparkles size={20} /> : chat.avatar}
        </div>
        {chat.online && !isAIChat && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-gray-900 truncate text-sm">
          {isAIChat ? 'AI-ассистент' : chat.name}
        </h2>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Shield size={10} />
          <span>Защищено</span>
          {chat.online && !isAIChat && (
            <span className="text-green-500 ml-1">• онлайн</span>
          )}
          {isAIChat && (
            <span className="text-teal-500 ml-1">• всегда на связи</span>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Skeleton загрузки сообщений
 */
function MessagesLoading() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
          <div className={cn(
            "rounded-2xl px-4 py-2.5 animate-pulse",
            i % 2 === 0 ? "bg-teal-100 w-2/3" : "bg-gray-200 w-1/2"
          )}>
            <div className="h-3 bg-white/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Пустое состояние чата
 */
function EmptyMessages({ chat, isAIChat }: { chat: Chat; isAIChat: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className={cn(
        "w-16 h-16 rounded-full flex items-center justify-center mb-4",
        isAIChat
          ? "bg-gradient-to-br from-teal-500 to-teal-600"
          : "bg-gray-100"
      )}>
        {isAIChat ? (
          <Sparkles size={28} className="text-white" />
        ) : (
          <span className="text-2xl">{chat.avatar}</span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">
        {isAIChat ? 'AI-ассистент' : chat.name}
      </h3>
      <p className="text-sm text-gray-500 max-w-[240px]">
        {isAIChat 
          ? 'Задайте любой вопрос о лечении сколиоза'
          : 'Начните диалог с врачом'}
      </p>
    </div>
  );
}
