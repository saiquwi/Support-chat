import React, { useEffect, useRef } from 'react';
import { Message } from './Chat';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      console.warn('Invalid message timestamp:', timestamp);
      return '';
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (messages.length === 0) {
    return (
      <div className="no-messages">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message: Message) => {
        const isOwnMessage = message.sender.id === currentUserId;
        
        return (
          <div
            key={message.id}
            className={`message ${isOwnMessage ? 'own' : 'other'}`}
          >
            <div className="message-header">
              <span className="sender-name">
                {message.sender.username}
                {!isOwnMessage }
              </span>
              <span className="message-time">{formatTime(message.createdAt)}</span>
            </div>
            
            <div className="message-content">
              {message.content}
            </div>
            
            <div className="message-status">
              {isOwnMessage && (
                <span className={`status ${message.status?.toLowerCase() || 'sent'}`}>
                  {message.status === 'READ' ? '✓✓' : 
                   message.status === 'DELIVERED' ? '✓✓' : 
                   '✓'}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;