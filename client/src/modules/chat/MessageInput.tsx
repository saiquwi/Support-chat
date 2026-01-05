// src/modules/chat/MessageInput.tsx
import React, { useState } from 'react';
import Button from '../../components/Button/Button';
import Alert from '../../components/Alert/Alert';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled = false }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) {
      setError('Message cannot be empty');
      return;
    }

    setError('');
    onSendMessage(content);
    setContent('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="message-input">
      {error && <Alert message={error} skin="error" />}
      
      <div className="input-container">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={disabled}
          rows={3}
        />
        <Button
          label="Send"
          onClick={handleSubmit}
          disabled={disabled || !content.trim()}
          skin="primary"
          hasNextSpace
        />
      </div>
    </div>
  );
};

export default MessageInput;