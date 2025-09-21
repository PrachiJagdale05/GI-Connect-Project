const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the request body
    const requestBody = await req.text();
    
    console.log('Forwarding request to chatbot backend:', {
      method: req.method,
      body: requestBody
    });

    // Forward the request to the Cloud Run backend
    const response = await fetch(
      'https://chatbothandler-vajwjuqtaq-uc.a.run.app/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      }
    );

    if (!response.ok) {
      console.error('Backend service responded with error:', response.status, response.statusText);
      
      // Try to get error details from backend response
      let errorDetails = '';
      try {
        const errorText = await response.text();
        console.error('Backend error response body:', errorText);
        errorDetails = `: ${errorText}`;
      } catch (e) {
        console.error('Could not read error response body:', e);
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Backend service error: ${response.status}${errorDetails}`,
          status: response.status 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the response from the backend
    const responseData = await response.text();
    
    console.log('Backend service response:', responseData);

    // Return the exact response from the backend
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error in chatbot proxy:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});