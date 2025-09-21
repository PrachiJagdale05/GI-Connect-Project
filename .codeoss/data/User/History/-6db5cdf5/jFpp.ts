/*
  Edge Function: analytics
  - Normalizes service account private_key safely (handles \n, quotes, CRLF).
  - Logs safe metadata (length, prefix) but never full key.
  - Exchanges JWT → OAuth token → inserts event into BigQuery.
*/

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SCOPES = "https://www.googleapis.com/auth/bigquery";

/** Return only safe visible prefix for logs */
function safePrefix(s: string, n = 20) {
  return s ? s.slice(0, n).replace(/[^ -~]/g, "?") : "";
}

/** Robustly normalize a possibly escaped private key */
function tryNormalize(rawKey: unknown): string {
  if (rawKey == null) throw new Error("private_key is null/undefined");
  let key = typeof rawKey === "string" ? rawKey : JSON.stringify(rawKey);
  key = key.trim();

  // Strip surrounding quotes if present
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);

  // Handle escaped newlines, CRLF, double escapes
  key = key.replace(/\\\\n/g, "\\n"); // \\n → \n
  key = key.replace(/\\n/g, "\n");    // literal \n → newline
  key = key.replace(/\\r/g, "\r");
  key = key.replace(/\r\n/g, "\n");
  key = key.replace(/\r/g, "\n");

  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    key = key.replace(/\\"/g, '"').trim();
  }
  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    throw new Error("private_key normalization failed: PEM header/footer missing");
  }

  return key;
}

/** Exchanges SA JSON + key for access token */
async function getAccessToken(saJson: any): Promise<string> {
  const header: Header = { alg: "RS256", typ: "JWT" };
  const payload: Payload = {
    iss: saJson.client_email,
    scope: SCOPES,
    aud: saJson.token_uri || "https://oauth2.googleapis.com/token",
    exp: getNumericDate(60 * 60),
    iat: Math.floor(Date.now() / 1000),
  };

  const rawKey = saJson.private_key;
  console.log("getAccessToken: rawKey type:", typeof rawKey);

  let normalizedKey: string;
  try {
    normalizedKey = tryNormalize(rawKey);
  } catch (err) {
    console.error("getAccessToken: normalization error:", String(err));
    throw err;
  }

  console.log("getAccessToken: normalizedKey length:", normalizedKey.length);
  console.log("getAccessToken: normalizedKey prefix:", safePrefix(normalizedKey, 30));

  let jwt: string;
  try {
    jwt = await create(header, payload, normalizedKey);
  } catch (err) {
    console.error("JWT create error (likely invalid private key):", String(err));
    throw err;
  }

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
    console.error("Token exchange failed (safe body):", bodyText.slice(0, 500));
    throw new Error("Token exchange failed");
  }

  const tokenJson = JSON.parse(bodyText);
  if (!tokenJson.access_token) throw new Error("No access_token in token response");
  return tokenJson.access_token;
}

/** Inserts event row(s) into BigQuery */
async function insertIntoBigQuery(
  accessToken: string,
  projectId: string,
  datasetId: string,
  tableId: string,
  rows: any[],
) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`;
  const body = { kind: "bigquery#tableDataInsertAllRequest", rows: rows.map(r => ({ json: r })) };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch (_) {}

  if (!res.ok) {
    console.error("BigQuery insert failed (safe):", text.slice(0, 1000));
    throw new Error("BigQuery insert failed");
  }
  if (json.insertErrors) {
    console.error("BigQuery insertErrors:", JSON.stringify(json.insertErrors).slice(0, 1000));
    throw new Error("BigQuery insert errors");
  }
  return json;
}

// --- Main Edge Function Handler ---
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();
    const required = ["event_id", "event_type", "vendor_id", "occurred_at"];
    for (const r of required) {
      if (!body[r]) {
        return new Response(JSON.stringify({ error: `${r} required` }), { status: 400 });
      }
    }
    body.occurred_at = new Date(body.occurred_at).toISOString();

    const keyJsonRaw = Deno.env.get("BQ_KEY_JSON");
    console.log("BQ_KEY_JSON present:", !!keyJsonRaw);
    if (!keyJsonRaw) {
      return new Response(JSON.stringify({ error: "server misconfigured: BQ_KEY_JSON missing" }), { status: 500 });
    }

    let saJson: any;
    try {
      saJson = JSON.parse(keyJsonRaw);
    } catch {
      console.error("Failed to parse BQ_KEY_JSON");
      return new Response(JSON.stringify({ error: "server misconfigured: BQ_KEY_JSON invalid" }), { status: 500 });
    }

    if (!saJson.client_email) {
      return new Response(JSON.stringify({ error: "service account missing client_email" }), { status: 500 });
    }

    const accessToken = await getAccessToken(saJson);
    const projectId = saJson.project_id || "giconnect-471219";
    const datasetId = "gi_analytics";
    const tableId = "raw_events";

    await insertIntoBigQuery(accessToken, projectId, datasetId, tableId, [body]);

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analytics error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
