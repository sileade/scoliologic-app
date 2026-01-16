/**
 * Компонент пузырька сообщения
 * Поддерживает compact режим для более компактного отображения
 */
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Sparkles, Shield } from 'lucide-react';

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
  /** Компактный режим с меньшими отступами */
  compact?: boolean;
}

export function MessageBubble({ 
  message, 
  showSenderName = false,
  compact = false 
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex",
        compact ? "mb-1.5" : "mb-2",
        message.isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl relative",
          compact ? "px-3 py-2" : "px-4 py-2",
          message.isOwn
            ? "bg-teal-500 text-white rounded-br-md"
            : message.isAI
              ? "bg-teal-50 border border-teal-100 rounded-bl-md"
              : "bg-white border border-gray-100 rounded-bl-md shadow-sm"
        )}
      >
        {/* AI indicator - компактный */}
        {message.isAI && (
          <div className="flex items-center gap-1 text-[10px] text-teal-600 mb-0.5">
            <Sparkles size={10} />
            <span>AI</span>
          </div>
        )}

        {/* Sender name for group chats */}
        {showSenderName && message.senderName && !message.isOwn && !message.isAI && (
          <p className={cn(
            "font-medium text-teal-600",
            compact ? "text-[10px] mb-0.5" : "text-xs mb-1"
          )}>
            {message.senderName}
          </p>
        )}

        {/* Message text */}
        <p className={cn(
          "whitespace-pre-wrap break-words",
          compact ? "text-[13px] leading-snug" : "text-sm",
          message.isOwn ? "text-white" : "text-gray-800"
        )}>
          {message.text}
        </p>

        {/* Footer: time, encryption, status */}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-0.5",
          message.isOwn ? "text-white/60" : "text-gray-400"
        )}>
          {message.isEncrypted && (
            <Shield size={8} aria-label="Зашифровано" />
          )}
          <span className={compact ? "text-[9px]" : "text-[10px]"}>{message.time}</span>
          <MessageStatus status={message.status} isOwn={message.isOwn} compact={compact} />
        </div>
      </div>
    </div>
  );
}

function MessageStatus({ 
  status, 
  isOwn,
  compact 
}: { 
  status: Message['status']; 
  isOwn: boolean;
  compact?: boolean;
}) {
  if (!isOwn) return null;

  const size = compact ? 12 : 14;

  switch (status) {
    case 'read':
      return <CheckCheck size={size} className="text-white/70" aria-label="Прочитано" />;
    case 'delivered':
      return <CheckCheck size={size} className="text-white/50" aria-label="Доставлено" />;
    case 'sent':
      return <Check size={size} className="text-white/50" aria-label="Отправлено" />;
    case 'sending':
      return (
        <span 
          className={cn(
            "border-2 border-white/50 border-t-transparent rounded-full animate-spin",
            compact ? "w-2.5 h-2.5" : "w-3 h-3"
          )}
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
export function TypingIndicator({ 
  name,
  compact = false 
}: { 
  name?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex justify-start", compact ? "mb-1.5" : "mb-2")}>
      <div className={cn(
        "bg-teal-50 border border-teal-100 rounded-2xl rounded-bl-md",
        compact ? "px-3 py-1.5" : "px-4 py-2"
      )}>
        <div className="flex items-center gap-2">
          <Sparkles size={compact ? 10 : 14} className="text-teal-600" />
          <span className={cn("text-teal-600", compact ? "text-[10px]" : "text-xs")}>
            {name || 'AI'} печатает
          </span>
          <div className="flex gap-0.5">
            <span className="w-1 h-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
    <div className="flex items-center justify-center my-3">
      <div className="bg-gray-100 text-gray-500 text-[10px] px-2.5 py-1 rounded-full">
        {date}
      </div>
    </div>
  );
}
