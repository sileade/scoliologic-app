/**
 * Компонент ввода сообщения
 */
import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (text: string) => void;
  onAttach?: () => void;
  onVoice?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ 
  onSend, 
  onAttach, 
  onVoice, 
  disabled = false,
  placeholder = 'Сообщение...'
}: MessageInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const haptic = (intensity: number = 10) => {
    if (navigator.vibrate) navigator.vibrate(intensity);
  };

  const handleSend = useCallback(() => {
    const trimmedText = text.trim();
    if (!trimmedText || disabled) return;

    haptic(25);
    onSend(trimmedText);
    setText('');
    inputRef.current?.focus();
  }, [text, disabled, onSend]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border-t border-gray-100 px-4 py-3 safe-area-bottom">
      <div className="flex items-center gap-2">
        {/* Attach button */}
        {onAttach && (
          <button
            onClick={() => {
              haptic();
              onAttach();
            }}
            className="btn-icon text-gray-400 hover:text-teal-500 transition-colors"
            aria-label="Прикрепить файл"
            disabled={disabled}
          >
            <Paperclip size={20} />
          </button>
        )}

        {/* Input field */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full px-4 py-2.5 bg-gray-100 rounded-full text-sm",
              "focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white",
              "transition-all duration-200",
              "placeholder:text-gray-400",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Введите сообщение"
          />
        </div>

        {/* Send or Voice button */}
        {text.trim() ? (
          <button
            onClick={handleSend}
            disabled={disabled}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              "bg-teal-500 text-white",
              "hover:bg-teal-600 active:scale-95",
              "transition-all duration-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Отправить сообщение"
          >
            <Send size={18} />
          </button>
        ) : onVoice ? (
          <button
            onClick={() => {
              haptic();
              onVoice();
            }}
            disabled={disabled}
            className="btn-icon text-gray-400 hover:text-teal-500 transition-colors"
            aria-label="Записать голосовое сообщение"
          >
            <Mic size={20} />
          </button>
        ) : (
          <button
            disabled
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-300"
            aria-label="Введите текст для отправки"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
