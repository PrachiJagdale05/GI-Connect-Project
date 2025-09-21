import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SCOPES = "https://www.googleapis.com/auth/bigquery";

function safePrefix(s: string, n = 20) {
  return s ? s.slice(0, n).replace(/[^ -~]/g, "?") : "";
}

function tryNormalize(rawKey: unknown): string {
  if (rawKey == null) throw new Error("private_key is null/undefined");
  let key = typeof rawKey === "string" ? rawKey : JSON.stringify(rawKey);
  key = key.trim();
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
  key = key.replace(/\\\\n/g, "\\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  key = key.replace(/\\"/g, '"').trim();
  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    throw new Error("private_key normalization failed: missing PEM header/footer");
  }
  return key;
}

async function getAccessToken(saJson: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: saJson.client_email,
    scope: SCOPES,
    aud: saJson.token_uri || "https://oauth2.googleapis.com/token",
    exp: getNumericDate(60 * 60),
    iat: Math.floor(Date.now() / 1000),
  };

  const rawKey = saJson.private_key;
  console.log("getAccessToken: rawKey type:", typeof rawKey);

  let normalizedKey;
  try {
    normalizedKey = tryNormalize(rawKey);
  } catch (e) {
    throw new Error("Private key normalization failed: " + String(e));
  }

  console.log("getAccessToken: normalizedKey length:", normalizedKey.length);
  console.log("getAccessToken: normalizedKey prefix:", safePrefix(normalizedKey, 30));

  let jwt: string;
  try {
    jwt = await create(header, payload, normalizedKey);
  } catch (e) {
    console.error("JWT creation failed:", String(e));
    throw new Error("JWT creation failed: " + String(e));
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
  if (!tokenRes.ok) throw new Error("Token exchange failed: " + bodyText);
  const tokenJson = JSON.parse(bodyText);
  if (!tokenJson.access_token) throw new Error("No access_token in token response");
  return tokenJson.access_token;
}

async function insertIntoBigQuery(accessToken: string, projectId: string, datasetId: string, tableId: string, rows: any[]) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`;
  const body = { kind: "bigquery#tableDataInsertAllRequest", rows: rows.map((r) => ({ json: r })) };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    console.error("BigQuery response not valid JSON");
  }
  if (!res.ok) throw new Error("BigQuery insert failed: " + text.slice(0, 500));
  if ((json as any).insertErrors) throw new Error("BigQuery insert errors: " + JSON.stringify((json as any).insertErrors));
  return json;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error("Invalid JSON body: " + String(e));
    }

    const required = ["event_id", "event_type", "vendor_id", "occurred_at"];
    for (const r of required) {
      if (!body[r]) return new Response(JSON.stringify({ error: `${r} required` }), { status: 400 });
    }

    body.occurred_at = new Date(body.occurred_at).toISOString();

    const keyJsonRaw = Deno.env.get("BQ_KEY_JSON");
    if (!keyJsonRaw) throw new Error("server misconfigured: BQ_KEY_JSON missing");

    let saJson;
    try {
      saJson = JSON.parse(keyJsonRaw);
    } catch (e) {
      throw new Error("server misconfigured: BQ_KEY_JSON invalid");
    }

    if (!saJson.client_email) throw new Error("service account missing client_email");

    const accessToken = await getAccessToken(saJson);
    const projectId = saJson.project_id || "giconnect-471219";
    await insertIntoBigQuery(accessToken, projectId, "gi_analytics", "raw_events", [body]);

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analytics error (safe):", String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
