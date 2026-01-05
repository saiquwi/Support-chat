import React, { useState, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import Button from '../../components/Button/Button';
import { Chat as ChatType, Message } from './Chat';
import { useNavigate } from 'react-router-dom';

const ChatList: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  console.log('ChatList mounted');
  
  useEffect(() => {
    console.log('ChatList useEffect ran');
    return () => {
      console.log('ChatList unmounted');
    };
  }, []);

  const { 
    chats, 
    chatsLoading, 
    createSupportChat,
    errorMessage,
  } = useChat();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleCreateSupportChat = async () => {
    if (user.role !== 'CLIENT') {
      alert('Only clients can create support chats');
      return;
    }

    try {
      const chat = await createSupportChat();
      
      if (chat && chat.id) {
        navigate(`/chat/${chat.id}`);
      } else {
        alert('Failed to create chat. Chat was created but no ID returned.');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const formatTime = (timestamp: string | number | Date): string => {
    if (!timestamp) return '';
    
    let date: Date;
    
    if (typeof timestamp === 'string') {
      const num = parseInt(timestamp);
      if (!isNaN(num)) {
        date = new Date(num);
      } else {
        date = new Date(timestamp);
      }
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      date = timestamp;
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string | number | Date): string => {
    if (!timestamp) return '';
    
    let date: Date;
    
    if (typeof timestamp === 'string') {
      const num = parseInt(timestamp);
      if (!isNaN(num)) {
        date = new Date(num);
      } else {
        date = new Date(timestamp);
      }
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      date = timestamp;
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Функция для вычисления lastMessage
  const getLastMessage = (chat: ChatType): Message | null => {
    if (chat.lastMessage) return chat.lastMessage;
    
    if (chat.messages && chat.messages.length > 0) {
      // Находим последнее сообщение по времени
      const sortedMessages = [...chat.messages].sort((a: Message, b: Message) => {
        const timeA = new Date(parseInt(a.createdAt)).getTime();
        const timeB = new Date(parseInt(b.createdAt)).getTime();
        return timeB - timeA;
      });
      return sortedMessages[0];
    }
    
    return null;
  };

  // Функция для вычисления unreadCount
  const calculateUnreadCount = (chat: ChatType): number => {
    if (chat.unreadCount !== undefined && chat.unreadCount !== null) {
      return chat.unreadCount; // ← Это должно обновляться через подписку!
    }
    
    return chat.messages.filter((msg: Message) => {
      return msg.status === 'SENT' && msg.sender.id !== user.id;
    }).length;
  };

  // Вычисляем общее количество непрочитанных сообщений
  const totalUnreadCount = chats.reduce((total: number, chat: ChatType) => {
    return total + calculateUnreadCount(chat);
  }, 0);

  // Фильтруем и сортируем чаты
  const filteredAndSortedChats = [...chats]
    .filter((chat: ChatType) => {
      if (filter === 'unread') {
        return calculateUnreadCount(chat) > 0;
      }
      return true;
    })
    .sort((a: ChatType, b: ChatType) => {
      // Сначала непрочитанные
      const aUnread = calculateUnreadCount(a);
      const bUnread = calculateUnreadCount(b);
      
      if (aUnread > 0 && bUnread === 0) return -1;
      if (aUnread === 0 && bUnread > 0) return 1;
      
      // Затем по времени обновления (новые сверху)
      try {
        const timeA = new Date(parseInt(a.updatedAt)).getTime();
        const timeB = new Date(parseInt(b.updatedAt)).getTime();
        return timeB - timeA;
      } catch {
        return 0;
      }
    });

  if (chatsLoading) {
    return (
      <div className="loading-chats">
        <p>Loading chats...</p>
      </div>
    );
  }

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All {totalUnreadCount > 0 && `(${totalUnreadCount})`}
          </button>
          <button 
            className={filter === 'unread' ? 'active' : ''}
            onClick={() => setFilter('unread')}
          >
            Unread {totalUnreadCount > 0 && `(${totalUnreadCount})`}
          </button>
        </div>
        
        <div className="header-row">
          <h3>My Chats</h3>
          {user.role === 'CLIENT' && (
            <Button
              label="New Support Chat"
              onClick={handleCreateSupportChat}
              skin="primary"
              size="small"
            />
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="chats">
        {filteredAndSortedChats.length === 0 ? (
          <div className="no-chats">
            <p>{filter === 'unread' ? 'No unread chats' : 'No active chats'}</p>
            {user.role === 'CLIENT' && filter === 'all' && (
              <Button
                label="Start your first support chat"
                onClick={handleCreateSupportChat}
                size="small"
                skin="primary"
              />
            )}
          </div>
        ) : (
          filteredAndSortedChats.map((chat: ChatType) => {
            const otherParticipants = chat.participants?.filter(p => p.id !== user.id) || [];
            const chatTitle = chat.title || otherParticipants.map(p => p.username).join(', ');
            const lastMessage = getLastMessage(chat);
            const currentPath = window.location.pathname;
            const isActive = currentPath.includes(`/chat/${chat.id}`);
            const unreadCount = chat.unreadCount || 0;

            // Определяем время для отображения
            let displayTime = '';
            let displayDate = '';
            
            if (lastMessage?.createdAt) {
              displayTime = formatTime(lastMessage.createdAt);
              displayDate = formatDate(lastMessage.createdAt);
            } else if (chat.updatedAt) {
              displayDate = formatDate(chat.updatedAt);
            }

            // Определяем preview текста
            let previewText = 'No messages yet';
            if (lastMessage) {
              previewText = `${lastMessage.sender?.username || 'User'}: ${
                lastMessage.content.length > 30 
                  ? `${lastMessage.content.substring(0, 30)}...` 
                  : lastMessage.content
              }`;
            }

            return (
              <div
                key={chat.id}
                className={`chat-item ${isActive ? 'active' : ''} ${unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => {
                  navigate(`/chat/${chat.id}`);
                }}
              >
                <div className="chat-item-avatar">
                  <span className="avatar-text">
                    {chat.type === 'SUPPORT' ? 'S' : chat.type === 'DIRECT' ? 'D' : 'G'}
                  </span>
                </div>
                
                <div className="chat-item-content">
                  <div className="chat-item-header">
                    <h4>{chatTitle}</h4>
                    <span className="chat-time">
                      {displayTime || displayDate}
                    </span>
                  </div>
                  
                  <div className="chat-preview">
                    {previewText}
                  </div>
                  
                  {unreadCount > 0 && (
                    <div className="unread-badge">
                      <span>{unreadCount > 99 ? '99+' : unreadCount}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;