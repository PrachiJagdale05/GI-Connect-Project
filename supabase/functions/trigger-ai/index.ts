import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the SERVICE_URL from environment
    const serviceUrl = Deno.env.get('SERVICE_URL');
    if (!serviceUrl) {
      console.error('SERVICE_URL environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Service URL:', serviceUrl);

    // Parse the request body
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Validate required fields
    const { product_id, image_url, product_name, prompt } = requestBody;
    
    if (!image_url || !product_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image_url, product_name' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get auth header to validate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Forwarding request to Cloud Run service...');

    // Forward the request to the Cloud Run service at /orchestrate endpoint
    const response = await fetch(`${serviceUrl}/orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader, // Forward auth header
      },
      body: JSON.stringify({
        image_url,
        product_name,
      }),
    });

    console.log('Cloud Run response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloud Run service error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'AI service temporarily unavailable',
          details: errorText 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the response from Cloud Run
    const data = await response.json();
    console.log('Cloud Run response:', JSON.stringify(data, null, 2));

    // Return the response from Cloud Run back to the frontend
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trigger-ai function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});