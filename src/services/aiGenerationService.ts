import { supabase } from '@/integrations/supabase/client'
import { AIGenerationRequest, AIGenerationResponse } from '@/types/products'

export interface GenerationResult {
  success: boolean
  data?: AIGenerationResponse
  error?: string
}

export const generateProductData = async (request: AIGenerationRequest): Promise<GenerationResult> => {
  try {
    // Call the trigger-ai edge function which forwards to Cloud Run
    const { data, error } = await supabase.functions.invoke('trigger-ai', {
      body: {
        image_url: request.image_url,
        product_name: request.product_name,
      },
    })

    if (error) {
      console.error('AI generation function error:', error)
      return {
        success: false,
        error: error.message || 'AI generation service temporarily unavailable'
      }
    }

    return {
      success: true,
      data: data as AIGenerationResponse
    }
  } catch (error: any) {
    console.error('AI generation service error:', error)
    return {
      success: false,
      error: 'Failed to generate product data. Please try again.'
    }
  }
}

export const checkRateLimit = async (): Promise<{ canGenerate: boolean; remainingGenerations: number }> => {
  // For now, allow unlimited generations
  // In production, this would check against user's daily limit
  return {
    canGenerate: true,
    remainingGenerations: 5
  }
}