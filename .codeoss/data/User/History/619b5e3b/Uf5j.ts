// supabase/functions/sync-to-bigquery/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const body = await req.json();
    const { vendor_id, order_id, product_id, amount, status, region, timestamp } = body;

    // Load service account key from env
    const serviceAccount = Deno.env.get("BIGQUERY_KEY");
    if (!serviceAccount) throw new Error("BIGQUERY_KEY not set");

    const creds = JSON.parse(serviceAccount);

    // Get access token
    const jwtHeader = {
      alg: "RS256",
      typ: "JWT",
    };
    const jwtClaim = {
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/bigquery",
      aud: "https://oauth2.googleapis.com/token",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const encoder = new TextEncoder();
    const payload = btoa(
      JSON.stringify(jwtHeader) + "." + JSON.stringify(jwtClaim),
    );

    const key = await crypto.subtle.importKey(
      "pkcs8",
      str2ab(creds.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(payload));
    const jwt = `${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const { access_token } = await tokenRes.json();

    // Insert row into BigQuery
    const response = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/giconnect-471219/datasets/gi_connect/tables/orders/insertAll`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: [
            {
              json: {
                vendor_id,
                order_id,
                product_id,
                amount,
                status,
                region,
                created_at: timestamp,
              },
            },
          ],
        }),
      },
    );

    const result = await response.json();

    return new Response(JSON.stringify({ status: "ok", result }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

// Helper to convert string private key → ArrayBuffer
function str2ab(str: string) {
  const binary = atob(str.replace(/(-----.*-----|\n)/g, ""));
  const len = binary.length;
  const buf = new ArrayBuffer(len);
  const view = new Uint8Array(buf);
  for (let i = 0; i < len; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buf;
}
