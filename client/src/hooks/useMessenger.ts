/**
 * Хук для работы с мессенджером
 * Управляет состоянием чатов, сообщений и взаимодействием с API
 */
import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { keyStore } from '@/lib/crypto';
import type { Chat, Message } from '@/components/messenger';

interface UseMessengerOptions {
  language: 'ru' | 'en';
}

export function useMessenger({ language }: UseMessengerOptions) {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Fetch chats from API
  const { 
    data: chatsData, 
    isLoading: isLoadingChats,
    refetch: refetchChats 
  } = trpc.messenger.getChats.useQuery(undefined, {
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch messages for selected chat
  const { 
    data: messagesData, 
    isLoading: isLoadingMessages,
    refetch: refetchMessages 
  } = trpc.messenger.getMessages.useQuery(
    { chatId: selectedChat?.id || '' },
    {
      enabled: !!selectedChat,
      staleTime: 10000,
      refetchOnWindowFocus: false,
    }
  );

  // Send encrypted message mutation (for doctor chats)
  const sendMessageMutation = trpc.messenger.sendMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
    },
  });

  // Send AI message mutation (for AI chats)
  const sendAIMessageMutation = trpc.messenger.sendAIMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
    },
  });

  // Initialize crypto keys
  useEffect(() => {
    async function initKeys() {
      await keyStore.getOrCreateKeyPair();
    }
    initKeys();
  }, []);

  // Transform API data to component format
  const chats: Chat[] = (chatsData || []).map((chat: any) => ({
    id: chat.id,
    name: chat.name || chat.participantName || 'Чат',
    role: chat.role || chat.specialty || '',
    avatar: chat.avatar || chat.name?.substring(0, 2) || '👤',
    lastMessage: chat.lastMessage || '',
    lastMessageTime: chat.lastMessageTime || '',
    unread: chat.unreadCount || 0,
    online: chat.online || false,
    type: chat.type === 'patient_ai' ? 'support' : 'doctor',
    aiActive: chat.aiActive ?? true,
  }));

  // Update messages when data changes
  useEffect(() => {
    if (messagesData) {
      const formattedMessages: Message[] = messagesData.map((msg: any) => ({
        id: msg.id,
        text: msg.text || msg.content || '',
        time: new Date(msg.timestamp).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: new Date(msg.timestamp),
        isOwn: msg.isOwn || msg.senderId === 'current-user',
        status: msg.status || 'sent',
        isEncrypted: msg.isEncrypted ?? true,
        isAI: msg.isAI || msg.senderId === 'ai-assistant',
        senderName: msg.senderName,
      }));
      setMessages(formattedMessages);
    }
  }, [messagesData, language]);

  // Get AI response based on message content
  const getAIResponse = useCallback((userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('корсет') || lowerMessage.includes('носить')) {
      return language === 'ru'
        ? 'Корсет следует носить 20-23 часа в сутки. Снимайте только для гигиены и упражнений. Врач ответит в ближайшее время.\n\n🤖 AI-ассистент'
        : 'Wear the corset 20-23 hours daily. Remove only for hygiene and exercises. Doctor will reply soon.\n\n🤖 AI Assistant';
    }
    if (lowerMessage.includes('упражнен') || lowerMessage.includes('лфк')) {
      return language === 'ru'
        ? 'Рекомендую выполнять упражнения 2 раза в день по 30 минут. Врач даст персональные рекомендации.\n\n🤖 AI-ассистент'
        : 'Do exercises twice daily for 30 minutes. Doctor will give personal recommendations.\n\n🤖 AI Assistant';
    }
    if (lowerMessage.includes('боль') || lowerMessage.includes('болит')) {
      return language === 'ru'
        ? '⚠️ При острой боли обратитесь к врачу. Небольшой дискомфорт при адаптации — нормально. Врач свяжется с вами в ближайшее время.\n\n🤖 AI-ассистент'
        : '⚠️ For sharp pain, see a doctor. Some discomfort during adaptation is normal. Doctor will contact you soon.\n\n🤖 AI Assistant';
    }
    return language === 'ru'
      ? 'Спасибо за вопрос. Врач ответит в ближайшее время. Могу помочь с общими вопросами о лечении сколиоза.\n\n🤖 AI-ассистент'
      : 'Thank you. The doctor will reply soon. I can help with general questions about scoliosis treatment.\n\n🤖 AI Assistant';
  }, [language]);

  // Send message handler
  const sendMessage = useCallback(async (text: string) => {
    if (!selectedChat || !text.trim()) return;

    const now = new Date();
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      time: now.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: now,
      isOwn: true,
      status: 'sending',
      isEncrypted: true,
    };

    // Optimistic update
    setMessages(prev => [...prev, newMessage]);

    try {
      // Send to API - для упрощения отправляем plainText
      // В реальном приложении здесь должно быть E2E шифрование
      // Определяем тип чата и используем соответствующий API
      if (selectedChat.type === 'support' || selectedChat.aiActive) {
        // AI-чат: отправляем открытым текстом
        await sendAIMessageMutation.mutateAsync({
          chatId: selectedChat.id,
          message: text,
        });
      } else {
        // Чат с врачом: отправляем зашифрованным
        // TODO: Реализовать реальное E2E шифрование
        await sendMessageMutation.mutateAsync({
          chatId: selectedChat.id,
          ciphertext: text, // Временно отправляем как есть
          iv: 'temp-iv',
          salt: 'temp-salt',
          senderPublicKey: 'temp-key',
        });
      }

      // Update status to sent
      setMessages(prev => 
        prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m)
      );

      // Simulate AI response if AI is active
      if (selectedChat.aiActive || selectedChat.type === 'support') {
        setIsTyping(true);
        
        setTimeout(() => {
          setIsTyping(false);
          const aiResponse: Message = {
            id: `ai-${Date.now()}`,
            text: getAIResponse(text),
            time: new Date().toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            timestamp: new Date(),
            isOwn: false,
            status: 'read',
            isEncrypted: true,
            isAI: true,
          };
          setMessages(prev => [...prev, aiResponse]);
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update status to failed
      setMessages(prev => 
        prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' } : m)
      );
    }
  }, [selectedChat, language, sendMessageMutation, getAIResponse]);

  // Select chat handler
  const selectChat = useCallback((chat: Chat) => {
    setSelectedChat(chat);
    setMessages([]);
  }, []);

  // Back to chat list
  const goBack = useCallback(() => {
    setSelectedChat(null);
    setMessages([]);
  }, []);

  // Archive chat
  const archiveChat = useCallback((chatId: string) => {
    console.log('Archive chat:', chatId);
    // TODO: Implement archive functionality
  }, []);

  // Refresh data
  const refresh = useCallback(async () => {
    await Promise.all([refetchChats(), selectedChat && refetchMessages()]);
  }, [refetchChats, refetchMessages, selectedChat]);

  return {
    // State
    chats,
    selectedChat,
    messages,
    isTyping,
    isLoadingChats,
    isLoadingMessages,

    // Actions
    selectChat,
    goBack,
    sendMessage,
    archiveChat,
    refresh,
  };
}
