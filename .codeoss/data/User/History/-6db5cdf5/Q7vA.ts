import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SCOPES = "https://www.googleapis.com/auth/bigquery";

// ---------- CORS headers ----------
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ---------- Utility: normalize key ----------
function tryNormalize(rawKey: unknown): string {
  if (!rawKey) throw new Error("Missing BQ_KEY_JSON");
  let key = rawKey as string;

  try {
    const decoded = atob(key);
    if (decoded.trim().startsWith("{")) {
      return decoded;
    }
  } catch (_) {
    // ignore
  }

  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
  key = key.replace(/\\n/g, "\n");
  return key;
}

// ---------- Utility: get access token ----------
async function getAccessToken(rawKey: string): Promise<string> {
  const keyObj = JSON.parse(rawKey);
  const now = Math.floor(Date.now() / 1000);

  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const jwtClaimSet = {
    iss: keyObj.client_email,
    scope: SCOPES,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const toBase64Url = (obj: any) =>
    btoa(String.fromCharCode(...encoder.encode(JSON.stringify(obj))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerBase64 = toBase64Url(jwtHeader);
  const claimBase64 = toBase64Url(jwtClaimSet);
  const signatureInput = `${headerBase64}.${claimBase64}`;

  const pk = keyObj.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const keyData = Uint8Array.from(atob(pk), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureInput),
  );
  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${signatureInput}.${signatureBase64}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await resp.json();
  if (!data.access_token) {
    console.error("Token fetch failed:", data);
    throw new Error("Failed to fetch access token");
  }
  return data.access_token;
}

// ---------- Main handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const rawKey = Deno.env.get("BQ_KEY_JSON");
    const normKey = tryNormalize(rawKey);
    const accessToken = await getAccessToken(normKey);

    const body = await req.json();

    const dataset = "gi_connect";
    const table = "raw_events";
    const projectId = JSON.parse(normKey).project_id;

    // ---------- Step 1: Insert into BigQuery ----------
    const insertResp = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${dataset}/tables/${table}/insertAll`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows: [{ json: body }] }),
      },
    );

    const result = await insertResp.json();
    if (result.insertErrors) {
      console.error("BigQuery insert error:", result.insertErrors);
      return new Response(JSON.stringify({ error: result.insertErrors }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    // ---------- Step 2: Run Analytics Query ----------
    // Example: aggregate sales by day
    const query = `
      SELECT
        DATE(timestamp) as date,
        SUM(CAST(amount AS FLOAT64)) as total_sales,
        COUNT(*) as order_count
      FROM \`${projectId}.${dataset}.${table}\`
      WHERE timestamp BETWEEN TIMESTAMP("${body.startDate}") AND TIMESTAMP("${body.endDate}")
      GROUP BY date
      ORDER BY date ASC
    `;

    const queryResp = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          useLegacySql: false,
        }),
      },
    );

    const queryResult = await queryResp.json();

    return new Response(
      JSON.stringify({
        status: "ok",
        inserted: body,
        analytics: queryResult,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      },
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }
});
