import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { v4 as uuidv4 } from '@/lib/utils';
import { sendChatMessage } from '@/services/aiService';

export type ChatMessage = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
};

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Determine user type based on context
  const determineUserType = (text: string) => {
    const vendorKeywords = [
      'upload', 'product', 'store', 'orders', 'payments', 
      'verification', 'maker profile', 'listing', 
      'foreign key', 'vendor_id', 'UUID', 'constraint'
    ];
    const customerKeywords = [
      'buy', 'browse', 'shipping', 'returns', 
      'payment methods', 'account', 'cart', 
      'checkout', 'order tracking'
    ];
    const giKeywords = ['gi', 'geographical indication', 'what is gi'];

    const lowerText = text.toLowerCase();
    
    if (giKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'information';
    }
    if (vendorKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'vendor';
    }
    if (customerKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'customer';
    }
    return 'unknown';
  };

  // Add role-based initial welcome message
  useState(() => {
    let welcomeText = "Hello! Are you here to shop for authentic products or to manage your store on GI Connect?";
    
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
          welcomeText = "Hello! Are you here to shop for authentic products or to manage your store on GI Connect?";
      }
    }
    
    setMessages([
      {
        id: uuidv4(),
        text: welcomeText,
        sender: 'ai',
        timestamp: new Date(),
      }
    ]);
  });

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Determine user type
    const userType = determineUserType(text);

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: uuidv4(),
      text,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        prompt: text,
        userRole: user?.role || userType,
        userName: user?.id,
        context: {
          userType,
          platformInstructions: `
            Platform has two sides:
            - Vendor side: for makers/vendors uploading products
            - Customer side: for customers shopping for products
            
            Special Instructions for GI:
            - If user asks about "GI", explain that GI stands for 'Geographical Indication'
            - Emphasize that GI certifies products authentically tied to a specific region in India
            - Provide examples like Kanchipuram Sarees, Darjeeling Tea
            - Highlight how GI protects product uniqueness and heritage
            - NEVER mention "Gastrointestinal" or any unrelated meanings
            
            Current user type appears to be: ${userType}
            
            If user type is vendor, focus on:
            - Product uploads
            - Store management
            - Order handling
            - Maker profile guidance
            
            If user type is customer, focus on:
            - Product browsing
            - Cart management
            - Order tracking
            - Purchase assistance
            
            If user type is information, focus on explaining GI in detail
            
            If user type is unknown, ask clarifying questions.
          `
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }
      
      // Update user message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
        )
      );

      // Add AI response to chat
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          text: response.generatedText,
          sender: 'ai',
          timestamp: new Date(),
        }
      ]);
    } catch (error: any) {
      console.error('Error sending message to AI:', error);
      
      // Update user message status to error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
        )
      );
      
      toast.error('Failed to get a response from the AI. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const clearMessages = useCallback(() => {
    let welcomeText = "Hello! Are you here to shop for authentic products or to manage your store on GI Connect?";
    
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
          welcomeText = "Hello! Are you here to shop for authentic products or to manage your store on GI Connect?";
      }
    }
    
    setMessages([{
      id: uuidv4(),
      text: welcomeText,
      sender: 'ai',
      timestamp: new Date(),
    }]);
  }, [user?.role]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
