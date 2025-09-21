import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SCOPES = "https://www.googleapis.com/auth/bigquery";

// ---------- CORS headers ----------
function corsHeaders() {
  return {
    // For security you can replace "*" with "https://preview--gi-connectivity.lovable.app"
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

  // Try base64 decode
  try {
    const decoded = atob(key);
    if (decoded.trim().startsWith("{")) {
      return decoded;
    }
  } catch (_) {
    // ignore
  }

  // fallback: raw JSON string
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
  // ✅ Handle preflight
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

    // Insert into BigQuery
    const insertResp = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${dataset}/tables/${table}/insertAll`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Con
