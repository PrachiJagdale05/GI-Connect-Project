// supabase/functions/sync-to-bigquery/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const body = await req.json();

    // load BigQuery key from secrets
    const bqKey = Deno.env.get("BIGQUERY_KEY");
    if (!bqKey) throw new Error("BIGQUERY_KEY not set");

    const creds = JSON.parse(bqKey);

    // send insert request to BigQuery
    const res = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${creds.project_id}/datasets/gi_connect/tables/orders/insertAll`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await getAccessToken(creds)}`,
        },
        body: JSON.stringify({
          rows: [
            {
              json: {
                vendor_id: body.vendor_id,
                order_id: body.order_id,
                product_id: body.product_id,
                amount: body.amount,
                status: body.status,
                region: body.region,
                created_at: body.created_at,
              },
            },
          ],
        }),
      }
    );

    const result = await res.json();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

// helper: get access token from service account
async function getAccessToken(creds: any) {
  const jwt = await createJWT(creds);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token;
}

// helper: create signed JWT
async function createJWT(creds: any) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = new TextEncoder();
  const toBase64 = (obj: any) =>
    btoa(String.fromCharCode(...enc.encode(JSON.stringify(obj))))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsigned = `${toBase64(header)}.${toBase64(claim)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    str2ab(atob(creds.private_key.split("-----")[2].replace(/\n/g, ""))),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned));
  return `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) bufView[i] = str.charCodeAt(i);
  return buf;
}
