
import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
}

const ChatButton = ({ isOpen, onClick, unreadCount = 0 }: ChatButtonProps) => {
  return (
    <motion.button
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full shadow-lg w-14 h-14",
        isOpen ? "bg-muted hover:bg-muted/80" : "bg-primary hover:bg-primary/90"
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label={isOpen ? "Close chat" : "Open chat"}
    >
      {isOpen ? (
        <X className="h-6 w-6 text-foreground" />
      ) : (
        <div className="relative">
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
};

export default ChatButton;
