import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- CORS headers ----------
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ---------- Supabase Client ----------
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // use Service Role Key for RLS bypass
);

// ---------- Main handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const body = await req.json();
    const { startDate, endDate, vendor_id, reportType } = body;

    let analytics: any[] = [];

    if (reportType === "Orders") {
      // Query orders
      const { data, error } = await supabase
        .from("orders")
        .select("created_at, amount")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .eq("vendor_id", vendor_id);

      if (error) throw error;

      // Aggregate sales per day
      const agg: Record<string, { total_sales: number; order_count: number }> = {};
      data?.forEach((row) => {
        const day = row.created_at.split("T")[0];
        if (!agg[day]) agg[day] = { total_sales: 0, order_count: 0 };
        agg[day].total_sales += parseFloat(row.amount);
        agg[day].order_count += 1;
      });

      analytics = Object.entries(agg).map(([date, val]) => ({
        date,
        ...val,
      }));
    }

    if (reportType === "Products") {
      // Example: group products added
      const { data, error } = await supabase
        .from("products")
        .select("created_at, price")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .eq("vendor_id", vendor_id);

      if (error) throw error;

      const agg: Record<string, { product_count: number; total_value: number }> = {};
      data?.forEach((row) => {
        const day = row.created_at.split("T")[0];
        if (!agg[day]) agg[day] = { product_count: 0, total_value: 0 };
        agg[day].product_count += 1;
        agg[day].total_value += parseFloat(row.price);
      });

      analytics = Object.entries(agg).map(([date, val]) => ({
        date,
        ...val,
      }));
    }

    return new Response(
      JSON.stringify({ status: "ok", analytics }),
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

