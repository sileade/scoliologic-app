/**
 * Страница мессенджера
 * Упрощённая версия с чистым дизайном
 */
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { usePullToRefresh } from '@/lib/gestures';
import { ChatList, ChatView } from '@/components/messenger';
import { useMessenger } from '@/hooks/useMessenger';
import { Shield, Sparkles } from 'lucide-react';

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
          className="absolute top-0 left-0 right-0 flex justify-center py-2 transition-opacity z-10"
          style={{ 
            opacity: Math.min(pullDistance / 80, 1),
            transform: `translateY(${Math.min(pullDistance / 2, 40)}px)` 
          }}
        >
          <div className={`w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}

      {/* Simplified Header */}
      <header className="px-4 pt-safe-top pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            {language === 'ru' ? 'Сообщения' : 'Messages'}
          </h1>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Shield size={12} />
            <span>E2EE</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mobile-content px-4 py-4 space-y-4">
        {/* AI Assistant Card - компактный */}
        <AIAssistantCard language={language} onSelect={() => selectChat({
          id: 'ai-assistant',
          name: 'AI-ассистент',
          role: 'AI',
          avatar: '✨',
          lastMessage: language === 'ru' ? 'Задайте любой вопрос' : 'Ask any question',
          lastMessageTime: '',
          unread: 0,
          online: true,
          type: 'support',
          aiActive: true,
        })} />

        {/* Chat List */}
        <ChatList
          chats={chats.filter(c => c.type !== 'support')}
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
 * Компактная карточка AI-ассистента
 */
function AIAssistantCard({ 
  language, 
  onSelect 
}: { 
  language: 'ru' | 'en';
  onSelect: () => void;
}) {
  const haptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <button
      className="w-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-4 text-white text-left transition-all active:scale-[0.98] shadow-sm"
      onClick={() => {
        haptic();
        onSelect();
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Sparkles size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">
            {language === 'ru' ? 'AI-ассистент' : 'AI Assistant'}
          </h3>
          <p className="text-xs text-white/70 truncate">
            {language === 'ru' 
              ? 'Ответы на вопросы о лечении'
              : 'Answers about treatment'}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/60">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>{language === 'ru' ? 'онлайн' : 'online'}</span>
        </div>
      </div>
    </button>
  );
}
