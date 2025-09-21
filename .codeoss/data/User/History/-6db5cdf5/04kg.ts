// supabase/functions/analytics/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { BigQuery } from "npm:@google-cloud/bigquery";

const KEY_JSON = Deno.env.get("BQ_KEY_JSON");
if (!KEY_JSON) throw new Error("BQ_KEY_JSON not set in env");

const creds = JSON.parse(KEY_JSON);
const bq = new BigQuery({ credentials: creds, projectId: creds.project_id });

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const body = await req.json();

    // basic validation
    const required = ["event_id", "event_type", "vendor_id", "occurred_at"];
    for (const r of required) {
      if (!body[r]) return new Response(JSON.stringify({ error: `${r} required` }), { status: 400 });
    }

    // ensure timestamp is parseable
    body.occurred_at = new Date(body.occurred_at).toISOString();

    await bq.dataset("gi_analytics").table("raw_events").insert([body], { ignoreUnknownValues: true });

    return new Response(JSON.stringify({ status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("insert error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
