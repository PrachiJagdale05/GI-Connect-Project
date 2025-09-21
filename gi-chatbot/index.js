// index.js (Cloud Run backend, CommonJS)
const express = require("express");
const cors = require("cors");
const { VertexAI } = require("@google-cloud/vertexai");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

// ---------------- CORS ----------------
const allowedOrigins =
  (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(",")) || [
    "http://localhost:5173",
    "https://gi-connectivity.lovable.app",
  ];

function allowOrigin(origin) {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowOrigin(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(204).send("");
  next();
});

// ---------------- Supabase ----------------
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ---------------- Vertex AI ----------------
const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.VERTEX_LOCATION || "us-central1",
});

// ✅ Gemini 2.5 Flash Lite (env override supported)
const model = vertexAI.getGenerativeModel({
  model: process.env.MODEL_NAME || "publishers/google/models/gemini-2.5-flash-lite",
});

// ---------------- Helpers ----------------
function safeImage(imgs) {
  try {
    if (!imgs) return "No image available";
    if (typeof imgs === "string") {
      const parsed = JSON.parse(imgs);
      return Array.isArray(parsed) && parsed.length ? parsed[0] : "No image available";
    }
    if (Array.isArray(imgs) && imgs.length) return imgs[0];
    return "No image available";
  } catch {
    return "No image available";
  }
}

function normalizeText(s = "") {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// token-overlap dice coefficient style score
function tokenOverlapScore(a = "", b = "") {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  const intersection = [...ta].filter((x) => tb.has(x));
  if (ta.size + tb.size === 0) return 0;
  return (2 * intersection.length) / (ta.size + tb.size);
}

function matchScore(productName = "", query = "") {
  const p = normalizeText(productName);
  const q = normalizeText(query);
  if (!p || !q) return 0;
  if (p === q) return 1.0;
  if (p.includes(q) || q.includes(p)) return 0.9;
  const overlap = tokenOverlapScore(p, q);
  return overlap; // 0..1
}

// ---------------- DB helpers ----------------
async function fetchProductByNameWithScore(query) {
  try {
    // DB: first fetch candidates using ilike (fast), then compute score locally
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, description, price, stock, images, region, location, is_gi_approved, gi_status, gi_certificate_url, category, vendor_id"
      )
      .ilike("name", `%${query}%`)
      .limit(50);

    if (error) {
      console.error("fetchProductByNameWithScore supabase error:", error);
      return [];
    }

    const scored = (data || []).map((p) => {
      const score = matchScore(p.name, query);
      return { product: p, score };
    });

    // Also include any items with token overlap that ilike didn't catch (rare)
    // Filter threshold: 0.45 (adjustable)
    const THRESH = 0.45;
    return scored
      .filter((s) => s.score >= THRESH)
      .sort((a, b) => b.score - a.score)
      .map((s) => ({ ...s.product, _score: s.score }));
  } catch (e) {
    console.error("fetchProductByNameWithScore failed:", e);
    return [];
  }
}

async function fetchGiProducts() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, description, price, stock, images, region, location, is_gi_approved, gi_status, gi_certificate_url, category"
      )
      .or("is_gi_approved.eq.true,gi_status.eq.approved")
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("fetchGiProducts failed:", e);
    return [];
  }
}

async function fetchCustomerOrders(customerId) {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, product_name, product_image, quantity, unit_price, total_price, status, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("fetchCustomerOrders failed:", e);
    return [];
  }
}

async function fetchVendorOrders(vendorId) {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, product_name, product_image, quantity, total_price, status, created_at")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("fetchVendorOrders failed:", e);
    return [];
  }
}

async function countVendorProducts(vendorId) {
  try {
    // count()
    const { count, error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: false })
      .eq("vendor_id", vendorId);

    // supabase returns { count: N } when count flag used in some SDK versions; handle gracefully
    if (error) {
      // older sdk returns error for count usage; fall back to fetching limited rows
      const { data } = await supabase.from("products").select("id").eq("vendor_id", vendorId);
      return (data || []).length;
    }
    // If the SDK didn't return count, fall back
    if (typeof count === "number") return count;
    // Otherwise return 0
    return 0;
  } catch (e) {
    console.error("countVendorProducts failed:", e);
    return 0;
  }
}

async function fetchProductsByVendor(vendorId) {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, stock, images, category")
      .eq("vendor_id", vendorId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("fetchProductsByVendor failed:", e);
    return [];
  }
}

// Insert conversation row (non-blocking)
async function logConversation({ user_id, role, message, reply, source, found, confidence, match_type }) {
  try {
    const payload = {
      user_id,
      role,
      message,
      reply,
      source,
      found: found ? true : false,
      confidence: confidence ?? null,
      match_type: match_type ?? null,
    };
    const { error } = await supabase.from("conversations").insert([payload]);
    if (error) {
      // warn only — do not block
      console.warn("logConversation insert (non-blocking) error:", error.message || error);
    }
  } catch (e) {
    console.warn("logConversation failed (non-blocking):", e);
  }
}

// ---------------- Routes ----------------
app.get("/", (req, res) => {
  res.send("✅ GI Connect Chatbot backend is running.");
});

app.post("/chat", async (req, res) => {
  try {
    console.log("📥 Incoming /chat request body:", JSON.stringify(req.body, null, 2));

    const { message, user_id, role } = req.body;
    if (!message || !user_id || !role)
      return res.status(400).json({ error: "message, user_id, and role are required" });

    let roleGreeting = "";
    if (role === "customer") roleGreeting = "Hey Customer 👋, how can I help you today?";
    if (role === "vendor") roleGreeting = "Hi Vendor 👋, how can I assist with your services?";
    if (role === "admin") roleGreeting = "Hello Admin 👋, what would you like to manage today?";

    const lower = normalizeText(message);

    // ---- INTENT: vendor product counts/list ----
    if (role === "vendor" && (lower.match(/\bhow many products\b/) || lower.match(/\bproducts do i have\b/) || lower.match(/\bmy products\b/))) {
      const count = await countVendorProducts(user_id);
      const productList = await fetchProductsByVendor(user_id);
      const reply =
        count === 0
          ? "You don't have any products listed yet."
          : `You have ${count} product(s). Here are your products:\n\n${productList
              .slice(0, 20)
              .map((p) => `• ${p.name} — ₹${p.price || "N/A"} — stock: ${p.stock ?? "N/A"}`)
              .join("\n")}${productList.length > 20 ? `\n\n(and ${productList.length - 20} more...)` : ""}`;

      await logConversation({ user_id, role, message, reply, source: "database", found: !!(count > 0), confidence: 0.98, match_type: "vendor_product_count" });

      return res.json({ reply, user_id, role, found: !!(count > 0), source: "database", confidence: 0.98 });
    }

    // ---- INTENT: view my orders / get orders (customer/vendor) ----
    if (lower.includes("order") || lower.match(/\bmy orders\b|\bview my order\b/)) {
      if (role === "customer") {
        const orders = await fetchCustomerOrders(user_id);
        if (!orders || orders.length === 0) {
          const reply = "🛒 You don’t have any orders yet.";
          await logConversation({ user_id, role, message, reply, source: "database", found: false, confidence: 0.95, match_type: "orders_customer" });
          return res.json({ reply, user_id, role, found: false, source: "database", confidence: 0.95 });
        }
        const reply = orders
          .map((o) => `🛒 Order ID: ${o.id}\n• Product: ${o.product_name}\n• Qty: ${o.quantity ?? "N/A"}\n• Total: ₹${o.total_price}\n• Status: ${o.status}\n• Date: ${o.created_at}`)
          .join("\n\n");
        await logConversation({ user_id, role, message, reply, source: "database", found: true, confidence: 0.98, match_type: "orders_customer" });
        return res.json({ reply, user_id, role, found: true, source: "database", confidence: 0.98 });
      } else if (role === "vendor") {
        const orders = await fetchVendorOrders(user_id);
        if (!orders || orders.length === 0) {
          const reply = "📦 No recent orders for your products.";
          await logConversation({ user_id, role, message, reply, source: "database", found: false, confidence: 0.95, match_type: "orders_vendor" });
          return res.json({ reply, user_id, role, found: false, source: "database", confidence: 0.95 });
        }
        const reply = orders
          .map((o) => `📦 Order ID: ${o.id}\n• Customer: ${o.customer_name}\n• Product: ${o.product_name}\n• Qty: ${o.quantity ?? "N/A"}\n• Total: ₹${o.total_price}\n• Status: ${o.status}\n• Date: ${o.created_at}`)
          .join("\n\n");
        await logConversation({ user_id, role, message, reply, source: "database", found: true, confidence: 0.98, match_type: "orders_vendor" });
        return res.json({ reply, user_id, role, found: true, source: "database", confidence: 0.98 });
      }
    }

    // ---- INTENT: GI products ----
    if (lower.includes("gi") || lower.includes("gi tag") || lower.includes("gi-approved") || lower.includes("gi approved") || lower.includes("gi product")) {
      const giProducts = await fetchGiProducts();
      if (!giProducts || giProducts.length === 0) {
        const reply = "No GI-approved products found in our catalog right now.";
        await logConversation({ user_id, role, message, reply, source: "database", found: false, confidence: 0.95, match_type: "gi_products" });
        return res.json({ reply, user_id, role, found: false, source: "database", confidence: 0.95 });
      }
      const reply = giProducts
        .map((p) => `**${p.name}**\n• Price: ₹${p.price || "N/A"}\n• Stock: ${p.stock ?? "N/A"}\n• Region: ${p.region || p.location || "N/A"}\n• GI status: ${p.gi_status || (p.is_gi_approved ? "approved" : "N/A")}\n• Certificate: ${p.gi_certificate_url || "N/A"}`)
        .join("\n\n");
      await logConversation({ user_id, role, message, reply, source: "database", found: true, confidence: 0.95, match_type: "gi_products" });
      return res.json({ reply, user_id, role, found: true, source: "database", confidence: 0.95 });
    }

    // ---- INTENT: product name / details (DB-first fuzzy matching) ----
    // If the query looks like a product (single phrase or contains product keywords), run product lookup
    const productCandidates = await fetchProductByNameWithScore(message);
    if (productCandidates && productCandidates.length > 0) {
      // If top candidate is high confidence, return details
      const top = productCandidates[0];
      const score = top._score ?? 0;
      // Map score -> confidence (DB hits)
      const confidence = Math.min(0.98, 0.5 + score * 0.5); // scaled
      const match_type = score >= 0.9 ? "db_exact" : score >= 0.75 ? "db_strong" : "db_partial";
      const reply = productCandidates
        .slice(0, 5)
        .map((p) => `**${p.name}**\n- Price: ₹${p.price || "N/A"}\n- Stock: ${p.stock ?? "N/A"}\n- Region: ${p.region || p.location || "N/A"}\n- GI status: ${p.gi_status || (p.is_gi_approved ? "approved" : "no")}\n- Certificate: ${p.gi_certificate_url || "N/A"}\n- Image: ${safeImage(p.images)}\n\n${p.description || ""}`)
        .join("\n\n---\n\n");

      await logConversation({ user_id, role, message, reply, source: "database", found: true, confidence, match_type });

      return res.json({ reply, user_id, role, found: true, source: "database", confidence, match_type });
    }

    // ---- FALLBACK to Vertex AI (only user role) ----
    const instruction = `You are GI Connect's official chatbot. Current user role: "${role}". When a question expects exact site data (product, order, GI status), respond only using database facts if present. If not present, say you don't know and offer a clear next step. Keep answers concise and factual.`;

    const contents = [
      {
        role: "user",
        parts: [{ text: `${instruction}\n\n${roleGreeting}\n\nUser (${role}): ${message}` }],
      },
    ];

    console.log("📤 Vertex AI request contents:", JSON.stringify(contents, null, 2));

    const result = await model.generateContent({ contents });
    console.log("✅ Vertex AI raw result:", JSON.stringify(result, null, 2));

    const aiReply = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    // log conversation (ai fallback)
    await logConversation({ user_id, role, message, reply: aiReply, source: "ai", found: false, confidence: 0.5, match_type: "ai_fallback" });

    return res.json({ reply: aiReply, user_id, role, found: false, source: "ai", confidence: 0.5 });
  } catch (err) {
    console.error("🔥 Chat error full:", err);
    // Try to log failure (non-blocking)
    try {
      await logConversation({
        user_id: req.body?.user_id || "unknown",
        role: req.body?.role || "unknown",
        message: req.body?.message || "",
        reply: `ERROR: ${err.message || String(err)}`,
        source: "error",
        found: false,
        confidence: 0,
        match_type: "error",
      });
    } catch (e) {
      console.warn("Failed to log conversation during error handling:", e);
    }
    return res.status(500).json({ error: err.message || "Something went wrong" });
  }
});

// ---------------- Start server ----------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Chatbot server listening on port ${PORT}`);
});

process.on("unhandledRejection", (reason) => console.error("Unhandled Rejection:", reason));
process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err));

module.exports = app;
