cd ~/gi-analytics

cat > supabase/functions/analytics/index.ts <<'EOF'
/*
  Fixed: normalize private_key newlines before using in djwt.create().
  supabase/functions/analytics/index.ts
*/

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SCOPES = "https://www.googleapis.com/auth/bigquery";

function normalizePrivateKey(rawKey: unknown): string {
  if (typeof rawKey !== "string") throw new Error("service account private_key is not a string");
  // replace escaped newlines with actual newlines if present
  if (rawKey.includes("\\n")) {
    return rawKey.replace(/\\n/g, "\n");
  }
  return rawKey;
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

  // normalize private key
  const normalizedKey = normalizePrivateKey(saJson.private_key);

  const jwt = await create(header, payload, normalizedKey);

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

async function insertIntoBigQuery(accessToken: string, projectId: string, datasetId: string, tableId: string, rows: any[]) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`;
  const body = { kind: "bigquery#tableDataInsertAllRequest", rows: rows.map(r => ({ json: r })) };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`BigQuery insert failed: ${text}`);
  if (json.insertErrors) throw new Error("BigQuery insert errors: " + JSON.stringify(json.insertErrors));
  return json;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const body = await req.json();

    const required = ["event_id","event_type","vendor_id","occurred_at"];
    for (const r of required) if (!body[r]) return new Response(JSON.stringify({ error: `${r} required` }), { status: 400 });

    // normalize timestamp
    body.occurred_at = new Date(body.occurred_at).toISOString();

    const keyJsonRaw = Deno.env.get("BQ_KEY_JSON");
    if (!keyJsonRaw) return new Response(JSON.stringify({ error: "server misconfigured: BQ_KEY_JSON missing" }), { status: 500 });
    const saJson = JSON.parse(keyJsonRaw);

    // ensure client_email exists
    if (!saJson.client_email) return new Response(JSON.stringify({ error: "service account missing client_email" }), { status: 500 });

    const accessToken = await getAccessToken(saJson);

    const projectId = saJson.project_id || "giconnect-471219";
    const datasetId = "gi_analytics";
    const tableId = "raw_events";

    await insertIntoBigQuery(accessToken, projectId, datasetId, tableId, [body]);

    return new Response(JSON.stringify({ status: "ok" }), { status: 200, headers: { "Content-Type":"application/json" }});
  } catch (err) {
    console.error("analytics error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type":"application/json" }});
  }
});
EOF

# deploy the fixed function
supabase functions deploy analytics --project-ref jumcsxhftlhxzmeqpuvb
