import { useState, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { toast } from 'react-toastify';
import {
  GET_MY_CHATS,
  GET_CHAT,
  GET_CHAT_MESSAGES,
  SEND_MESSAGE,
  MARK_AS_READ,
  CREATE_SUPPORT_CHAT,
  NEW_MESSAGE_SUBSCRIPTION,
  MESSAGE_STATUS_CHANGED_SUBSCRIPTION,
  CHAT_CREATED_SUBSCRIPTION,
} from '../graphql/operations';

export const useChat = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Queries - УБИРАЕМ onError из useQuery
  const { 
    data: chatsData, 
    loading: chatsLoading, 
    subscribeToMore: subscribeToChats,
    refetch: refetchChats,
    error: chatsError // Добавляем получение ошибки
  } = useQuery(GET_MY_CHATS, {
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      setErrorMessage(`Failed to load chats: ${chatsError.message}`);
    }
  }, [chatsError]);

  const { 
    data: chatData, 
    loading: chatLoading, 
    subscribeToMore: subscribeToChat,
    refetch: refetchChat,
    error: chatError
  } = useQuery(GET_CHAT, {
    variables: { id: currentChatId },
    skip: !currentChatId,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (chatError) {
      console.error('Error fetching chat:', chatError);
      setErrorMessage(`Failed to load chat: ${chatError.message}`);
    }
  }, [chatError]);

  const { 
    data: messagesData, 
    loading: messagesLoading,
    refetch: refetchMessages,
    error: messagesError
  } = useQuery(GET_CHAT_MESSAGES, {
    variables: { 
      chatId: currentChatId, 
      limit: 50.0  // Явно указываем как float
    },
    skip: !currentChatId,
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      setErrorMessage(`Failed to load messages: ${messagesError.message}`);
    }
  }, [messagesError]);

  useEffect(() => {
    console.log('Messages data changed:', {
      hasData: !!messagesData,
      messagesCount: messagesData?.chatMessages?.length || 0,
      currentChatId,
      messagesLoading,
      messagesError
    });
    
    if (messagesError) {
      console.error('Detailed messages error:', {
        message: messagesError.message,
        graphQLErrors: messagesError.graphQLErrors,
        networkError: messagesError.networkError
      });
    }
  }, [messagesData, messagesError, currentChatId, messagesLoading]);

  // Mutations
  const [sendMessageMutation, { loading: sendingMessage }] = useMutation(SEND_MESSAGE, {
    onError: (error) => {
      console.error('Send message error:', error);
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const [markAsReadMutation, { loading: markingAsRead }] = useMutation(MARK_AS_READ, {
    onError: (error) => {
      console.error('Mark as read error:', error);
    },
  });

  const [createSupportChatMutation, { loading: creatingChat }] = useMutation(CREATE_SUPPORT_CHAT, {
    onError: (error) => {
      console.error('Create chat error:', error);
      toast.error(`Failed to create chat: ${error.message}`);
    },
  });

  // Замените MESSAGE_STATUS_CHANGED_SUBSCRIPTION:
  useSubscription(MESSAGE_STATUS_CHANGED_SUBSCRIPTION, {
    variables: { chatId: currentChatId },
    skip: !currentChatId,
    onData: ({ data, client }) => {
      if (data.data?.messageStatusChanged) {
        const statusUpdate = data.data.messageStatusChanged;
        console.log('Message status updated:', statusUpdate);
        
        // ✅ Обновляем кэш сообщений
        updateMessageStatusInCache(client, currentChatId!, statusUpdate);
      }
    },
    onError: (error) => {
      console.error('Message status subscription error:', error);
    },
  });
  

  
  // Функция для обновления кэша сообщений
const updateMessagesCache = (client: any, chatId: string, newMessage: any) => {
  try {
    console.log('📝 updateMessagesCache called:', {
      chatId,
      messageId: newMessage.id,
      hasContent: !!newMessage.content
    });
    
    // 1. Обновляем GET_CHAT_MESSAGES
    const messagesData = client.readQuery({
      query: GET_CHAT_MESSAGES,
      variables: { chatId, limit: 50.0 },
    });
    
    console.log('Current messages in cache:', {
      hasData: !!messagesData,
      messagesCount: messagesData?.chatMessages?.length || 0,
      existingMessageIds: messagesData?.chatMessages?.map((m: any) => m.id) || []
    });
    
    if (messagesData?.chatMessages) {
      // Проверяем, нет ли уже такого сообщения
      const messageExists = messagesData.chatMessages.some(
        (msg: any) => msg.id === newMessage.id
      );
      
      if (!messageExists) {
        console.log('✅ Adding new message to cache');
        
        // Добавляем новое сообщение
        client.writeQuery({
          query: GET_CHAT_MESSAGES,
          variables: { chatId, limit: 50.0 },
          data: {
            chatMessages: [...messagesData.chatMessages, newMessage],
          },
        });
        
        // Проверяем что записалось
        const afterWrite = client.readQuery({
          query: GET_CHAT_MESSAGES,
          variables: { chatId, limit: 50.0 },
        });
        console.log('✅ After write:', {
          messagesCount: afterWrite?.chatMessages?.length || 0
        });
      } else {
        console.log('⚠️ Message already exists in cache');
      }
    } else {
      console.log('🆕 Creating new messages cache');
      
      // Создаем безопасный объект сообщения
      const safeMessage = {
        ...newMessage,
        sender: newMessage.sender ? {
          id: newMessage.sender.id,
          username: newMessage.sender.username || '',
          role: newMessage.sender.role || 'CLIENT',
          status: newMessage.sender.status || 'ONLINE',
          __typename: 'User'
        } : null
      };

      // Создаем новый кэш
      client.writeQuery({
        query: GET_CHAT_MESSAGES,
        variables: { chatId, limit: 50.0 },
        data: {
          chatMessages: [safeMessage],
        },
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating messages cache:', error);
    // В случае ошибки обновляем через refetch
    if (refetchMessages) {
      console.log('Refetching messages...');
      refetchMessages();
    }
  }
};

  // Функция обновления статуса в кэше
  const updateMessageStatusInCache = (client: any, chatId: string, statusUpdate: any) => {
    try {
      console.log('🔄 Updating message status in cache:', {
        id: statusUpdate.id,
        status: statusUpdate.status,
        readAt: statusUpdate.readAt,
        chatId
      });
      
      // Обновляем в GET_CHAT_MESSAGES
      const messagesData = client.readQuery({
        query: GET_CHAT_MESSAGES,
        variables: { chatId, limit: 50.0 },
      });
      
      if (messagesData?.chatMessages) {
        console.log('Found messages in cache:', messagesData.chatMessages.length);
        
        const updatedMessages = messagesData.chatMessages.map((msg: any) => {
          if (msg.id === statusUpdate.id) {
            console.log('Updating message:', msg.id, 'from', msg.status, 'to', statusUpdate.status);
            return {
              ...msg, // Сохраняем все старые поля
              status: statusUpdate.status, // Обновляем статус
              readAt: statusUpdate.readAt || msg.readAt // Обновляем время прочтения
            };
          }
          return msg;
        });
        
        client.writeQuery({
          query: GET_CHAT_MESSAGES,
          variables: { chatId, limit: 50.0 },
          data: { chatMessages: updatedMessages },
        });
        
        console.log('✅ Message status updated in GET_CHAT_MESSAGES');
      }
      
      // Обновляем в GET_CHAT (если есть)
      try {
        const chatData = client.readQuery({
          query: GET_CHAT,
          variables: { id: chatId },
        });
        
        if (chatData?.chat?.messages) {
          const updatedChatMessages = chatData.chat.messages.map((msg: any) => {
            if (msg.id === statusUpdate.id) {
              return {
                ...msg,
                status: statusUpdate.status,
                readAt: statusUpdate.readAt || msg.readAt
              };
            }
            return msg;
          });
          
          client.writeQuery({
            query: GET_CHAT,
            variables: { id: chatId },
            data: {
              chat: {
                ...chatData.chat,
                messages: updatedChatMessages,
              },
            },
          });
          
          console.log('✅ Message status updated in GET_CHAT');
        }
      } catch (chatError) {
        console.log('GET_CHAT cache not found or error:', chatError);
      }
      
    } catch (error) {
      console.error('❌ Error updating message status in cache:', error);
      refetchMessages();
    }
  };

  const sendMessage = async (chatId: string, content: string) => {
    console.log('📤 Client sending message via GraphQL:', {
      chatId,
      content,
      mutationName: 'sendMessage' // Какая именно мутация вызывается?
    });
    if (!content.trim()) {
      setErrorMessage('Message cannot be empty');
      return;
    }

    try {
      const result = await sendMessageMutation({
        variables: {
          sendMessageInput: {
            chatId,
            content,
          },
        },
      });
      
      setErrorMessage('');
      console.log('Message sent successfully:', result.data?.sendMessage);
      
      // Обновляем данные
      await refetchMessages();
      await refetchChats();
      
    } catch (error: any) {
      console.error('Send message error details:', error);
      setErrorMessage(`Failed to send message: ${error.message}`);
      toast.error(`Failed to send message: ${error.message}`);
    }
  };

  const markMessagesAsRead = async (messageIds: string[]) => {
    if (!messageIds || messageIds.length === 0) {
      console.log('No message IDs provided for mark as read');
      return;
    }

    console.log('Marking messages as read:', messageIds);
    
    try {
      await markAsReadMutation({
        variables: { messageIds },
      });
      
      console.log('Messages marked as read successfully');
      
      // Обновляем сообщения после пометки как прочитанные
      await refetchMessages();
      
      // Обновляем чаты чтобы убрать бейджи
      await refetchChats();
      
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error);
      // Можно показать toast ошибки если нужно
    }
  };

  const createSupportChat = async (supportAgentId?: string) => {
    console.log('Creating support chat...');
    
    // Проверяем токен перед запросом
    const token = localStorage.getItem('token');
    if (!token) {
      const errorMsg = 'No authentication token found. Please login again.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      
      setTimeout(() => {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, 2000);
      
      return null;
    }
    
    try {
      const { data } = await createSupportChatMutation({
        variables: { supportAgentId },
        context: {
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      });
      
      if (data?.createSupportChat) {
        toast.success('Support chat created successfully');
        
        // Обновляем список чатов
        refetchChats();
        
        return data.createSupportChat;
      } else {
        throw new Error('No data returned from server');
      }
    } catch (error: any) {
      console.error('Error creating support chat:', error);
      
      // Если ошибка аутентификации
      if (error.message.includes('Unauthorized') || error.message.includes('No token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return null;
      }
      
      const errorMsg = error.message || 'Failed to create support chat';
      setErrorMessage(`Error: ${errorMsg}. Check server logs.`);
      return null;
    }
  };

  const selectChat = async (chatId: string) => {
    console.log('Selecting chat:', chatId);
    setCurrentChatId(chatId);
    
    // НЕ вызываем markAsRead здесь - будем делать в useEffect в ChatWindow
    // чтобы сообщения успели загрузиться
  };

  /*
  useSubscription(NEW_MESSAGE_SUBSCRIPTION, {
    variables: { 
      userId: JSON.parse(localStorage.getItem('user') || '{}').id 
    },
    onData: ({ data, client }) => {
      if (data.data?.newMessage) {
        const newMessage = data.data.newMessage;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isMyMessage = newMessage.sender?.id === user.id;
        
        // Исправляем sender (обязательно!)
        if (newMessage.sender) {
          newMessage.sender.role = newMessage.sender.role || 'CLIENT';
          newMessage.sender.status = newMessage.sender.status || 'ONLINE';
        }
        
        if (isMyMessage || !newMessage.chat?.id) return;
        
        const messageChatId = newMessage.chat.id;
        const isInThisChat = currentChatId === messageChatId;
        
        console.log('🔄 Processing new message:', {
          messageId: newMessage.id,
          chatId: messageChatId,
          isInThisChat,
          myRole: user.role
        });
        
        // 1. Обновляем список чатов (ВМЕСТО CHAT_UPDATED_SUBSCRIPTION)
        const chatsQueryData = client.readQuery({ query: GET_MY_CHATS });
        if (chatsQueryData?.myChats) {
          const updatedChats = chatsQueryData.myChats.map((chat: any) => {
            if (chat.id === messageChatId) {
              const increment = isInThisChat ? 0 : 1;
              const newUnreadCount = (chat.unreadCount || 0) + increment;
              
              return {
                ...chat,
                // Обновляем lastMessage
                lastMessage: newMessage,
                // Обновляем unreadCount
                unreadCount: newUnreadCount,
                // Обновляем updatedAt
                updatedAt: new Date().toISOString(),
                // Также обновляем другие поля из newMessage.chat если нужно
                title: newMessage.chat?.title || chat.title,
                type: newMessage.chat?.type || chat.type,
                __typename: 'Chat'
              };
            }
            return chat;
          });
          
          // Сортируем по дате обновления (самые новые сверху)
          updatedChats.sort((a: any, b: any) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          
          client.writeQuery({
            query: GET_MY_CHATS,
            data: { myChats: updatedChats },
          });
          
          console.log('✅ Chat list updated successfully');
        }
        
        // 2. Показываем уведомление только если не в этом чате
        //if (!isInThisChat) {
          //toast.info(`${newMessage.sender?.username || 'Someone'}: ${newMessage.content.substring(0, 50)}...`);
        //}
        
        // 3. Если этот чат открыт, добавляем сообщение в кэш
        if (isInThisChat) {
          updateMessagesCache(client, currentChatId!, newMessage);
        }
        
        // 4. Также помечаем как прочитанное если мы в этом чате
        if (isInThisChat && !isMyMessage) {
          console.log('Auto-marking as read:', newMessage.id);
          markMessagesAsRead([newMessage.id]).catch(console.error);
        }
      }
    },
    onError: (error) => {
      console.error('New message subscription error:', error);
    },
  });
  */

  useSubscription(NEW_MESSAGE_SUBSCRIPTION, {
  variables: { 
    userId: JSON.parse(localStorage.getItem('user') || '{}').id 
  },
  onData: ({ data, client }) => {
    console.log('🎯 SUBSCRIPTION FIRED!');
    if (data.data?.newMessage) {
      const newMessage = data.data.newMessage;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const isMyMessage = newMessage.sender?.id === user.id;
      
      console.log('📨 NEW_MESSAGE_SUBSCRIPTION CHECK:', {
        messageId: newMessage.id,
        chatId: newMessage.chat?.id,
        hasUnreadCount: 'unreadCount' in (newMessage.chat || {}),
        unreadCountValue: newMessage.chat?.unreadCount,
        fullMessage: newMessage // ← ВАЖНО: смотрите всё сообщение
      });
      
      // Исправляем sender (обязательно!)
      if (newMessage.sender) {
        newMessage.sender.role = newMessage.sender.role || 'CLIENT';
        newMessage.sender.status = newMessage.sender.status || 'ONLINE';
      }
      
      // Пропускаем свои сообщения или если нет chat.id
      if (isMyMessage || !newMessage.chat?.id) {
        console.log('Skipping:', isMyMessage ? 'my own message' : 'no chat id');
        return;
      }
      
      const messageChatId = newMessage.chat.id;
      const isInThisChat = currentChatId === messageChatId;
      
      console.log('🔄 Processing new message:', {
        messageId: newMessage.id,
        chatId: messageChatId,
        isInThisChat,
        myRole: user.role
      });
      
      // 1. Обновляем список чатов
      const chatsQueryData = client.readQuery({ query: GET_MY_CHATS });
      if (chatsQueryData?.myChats) {
        const updatedChats = chatsQueryData.myChats.map((chat: any) => {
          if (chat.id === messageChatId) {
            // Ключевое исправление: используем unreadCount из newMessage.chat если есть
            const serverUnreadCount = newMessage.chat?.unreadCount;
            const newUnreadCount = serverUnreadCount !== undefined 
              ? serverUnreadCount 
              : chat.unreadCount || 0;
            
            console.log('🔄 unreadCount update for chat:', {
              chatId: chat.id,
              server: serverUnreadCount,
              current: chat.unreadCount,
              result: newUnreadCount,
              messageId: newMessage.id,
              hasChatObject: !!newMessage.chat
            });
            
            return {
              ...chat,
              lastMessage: newMessage,
              unreadCount: newUnreadCount, // ← используем то что с сервера
              updatedAt: new Date().toISOString(),
              title: newMessage.chat?.title || chat.title,
              type: newMessage.chat?.type || chat.type,
              __typename: 'Chat'
            };
          }
          return chat;
        });
        
        // Сортируем по дате обновления (самые новые сверху)
        updatedChats.sort((a: any, b: any) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        client.writeQuery({
          query: GET_MY_CHATS,
          data: { myChats: updatedChats },
        });
        
        console.log('✅ Chat list updated successfully');
      }
      
      // 3. Если этот чат открыт, добавляем сообщение в кэш
      if (isInThisChat) {
        console.log('Adding message to current chat cache:', newMessage.id);
        updateMessagesCache(client, currentChatId!, newMessage);
        
        // 4. Помечаем как прочитанное если не наше сообщение
        if (!isMyMessage) {
          console.log('Auto-marking as read:', newMessage.id);
          markMessagesAsRead([newMessage.id]).catch(console.error);
        }
      }

      console.log('🔄 Triggering UI update...');
        setForceUpdate(prev => prev + 1);

      console.log('🔄 Refetching chats...');
      refetchChats();
      
    }
  },
  onError: (error) => {
    console.error('New message subscription error:', error);
  },
});

  useSubscription(CHAT_CREATED_SUBSCRIPTION, {
    variables: { 
      userId: JSON.parse(localStorage.getItem('user') || '{}').id 
    },
    onData: ({ data, client }) => {
      if (data.data?.chatCreated) {
        const newChat = data.data.chatCreated;
        console.log('🆕 New chat created subscription:', newChat);
        
        // Обновляем список чатов
        const chatsQueryData = client.readQuery({ query: GET_MY_CHATS });
        if (chatsQueryData?.myChats) {
          // Проверяем, нет ли уже такого чата
          const chatExists = chatsQueryData.myChats.some(
            (chat: any) => chat.id === newChat.id
          );
          
          if (!chatExists) {
            console.log('Adding new chat to list:', newChat.id);
            const updatedChats = [newChat, ...chatsQueryData.myChats];
            
            // Сортируем по дате
            updatedChats.sort((a: any, b: any) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            
            client.writeQuery({
              query: GET_MY_CHATS,
              data: { myChats: updatedChats },
            });
          }
        }
      }
    },
    onError: (error) => {
      console.error('Chat created subscription error:', error);
    },
  });

  // Возвращаем объект
  return {
    // Data
    chats: chatsData?.myChats || [],
    currentChat: chatData?.chat,
    messages: messagesData?.chatMessages || [],
    
    // State
    currentChatId,
    errorMessage,
    setErrorMessage,
    
    // Loading states
    chatsLoading,
    chatLoading,
    messagesLoading,
    sendingMessage,
    creatingChat,
    markingAsRead,
    
    // Actions
    sendMessage,
    markMessagesAsRead,
    createSupportChat,
    selectChat,
    
    // Refetch functions
    refetchChats,
    refetchChat,
    refetchMessages,
    
    // Subscriptions
    subscribeToChats,
    subscribeToChat,

    forceUpdate,
  };
};