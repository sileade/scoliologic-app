/**
 * Страница мессенджера
 * Рефакторинг: разделение на компоненты ChatList, ChatView, MessageBubble, MessageInput
 */
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { usePullToRefresh } from '@/lib/gestures';
import { ChatList, ChatView, type Chat, type Message } from '@/components/messenger';
import { useMessenger } from '@/hooks/useMessenger';
import { Lock, Sparkles } from 'lucide-react';

export default function Messages() {
  const { language } = useLanguage();
  const {
    chats,
    selectedChat,
    messages,
    isTyping,
    isLoadingChats,
    isLoadingMessages,
    selectChat,
    goBack,
    sendMessage,
    archiveChat,
    refresh,
  } = useMessenger({ language });

  // Pull to refresh
  const { bind: bindPullToRefresh, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: refresh,
    threshold: 80,
  });

  // Chat view
  if (selectedChat) {
    return (
      <ChatView
        chat={selectedChat}
        messages={messages}
        isLoading={isLoadingMessages}
        isTyping={isTyping}
        onBack={goBack}
        onSendMessage={sendMessage}
      />
    );
  }

  // Chat list view
  return (
    <div className="mobile-page bg-gray-50" ref={bindPullToRefresh}>
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex justify-center py-2 transition-opacity"
          style={{ 
            opacity: Math.min(pullDistance / 80, 1),
            transform: `translateY(${Math.min(pullDistance / 2, 40)}px)` 
          }}
        >
          <div className={`w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}

      {/* Header */}
      <header className="mobile-header bg-white border-b border-gray-100">
        <h1 className="text-xl font-bold text-foreground">
          {language === 'ru' ? 'Сообщения' : 'Messages'}
        </h1>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock size={12} />
          <span>E2EE</span>
        </div>
      </header>

      {/* Content */}
      <main className="mobile-content p-4 space-y-4">
        {/* AI Assistant Banner */}
        <AIAssistantBanner language={language} />

        {/* Chat List */}
        <ChatList
          chats={chats}
          onSelectChat={selectChat}
          onArchiveChat={archiveChat}
          isLoading={isLoadingChats}
        />
      </main>

      <MobileBottomNav />
    </div>
  );
}

/**
 * Баннер AI-ассистента
 */
function AIAssistantBanner({ language }: { language: 'ru' | 'en' }) {
  return (
    <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="font-semibold mb-1">
            {language === 'ru' ? 'AI-ассистент активен' : 'AI Assistant Active'}
          </h3>
          <p className="text-sm text-white/80">
            {language === 'ru' 
              ? 'Отвечает на вопросы пока врач недоступен'
              : 'Answers questions while doctor is unavailable'}
          </p>
        </div>
      </div>
    </div>
  );
}
