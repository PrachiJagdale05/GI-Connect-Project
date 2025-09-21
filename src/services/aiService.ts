
// TODO: Replace with new backend integration

export interface ChatRequest {
  prompt: string;
  userRole?: string;
  userName?: string;
  context?: {
    userType: 'vendor' | 'customer' | 'unknown' | 'information';
    platformInstructions?: string;
  };
}

export interface ChatResponse {
  generatedText: string;
  error?: string;
}

export const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const CLOUD_RUN_URL = 'https://chatbothandler-vajwjuqtaq-uc.a.run.app/chat';
  
  try {
    let conversationId = localStorage.getItem("conversation_id") || null;
    
    const response = await fetch(CLOUD_RUN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: request.prompt,
        user_id: request.userName || "anonymous",
        role: request.userRole || request.context?.userType || "guest",
        conversation_id: conversationId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Always store conversation ID if provided by the API
    if (data.conversation_id) {
      localStorage.setItem("conversation_id", data.conversation_id);
    }
    
    return {
      generatedText: data.reply,
      error: undefined
    };
  } catch (error: any) {
    console.error('Error calling chatbot function:', error);
    return {
      generatedText: '',
      error: 'Chatbot is currently unavailable, please try again later'
    };
  }
}
