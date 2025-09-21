
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type MessageType = {
  id: string;
  text: string;
  sender: 'user' | 'vendor';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  attachments?: Array<{
    type: 'image' | 'video' | 'file';
    url: string;
    name?: string;
    previewUrl?: string;
  }>;
};

interface MessageBubbleProps {
  message: MessageType;
  isLastMessage?: boolean;
}

const MessageBubble = ({ message, isLastMessage }: MessageBubbleProps) => {
  const isUser = message.sender === 'user';
  
  return (
    <motion.div
      className={cn(
        "flex w-full mb-2",
        isUser ? "justify-end" : "justify-start"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn(
        "max-w-[80%] flex flex-col",
        isUser ? "items-end" : "items-start"
      )}>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-1 overflow-hidden rounded-lg">
            {message.attachments.map((attachment, index) => (
              <div key={index} className="mb-1">
                {attachment.type === 'image' && (
                  <img 
                    src={attachment.url} 
                    alt={attachment.name || 'Attachment'} 
                    className="max-h-60 rounded-lg object-cover"
                  />
                )}
                {attachment.type === 'video' && (
                  <video 
                    src={attachment.url} 
                    controls 
                    className="max-h-60 rounded-lg object-cover"
                  />
                )}
                {attachment.type === 'file' && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-2 text-sm">
                    <span>{attachment.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className={cn(
          "px-4 py-2 rounded-2xl text-sm",
          isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none"
        )}>
          {message.text}
        </div>
        
        <div className="flex items-center mt-1 text-xs text-muted-foreground">
          <span>{format(message.timestamp, 'h:mm a')}</span>
          {isUser && message.status && isLastMessage && (
            <span className="ml-1">
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && (
                <span className="text-primary">✓✓</span>
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
