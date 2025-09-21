// supabase/functions/sync-to-bigquery/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const body = await req.json();

    // Service Account JSON (already set as secret)
    const serviceAccount = Deno.env.get("BIGQUERY_KEY");
    if (!serviceAccount) {
      throw new Error("BIGQUERY_KEY not set");
    }
    const creds = JSON.parse(serviceAccount);

    // JWT for BigQuery OAuth2
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/bigquery",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    function base64url(source: string | Uint8Array) {
      return btoa(String.fromCharCode(...new Uint8Array(source)))
        .replace(/=+$/, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    }

    const encoder = new TextEncoder();
    const toSign = `${base64url(encoder.encode(JSON.stringify(header)))}.${base64url(encoder.encode(JSON.stringify(claim)))}`;
    const key = await crypto.subtle.importKey(
      "pkcs8",
      str2ab(creds.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(toSign));
    const jwt = `${toSign}.${base64url(sig)}`;

    // Exchange JWT for Access Token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const { access_token } = await tokenRes.json();

    // Insert row into BigQuery
    const dataset = "";   // change
    const table = "your_table";       // change
    const bqRes = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${creds.project_id}/datasets/${dataset}/tables/${table}/insertAll`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({
          rows: [
            { json: { ...body, inserted_at: new Date().toISOString() } },
          ],
        }),
      },
    );

    const bqData = await bqRes.json();
    return new Response(JSON.stringify({ ok: true, bq: bqData }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
    });
  }
});

// Helper: Convert PEM → ArrayBuffer
function str2ab(pem: string) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}
