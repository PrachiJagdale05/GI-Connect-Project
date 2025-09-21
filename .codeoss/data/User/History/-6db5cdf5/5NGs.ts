import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const SCOPES = "https://www.googleapis.com/auth/bigquery";

// -------- Utility: Normalize Key --------
function tryNormalize(rawKey: unknown): string {
  if (!rawKey) throw new Error("Missing BQ_KEY_JSON");
  let key = rawKey as string;
  try {
    const decoded = atob(key);
    if (decoded.trim().startsWith("{")) return decoded;
  } catch (_) {}
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
  key = key.replace(/\\n/g, "\n");
  return key;
}

// -------- Utility: Get Access Token --------
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
  if (!data.access_token) throw new Error("Failed to fetch access token");
  return data.access_token;
}

// -------- Utility: Run Query --------
async function runQuery(projectId: string, accessToken: string, query: string) {
  const resp = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, useLegacySql: false }),
    },
  );
  const result = await resp.json();

  const rows: any[] = [];
  if (result.rows && result.schema) {
    const fields = result.schema.fields.map((f: any) => f.name);
    for (const row of result.rows) {
      const obj: any = {};
      row.f.forEach((val: any, i: number) => {
        obj[fields[i]] = val.v;
      });
      rows.push(obj);
    }
  }
  return rows;
}

// -------- Main Handler --------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const rawKey = Deno.env.get("BQ_KEY_JSON");
    const normKey = tryNormalize(rawKey);
    const accessToken = await getAccessToken(normKey);
    const projectId = JSON.parse(normKey).project_id;

    const body = await req.json();
    const { startDate, endDate, vendor_id } = body;

    const dataset = "gi_connect";
    const ordersTable = "orders";

    // 1. Sales Summary
    const salesSummaryQ = `
      SELECT
        DATE(created_at) as date,
        SUM(total_price) as total_sales,
        COUNT(*) as order_count
      FROM \`${projectId}.${dataset}.${ordersTable}\`
      WHERE vendor_id = "${vendor_id}"
      AND created_at BETWEEN TIMESTAMP("${startDate}") AND TIMESTAMP("${endDate}")
      GROUP BY date
      ORDER BY date ASC
    `;

    // 2. Top Products
    const topProductsQ = `
      SELECT
        product_name,
        SUM(quantity) as total_sold,
        SUM(total_price) as revenue
      FROM \`${projectId}.${dataset}.${ordersTable}\`
      WHERE vendor_id = "${vendor_id}"
      AND created_at BETWEEN TIMESTAMP("${startDate}") AND TIMESTAMP("${endDate}")
      GROUP BY product_name
      ORDER BY revenue DESC
      LIMIT 5
    `;

    // 3. Order Status Breakdown
    const orderStatusQ = `
      SELECT
        status,
        COUNT(*) as count
      FROM \`${projectId}.${dataset}.${ordersTable}\`
      WHERE vendor_id = "${vendor_id}"
      AND created_at BETWEEN TIMESTAMP("${startDate}") AND TIMESTAMP("${endDate}")
      GROUP BY status
    `;

    // 4. Regional Sales
    const regionalSalesQ = `
      SELECT
        region,
        SUM(total_price) as revenue
      FROM \`${projectId}.${dataset}.${ordersTable}\`
      WHERE vendor_id = "${vendor_id}"
      AND created_at BETWEEN TIMESTAMP("${startDate}") AND TIMESTAMP("${endDate}")
      GROUP BY region
      ORDER BY revenue DESC
    `;

    // Run all queries in parallel
    const [salesSummary, topProducts, orderStatus, regionalSales] =
      await Promise.all([
        runQuery(projectId, accessToken, salesSummaryQ),
        runQuery(projectId, accessToken, topProductsQ),
        runQuery(projectId, accessToken, orderStatusQ),
        runQuery(projectId, accessToken, regionalSalesQ),
      ]);

    return new Response(
      JSON.stringify({
        status: "ok",
        sales_summary: salesSummary,
        top_products: topProducts,
        order_status_breakdown: orderStatus,
        regional_sales: regionalSales,
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
