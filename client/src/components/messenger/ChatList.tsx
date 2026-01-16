/**
 * Компонент списка чатов
 */
import { cn } from '@/lib/utils';
import { SwipeableCard } from '@/components/SwipeableCard';
import { Bot, Archive } from 'lucide-react';

export interface Chat {
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

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chat: Chat) => void;
  onArchiveChat?: (chatId: string) => void;
  isLoading?: boolean;
}

export function ChatList({ chats, onSelectChat, onArchiveChat, isLoading }: ChatListProps) {
  const haptic = (intensity: number = 10) => {
    if (navigator.vibrate) navigator.vibrate(intensity);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {[1, 2, 3].map((i) => (
          <div key={i} className="mobile-list-item animate-pulse">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1 ml-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <Bot className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">Нет активных чатов</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {chats.map((chat, index) => (
        <SwipeableCard
          key={chat.id}
          onSwipeLeft={() => {
            haptic(25);
            onArchiveChat?.(chat.id);
          }}
          leftAction={<Archive className="w-5 h-5" />}
        >
          <button
            onClick={() => {
              haptic();
              onSelectChat(chat);
            }}
            className={cn(
              "w-full mobile-list-item",
              index === chats.length - 1 && "border-b-0"
            )}
            aria-label={`Чат с ${chat.name}${chat.unread > 0 ? `, ${chat.unread} непрочитанных` : ''}`}
          >
            <ChatAvatar chat={chat} />
            <ChatInfo chat={chat} />
          </button>
        </SwipeableCard>
      ))}
    </div>
  );
}

function ChatAvatar({ chat }: { chat: Chat }) {
  return (
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
        <span 
          className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"
          aria-label="В сети"
        />
      )}
    </div>
  );
}

function ChatInfo({ chat }: { chat: Chat }) {
  return (
    <div className="flex-1 min-w-0 ml-3 text-left">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground truncate flex items-center gap-1">
          {chat.name}
          {chat.aiActive && chat.avatar !== '✨' && (
            <Bot size={14} className="text-teal-500" aria-label="AI-ассистент активен" />
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
          <span 
            className="w-5 h-5 bg-teal-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0"
            aria-label={`${chat.unread} непрочитанных сообщений`}
          >
            {chat.unread}
          </span>
        )}
      </div>
    </div>
  );
}
