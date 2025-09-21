import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  user_id: string;
  role?: string;
  conversation_id: string | null;
}

export interface ChatResponse {
  reply: string;
  conversation_id: string;
}

export class ChatService {
  private static readonly SUPABASE_URL = 'https://jumcsxhftlhxzmeqpuvb.functions.supabase.co/chatbot-proxy-v2';
  private static readonly CONVERSATION_KEY = 'chatbot_conversation_id';

  static getConversationId(): string | null {
    return localStorage.getItem(this.CONVERSATION_KEY);
  }

  static setConversationId(conversationId: string): void {
    localStorage.setItem(this.CONVERSATION_KEY, conversationId);
  }

  static async sendMessage(message: string, userId?: string): Promise<string> {
    const conversationId = this.getConversationId();
    
    // Get user role from profiles table if user is authenticated
    let userRole = 'guest';
    if (userId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        
        userRole = profile?.role || 'guest';
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    }
    
    const requestBody: ChatRequest = {
      message,
      user_id: userId || 'anonymous',
      role: userRole,
      conversation_id: conversationId,
    };

    try {
      console.log('Sending message to chatbot:', requestBody);
      
      const response = await fetch(this.SUPABASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Chatbot response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chatbot error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const data: ChatResponse = await response.json();
      console.log('Chatbot response data:', data);
      
      // Always store the conversation ID if provided by the API
      if (data.conversation_id) {
        this.setConversationId(data.conversation_id);
      }

      return data.reply;
    } catch (error) {
      console.error('Error sending message to chatbot:', error);
      throw new Error('Sorry, I\'m having trouble connecting right now. Please try again in a moment.');
    }
  }
}