
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { v4 as uuidv4 } from '@/lib/utils';
import ChatButton from './ChatButton';
import ChatWindow from './ChatWindow';
import { MessageType } from './MessageBubble';

// Mock data
const MOCK_VENDOR = {
  id: '1',
  name: 'Artisan Kumar',
  avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
  isOnline: true,
};

const INITIAL_MESSAGES: MessageType[] = [
  {
    id: '1',
    text: 'Hello! Welcome to GI Connect. How can I help you today?',
    sender: 'vendor',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: '2',
    text: 'Hi! I\'m interested in your handwoven silk sarees. Do you have the Kanchipuram variety?',
    sender: 'user',
    timestamp: new Date(Date.now() - 1000 * 60 * 58), // 58 minutes ago
    status: 'read',
  },
  {
    id: '3',
    text: 'Yes, we have authentic GI-tagged Kanchipuram silk sarees. Would you like to see some examples?',
    sender: 'vendor',
    timestamp: new Date(Date.now() - 1000 * 60 * 55), // 55 minutes ago
  },
  {
    id: '4',
    text: 'That would be great! Do you have anything in royal blue?',
    sender: 'user',
    timestamp: new Date(Date.now() - 1000 * 60 * 52), // 52 minutes ago
    status: 'read',
  },
  {
    id: '5',
    text: 'Absolutely! Here are a few options in royal blue with traditional gold zari work.',
    sender: 'vendor',
    timestamp: new Date(Date.now() - 1000 * 60 * 50), // 50 minutes ago
    attachments: [
      {
        type: 'image' as const,
        url: 'https://images.unsplash.com/photo-1610836958388-f7b8f0666c2f?q=80&w=1000',
        name: 'saree1.jpg',
      },
      {
        type: 'image' as const,
        url: 'https://images.unsplash.com/photo-1610836958857-1e7d30f3b37d?q=80&w=1000',
        name: 'saree2.jpg',
      }
    ],
  },
];

const LiveChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const { theme } = useTheme();

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const handleSendMessage = (text: string, attachments?: Array<{ type: "image" | "video" | "file"; url: string; name?: string }>) => {
    const newMessage: MessageType = {
      id: uuidv4(),
      text,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
      attachments,
    };
    
    setMessages([...messages, newMessage]);
    
    // Simulate vendor typing and response
    setTimeout(() => {
      setIsTyping(true);
    }, 1000);
    
    setTimeout(() => {
      setIsTyping(false);
      
      const responseMessage: MessageType = {
        id: uuidv4(),
        text: getAutoResponse(text),
        sender: 'vendor',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, responseMessage]);
    }, 3000 + Math.random() * 2000);
    
    // Update message status
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
        )
      );
    }, 1000);
    
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'read' } : msg
        )
      );
    }, 2000);
  };

  // Generate automatic responses based on user's message
  const getAutoResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return 'Our GI-tagged Kanchipuram silk sarees range from ₹15,000 to ₹75,000 depending on the design complexity, materials used, and zari work.';
    }
    
    if (lowerMessage.includes('discount') || lowerMessage.includes('offer')) {
      return 'We currently have a special festival offer of 10% off on all heritage collection pieces, and free shipping within India.';
    }
    
    if (lowerMessage.includes('delivery') || lowerMessage.includes('shipping')) {
      return 'We offer secure shipping across India (2-4 business days) and international shipping (7-14 business days). All products are carefully packaged to maintain their quality.';
    }
    
    if (lowerMessage.includes('material') || lowerMessage.includes('silk')) {
      return 'Our Kanchipuram sarees use pure mulberry silk and real gold zari. Each piece is handcrafted by our artisans and carries the authentic GI certification.';
    }
    
    return 'Thank you for your interest! Is there anything specific about our GI-tagged products you would like to know?';
  };
  
  // Simulate receiving a new message after some time
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        const newMessage: MessageType = {
          id: uuidv4(),
          text: "I just wanted to let you know we have new stock of Kanchipuram sarees arrived today. Would you like to see the new collection?",
          sender: 'vendor',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, newMessage]);
        setUnreadCount(prev => prev + 1);
      }
    }, 120000); // 2 minutes
    
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <>
      <ChatButton 
        isOpen={isOpen} 
        onClick={toggleChat} 
        unreadCount={unreadCount}
      />
      <ChatWindow
        isOpen={isOpen}
        vendor={MOCK_VENDOR}
        messages={messages}
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
      />
    </>
  );
};

export default LiveChat;
