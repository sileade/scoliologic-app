/**
 * Компонент пузырька сообщения
 */
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Bot, Lock } from 'lucide-react';

export interface Message {
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

interface MessageBubbleProps {
  message: Message;
  showSenderName?: boolean;
}

export function MessageBubble({ message, showSenderName = false }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex mb-2",
        message.isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 relative",
          message.isOwn
            ? "bg-teal-500 text-white rounded-br-sm"
            : message.isAI
              ? "bg-gradient-to-br from-teal-50 to-lime-50 border border-teal-200 rounded-bl-sm"
              : "bg-white border border-gray-100 rounded-bl-sm"
        )}
      >
        {/* AI indicator */}
        {message.isAI && (
          <div className="flex items-center gap-1 text-xs text-teal-600 mb-1">
            <Bot size={12} />
            <span>AI-ассистент</span>
          </div>
        )}

        {/* Sender name for group chats */}
        {showSenderName && message.senderName && !message.isOwn && !message.isAI && (
          <p className="text-xs font-medium text-teal-600 mb-1">
            {message.senderName}
          </p>
        )}

        {/* Message text */}
        <p className={cn(
          "text-sm whitespace-pre-wrap break-words",
          message.isOwn ? "text-white" : "text-foreground"
        )}>
          {message.text}
        </p>

        {/* Footer: time, encryption, status */}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1",
          message.isOwn ? "text-white/70" : "text-muted-foreground"
        )}>
          {message.isEncrypted && (
            <Lock size={10} aria-label="Зашифровано" />
          )}
          <span className="text-[10px]">{message.time}</span>
          <MessageStatus status={message.status} isOwn={message.isOwn} />
        </div>
      </div>
    </div>
  );
}

function MessageStatus({ status, isOwn }: { status: Message['status']; isOwn: boolean }) {
  if (!isOwn) return null;

  switch (status) {
    case 'read':
      return <CheckCheck size={14} className="text-white/70" aria-label="Прочитано" />;
    case 'delivered':
      return <CheckCheck size={14} className="text-white/50" aria-label="Доставлено" />;
    case 'sent':
      return <Check size={14} className="text-white/50" aria-label="Отправлено" />;
    case 'sending':
      return (
        <span 
          className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin"
          aria-label="Отправка..."
        />
      );
    default:
      return null;
  }
}

/**
 * Компонент индикатора набора текста
 */
export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-gradient-to-br from-teal-50 to-lime-50 border border-teal-200 rounded-2xl rounded-bl-sm px-4 py-2">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-teal-600" />
          <span className="text-xs text-teal-600">{name || 'AI-ассистент'} печатает</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Компонент разделителя даты
 */
export function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
        {date}
      </div>
    </div>
  );
}
