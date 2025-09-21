
import React, { useState } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import ChatButton from '@/components/chat/ChatButton';
import ChatWindow from '@/components/chat/ChatWindow';
import { MessageType } from '@/components/chat/MessageBubble';

const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { messages, isLoading, sendMessage } = useAIChat();
  
  // Convert our messages to the format expected by ChatWindow
  const convertedMessages: MessageType[] = messages.map(msg => {
    let mappedStatus: 'sent' | 'delivered' | 'read' | undefined;
    
    if (msg.status === 'error') {
      mappedStatus = 'sent';
    } else if (msg.status === 'sending') {
      mappedStatus = 'sent';
    } else if (msg.status === 'sent') {
      mappedStatus = 'sent';
    } else {
      mappedStatus = undefined;
    }
    
    return {
      id: msg.id,
      text: msg.text,
      sender: msg.sender === 'user' ? 'user' : 'vendor',
      timestamp: msg.timestamp,
      status: mappedStatus,
    };
  });

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const handleSendMessage = (text: string) => {
    sendMessage(text);
  };

  // AI assistant profile with required avatarUrl property
  const aiAssistant = {
    id: 'ai-assistant',
    name: 'GI Connect Assistant',
    avatarUrl: 'https://via.placeholder.com/40',  // Added default avatar URL
    isOnline: true,
  };

  return (
    <>
      <ChatButton 
        isOpen={isOpen} 
        onClick={toggleChat} 
        unreadCount={unreadCount}
      />
      <ChatWindow
        isOpen={isOpen}
        vendor={aiAssistant}
        messages={convertedMessages}
        onSendMessage={handleSendMessage}
        isTyping={isLoading}
      />
    </>
  );
};

export default AIChat;
