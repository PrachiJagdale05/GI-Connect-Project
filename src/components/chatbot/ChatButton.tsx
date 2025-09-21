import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

const ChatButton: React.FC<ChatButtonProps> = ({ isOpen, onClick }) => {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={`
        fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-medium
        transition-all duration-300 ease-out
        ${isOpen 
          ? 'bg-muted hover:bg-muted/80 text-foreground' 
          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
        }
        hover:scale-105 hover:shadow-hard
      `}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </Button>
  );
};

export default ChatButton;