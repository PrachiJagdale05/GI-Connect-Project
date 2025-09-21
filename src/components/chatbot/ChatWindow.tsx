import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatMessage from './ChatMessage';
import { ChatMessage as ChatMessageType, ChatService } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';

interface ChatWindowProps {
  isOpen: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen }) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add role-based welcome message when chat opens for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let welcomeText = 'Hello! How can I help you today?';
      
      if (user?.role) {
        switch (user.role) {
          case 'customer':
            welcomeText = 'Hey Customer 👋, how can I help you today?';
            break;
          case 'vendor':
            welcomeText = 'Hi Vendor 👋, how can I assist with your services?';
            break;
          case 'admin':
            welcomeText = 'Hello Admin 👋, what would you like to manage today?';
            break;
          default:
            welcomeText = 'Hello! How can I help you today?';
        }
      }
      
      const welcomeMessage: ChatMessageType = {
        id: 'welcome',
        text: welcomeText,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, user?.role]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await ChatService.sendMessage(inputMessage, user?.id);
      
      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] animate-scale-in">
      <div className="bg-background border border-border rounded-lg shadow-hard overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 border-b">
          <h3 className="font-semibold text-lg">Chat with us</h3>
          <p className="text-sm opacity-90">We're here to help!</p>
        </div>

        {/* Messages */}
        <ScrollArea className="h-96 p-4">
          <div className="space-y-2">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground max-w-[80%] px-4 py-2 rounded-lg shadow-soft mr-12">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-muted/20">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;