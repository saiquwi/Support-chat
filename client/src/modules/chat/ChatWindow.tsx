import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Button from '../../components/Button/Button';
import { Message, User } from './Chat';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const ChatWindow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hasMarkedAsRead = useRef(false); // Объявляем здесь!
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  console.log('ChatWindow mounted');
  
  useEffect(() => {
    console.log('ChatWindow useEffect ran');
    return () => {
      console.log('ChatWindow unmounted');
    };
  }, []);
  
  console.log('ChatWindow - Chat ID from URL:', id);
  
  const {
    currentChat,
    messages,
    messagesLoading,
    sendMessage,
    selectChat,
    currentChatId,
    markMessagesAsRead,
    chatsLoading,
    sendingMessage,
    refetchChats,
  } = useChat();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Когда меняется чат, сбрасываем флаг
  useEffect(() => {
    hasMarkedAsRead.current = false;
  }, [currentChatId]);

  useEffect(() => {
    console.log('ChatWindow useEffect - URL id:', id, 'currentChatId:', currentChatId);
    
    if (id && id !== currentChatId) {
      console.log('Selecting chat from URL:', id);
      selectChat(id);
    }
  }, [id, currentChatId, selectChat]);

  useEffect(() => {
    // Если нет ID в URL, но есть выбранный чат, обновляем URL
    if (!id && currentChatId) {
      console.log('Updating URL with chat ID:', currentChatId);
      navigate(`/chat/${currentChatId}`, { replace: true });
    }
  }, [id, currentChatId, navigate]);

  // Основной эффект для пометки сообщений как прочитанных
  useEffect(() => {
    const markMessagesAsReadOnOpen = async () => {
      // Проверяем условия
      if (!currentChatId || 
          !messages.length || 
          messagesLoading || 
          hasMarkedAsRead.current ||
          isMarkingAsRead) {
        return;
      }
      
      console.log('ChatWindow - Checking for unread messages:', {
        currentChatId,
        messagesCount: messages.length,
        messagesLoading,
        user: user.id,
        hasMarkedAsRead: hasMarkedAsRead.current
      });
      
      // Находим непрочитанные сообщения (статус SENT и не от текущего пользователя)
      const unreadMessages = messages
        .filter((msg: Message) => {
          const isUnread = msg.status === 'SENT' && msg.sender.id !== user.id;
          return isUnread;
        })
        .map((msg: Message) => msg.id);

      console.log('Unread analysis:', {
        allMessages: messages.map((m: Message) => ({
          id: m.id,
          sender: m.sender.username,
          senderId: m.sender.id,
          status: m.status,
          isFromMe: m.sender.id === user.id,
          isUnread: m.status === 'SENT' && m.sender.id !== user.id
        })),
        unreadCount: unreadMessages.length,
        unreadIds: unreadMessages
      });

      if (unreadMessages.length > 0) {
        console.log('Auto-marking messages as read:', unreadMessages);
        hasMarkedAsRead.current = true;
        setIsMarkingAsRead(true);
        
        try {
          await markMessagesAsRead(unreadMessages);
          console.log('Successfully marked messages as read');
          
          // Принудительно обновляем список чатов чтобы убрать бейджи
          if (refetchChats) {
            setTimeout(() => {
              refetchChats();
            }, 100);
          }
        } catch (error) {
          console.error('Failed to mark messages as read:', error);
          hasMarkedAsRead.current = false; // Сбрасываем флаг при ошибке
        } finally {
          setIsMarkingAsRead(false);
        }
      } else {
        console.log('No unread messages to mark');
      }
    };

    // Запускаем с небольшой задержкой чтобы UI успел отрендериться
    const timer = setTimeout(() => {
      markMessagesAsReadOnOpen();
    }, 300);

    return () => clearTimeout(timer);
  }, [currentChatId, messages, messagesLoading, markMessagesAsRead, refetchChats, isMarkingAsRead, user.id]);

  const handleCloseChat = () => {
    navigate('/');
  };

  const handleSendMessage = (content: string) => {
    if (!currentChatId) {
      console.error('No chat selected');
      toast.error('Please select a chat first');
      return;
    }
    sendMessage(currentChatId, content);
  };

  if (!id && !currentChatId) {
    return (
      <div className="no-chat-selected">
        <h3>Select a chat to start messaging</h3>
        <p>Choose a conversation from the list or start a new one</p>
      </div>
    );
  }

  if (chatsLoading || messagesLoading) {
    return <div className="loading-chat">Loading chat...</div>;
  }

  const otherParticipants = currentChat?.participants?.filter((p: User) => p.id !== user.id) || [];
  const chatTitle = currentChat?.title || otherParticipants.map((p: User) => p.username).join(', ');

  return (
    <div className="chat-window" key={`chat-window-${id}`}>
      <div className="chat-header">
        <div className="chat-title">
          <h3>{chatTitle || 'Loading chat...'}</h3>
          <div className="participants-status">
            {otherParticipants.map((participant: User) => (
              <div key={participant.id} className="participant-status">
                <span>{participant.username}</span>
                <span className="participant-role">({participant.role.toLowerCase()})</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="chat-actions">
          <Button 
            label="Close Chat" 
            size="small" 
            skin="type2"
            onClick={handleCloseChat}
          />
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <MessageList messages={messages} currentUserId={user.id} />
        )}
      </div>

      <div className="message-input-container">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!currentChatId || sendingMessage}
        />
      </div>
    </div>
  );
};

export default ChatWindow;