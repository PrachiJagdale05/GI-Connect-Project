// supabase/functions/sync-to-bigquery/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const body = await req.json();
    const { vendor_id, order_id, product_id, amount, status, region, timestamp } = body;

    // Get service account key
    const serviceAccount = Deno.env.get("BIGQUERY_KEY");
    if (!serviceAccount) throw new Error("BIGQUERY_KEY not set");
    const creds = JSON.parse(serviceAccount);

    // Get OAuth2 token using service account
    const jwtHeader = { alg: "RS256", typ: "JWT" };
    const jwtClaim = {
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/bigquery",
      aud: "https://oauth2.googleapis.com/token",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const encoder = new TextEncoder();
    const base64Url = (obj: unknown) =>
      btoa(JSON.stringify(obj))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const unsignedJwt = `${base64Url(jwtHeader)}.${base64Url(jwtClaim)}`;

    const key = await crypto.subtle.importKey(
      "pkcs8",
      str2ab(creds.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const sig = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      encoder.encode(unsignedJwt),
    );
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const jwt = `${unsignedJwt}.${signatureB64}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) throw new Error("Failed to get access_token from Google");

    // Insert row into BigQuery
    const insertRes = await fetch(
      "https://bigquery.googleapis.com/bigquery/v2/projects/giconnect-471219/datasets/gi_connect/tables/orders/insertAll",
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
                occurred_at: timestamp, // maps to partitioned column in BigQuery
              },
            },
          ],
        }),
      },
    );

    const insertResult = await insertRes.json();

    return new Response(JSON.stringify({ ok: true, result: insertResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Utility: convert PEM private key → ArrayBuffer
function str2ab(pem: string) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buf;gi_
}
