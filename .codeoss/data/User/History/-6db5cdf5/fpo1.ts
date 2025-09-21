/*
  Robust private_key normalization + safe debug logging.
  - Tries multiple unescape/cleanup strategies to produce a valid PEM string.
  - Logs only safe metadata (presence, length, prefix).
  - Inserts into BigQuery using service account via JWT flow.
*/
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SCOPES = "https://www.googleapis.com/auth/bigquery";

function safePrefix(s: string, n = 20) {
  return s ? (s.slice(0, n).replace(/[^ -~]/g, '?')) : '';
}

function tryNormalize(rawKey: unknown): string {
  if (rawKey == null) throw new Error("private_key is null/undefined");

  // if it is an object, try to stringify then process
  let key = typeof rawKey === "string" ? rawKey : JSON.stringify(rawKey);

  // trim surrounding whitespace
  key = key.trim();

  // If the key was stored with surrounding quotes (e.g. "\"-----BEGIN...\""), remove them
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }

  // common issues:
  // 1) escaped newlines \\n -> actual newline
  // 2) double-escaped \\\\n -> \\n -> \n (handle twice)
  // 3) Windows CRLF sequences \r\n -> \n
  // 4) literal "\n" sequences present as two characters -> replace them
  key = key.replace(/\\\\n/g, "\\n");        // \\n -> \n (one level)
  key = key.replace(/\\n/g, "\n");          // \n -> actual newline
  key = key.replace(/\\r/g, "\r");          // in case \r got escaped
  key = key.replace(/\r\n/g, "\n");         // normalize CRLF
  key = key.replace(/\r/g, "\n");

  // ensure PEM header/footer exist; if missing, try to repair (very cautious)
  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    // attempt a fallback: remove any escaped quotes leftover and re-check
    key = key.replace(/\\"/g, '"').trim();
  }

  // final check
  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    // throw with safe message (no secret leakage)
    throw new Error("private_key normalization failed: expected PEM header/footer missing");
  }

  return key;
}

async function getAccessToken(saJson: any): Promise<string> {
  const header: Header = { alg: "RS256", typ: "JWT" };
  const payload: Payload = {
    iss: saJson.client_email,
    scope: SCOPES,
    aud: saJson.token_uri || "https://oauth2.googleapis.com/token",
    exp: getNumericDate(60 * 60),
    iat: Math.floor(Date.now() / 1000),
  };

  // normalize & validate private key with several strategies
  const rawKey = saJson.private_key;
  console.log("getAccessToken: rawKey type:", typeof rawKey);
  let normalizedKey: string;
  try {
    normalizedKey = tryNormalize(rawKey);
  } catch (e) {
    console.error("getAccessToken: normalization error:", String(e));
    throw e;
  }

  // safe logs - do NOT print the key. Only length and prefix.
  console.log("getAccessToken: normalizedKey length:", normalizedKey.length);
  console.log("getAccessToken: normalizedKey prefix:", safePrefix(normalizedKey, 30));

  // create JWT assertion and exchange for access_token
  const jwt = await create(header, payload, normalizedKey);

  const tokenRes = await fetch(saJson.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const bodyText = await tokenRes.text();
  if (!tokenRes.ok) {
    console.error("Token exchange failed, response body (safe):", bodyText.slice(0, 1000));
    throw new Error("Token exchange failed: " + bodyText);
  }
  const tokenJson = JSON.parse(bodyText);
  if (!tokenJson.access_token) throw new Error("No access_token in token response");
  return tokenJson.access_token as string;
}

async function insertIntoBigQuery(accessToken: string, projectId: string, datasetId: string, tableId: string, rows: any[]) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`;
  const body = { kind: "bigquery#tableDataInsertAllRequest", rows: rows.map(r => ({ json: r })) };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch (e) { /* ignore parse */ }

  if (!res.ok) {
    console.error("BigQuery insert failed response (safe):", text.slice(0, 2000));
    throw new Error("BigQuery insert failed");
  }
  if ((json as any).insertErrors) {
    console.error("BigQuery insertErrors:", JSON.stringify((json as any).insertErrors).slice(0,2000));
    throw new Error("BigQuery insert errors");
  }
  return json;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const body = await req.json();

    const required = ["event_id", "event_type", "vendor_id", "occurred_at"];
    for (const r of required) if (!body[r]) return new Response(JSON.stringify({ error: `${r} required` }), { status: 400 });

    body.occurred_at = new Date(body.occurred_at).toISOString();

    const keyJsonRaw = Deno.env.get("BQ_KEY_JSON");
    console.log("BQ_KEY_JSON present:", !!keyJsonRaw);
    if (!keyJsonRaw) return new Response(JSON.stringify({ error: "server misconfigured: BQ_KEY_JSON missing" }), { status: 500 });
    let saJson: any;
    try { saJson = JSON.parse(keyJsonRaw); } catch(e) {
      console.error("Failed to parse BQ_KEY_JSON (not valid JSON)");
      return new Response(JSON.stringify({ error: "server misconfigured: BQ_KEY_JSON invalid" }), { status: 500 });
    }

    if (!saJson.client_email) return new Response(JSON.stringify({ error: "service account missing client_email" }), { status: 500 });

    // get oauth token
    const accessToken = await getAccessToken(saJson);

    const projectId = saJson.project_id || "giconnect-471219";
    const datasetId = "gi_analytics";
    const tableId = "raw_events";

    await insertIntoBigQuery(accessToken, projectId, datasetId, tableId, [body]);

    return new Response(JSON.stringify({ status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("analytics error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
