
import React, { useRef, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import MessageBubble, { MessageType } from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  isOpen: boolean;
  vendor: {
    id: string;
    name: string;
    avatarUrl: string;
    isOnline: boolean;
  };
  messages: MessageType[];
  onSendMessage: (text: string, attachments?: Array<{ type: string; url: string; name?: string }>) => void;
  isTyping?: boolean;
}

const ChatWindow = ({
  isOpen,
  vendor,
  messages,
  onSendMessage,
  isTyping = false,
}: ChatWindowProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages.length]);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollButton(isScrolledUp);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-24 right-6 z-50 flex flex-col rounded-lg bg-background shadow-xl md:w-96 w-[calc(100%-3rem)] h-[500px] max-h-[80vh]"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center">
              <div className="relative h-10 w-10 overflow-hidden rounded-full">
                <img
                  src={vendor.avatarUrl}
                  alt={vendor.name}
                  className="h-full w-full object-cover"
                />
                <span className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                  vendor.isOnline ? "bg-vibrant-mehendi" : "bg-muted-foreground"
                )} />
              </div>
              <div className="ml-3">
                <h3 className="font-medium">{vendor.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {vendor.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Messages */}
          <div 
            className="flex-1 overflow-y-auto p-4" 
            onScroll={handleScroll}
          >
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLastMessage={index === messages.length - 1}
              />
            ))}
            
            {isTyping && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
            
            {showScrollButton && (
              <motion.button
                className="absolute bottom-20 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
              >
                <ChevronDown className="h-5 w-5" />
              </motion.button>
            )}
          </div>
          
          {/* Input */}
          <ChatInput onSendMessage={onSendMessage} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatWindow;
