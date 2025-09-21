// supabase/functions/analytics/index.ts
// Deno + Supabase Edge Function — writes events into BigQuery via REST API

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SCOPES = "https://www.googleapis.com/auth/bigquery";

function ensureEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} not set`);
  return v;
}

// Build signed JWT assertion for service account
async function getAccessToken(saJson: any): Promise<string> {
  // service account fields: client_email, private_key, token_uri
  const now = Math.floor(Date.now() / 1000);
  const header: Header = { alg: "RS256", typ: "JWT" };
  const payload: Payload = {
    iss: saJson.client_email,
    scope: SCOPES,
    aud: saJson.token_uri || "https://oauth2.googleapis.com/token",
    exp: getNumericDate(60 * 60), // 1 hour
    iat: now,
  };

  // create signed JWT using RS256 private key
  const jwt = await create(header, payload, saJson.private_key);

  // exchange JWT for access token
  const tokenRes = await fetch(saJson.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error("Token exchange failed: " + text);
  }
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) throw new Error("No access_token in token response");
  return tokenJson.access_token as string;
}

// Insert row(s) to BigQuery via tabledata.insertAll
async function insertIntoBigQuery(accessToken: string, projectId: string, datasetId: string, tableId: string, rows: any[]) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`;
  // Build request body per API: rows: [{ json: { ... } }]
  const body = {
    kind: "bigquery#tableDataInsertAllRequest",
    rows: rows.map((r) => ({ json: r })),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`BigQuery insert failed: ${JSON.stringify(json)}`);
  // If insertion errors present, JSON contains 'insertErrors'
  if (json.insertErrors) throw new Error("BigQuery insert errors: " + JSON.stringify(json.insertErrors));
  return json;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    // parse incoming event
    const body = await req.json();

    // basic validation
    const required = ["event_id", "event_type", "vendor_id", "occurred_at"];
    for (const r of required) {
      if (!body[r]) return new Response(JSON.stringify({ error: `${r} required` }), { status: 400 });
    }

    // normalize timestamp
    body.occurred_at = new Date(body.occurred_at).toISOString();

    // load service account JSON from env
    const keyJsonRaw = Deno.env.get("BQ_KEY_JSON");
    if (!keyJsonRaw) return new Response(JSON.stringify({ error: "server misconfigured: BQ_KEY_JSON missing" }), { status: 500 });
    const saJson = JSON.parse(keyJsonRaw);

    // get token
    const accessToken = await getAccessToken(saJson);

    // settings — replace dataset/table names if you used different ones
    const projectId = saJson.project_id; // or hardcode "giconnect-471219"
    const datasetId = "gi_analytics";
    const tableId = "raw_events";

    // insert
    await insertIntoBigQuery(accessToken, projectId, datasetId, tableId, [body]);

    return new Response(JSON.stringify({ status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("analytics error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
