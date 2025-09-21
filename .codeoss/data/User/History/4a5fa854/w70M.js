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

// Insert conversation record for audit / analytics
async function logConversation({ user_id, role, message, reply }) {
  try {
    // We attempt to insert message and reply as columns in conversations table.
    // If your conversations table schema doesn't include these columns you can add them,
    // or this insert will gracefully fail and we'll log.
    const payload = {
      user_id,
      role,
      message,
      reply,
    };
    const { error } = await supabase.from("conversations").insert([payload]);
    if (error) {
      // Log but don't fail the request
      console.warn("logConversation insert error (non blocking):", error.message || error);
    }
  } catch (e) {
    console.warn("logConversation failed:", e);
  }
}

// Fetch product(s) by name (partial match) - returns array
async function fetchProductByName(query) {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, description, price, stock, images, region, location, is_gi_approved, gi_status, gi_certificate_url, category"
      )
      .ilike("name", `%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("fetchProductByName failed:", e);
    return [];
  }
}

// Fetch GI / GI-approved products
async function fetchGiProducts() {
  try {
    // Some screenshots show gi_status text and an is_gi_approved boolean.
    // Query both possibilities.
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

// Fetch customer orders (keeps previous interface)
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

// Fetch vendor orders
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

    // Role-based greeting
    let roleGreeting = "";
    if (role === "customer") roleGreeting = "Hey Customer 👋, how can I help you today?";
    if (role === "vendor") roleGreeting = "Hi Vendor 👋, how can I assist with your services?";
    if (role === "admin") roleGreeting = "Hello Admin 👋, what would you like to manage today?";

    // Quick intent detection (DB-first)
    const lowerMessage = message.toLowerCase().trim();

    // 1) If user asks about orders -> return DB orders (customer/vendor)
    if (lowerMessage.includes("order") || lowerMessage.match(/\bmy orders\b|\bview my order\b/)) {
      if (role === "customer") {
        const orders = await fetchCustomerOrders(user_id);
        let reply;
        let found = false;
        if (orders.length === 0) {
          reply = "🛒 You don’t have any orders yet.";
        } else {
          found = true;
          reply = orders
            .map(
              (o) => `🛒 Order ID: ${o.id}\n• Product: ${o.product_name}\n• Qty: ${o.quantity ?? "N/A"}\n• Total: ₹${o.total_price}\n• Status: ${o.status}\n• Date: ${o.created_at}`
            )
            .join("\n\n");
        }

        // log conversation
        await logConversation({ user_id, role, message, reply });

        return res.json({
          reply,
          user_id,
          role,
          found,
          source: "database",
        });
      } else if (role === "vendor") {
        const orders = await fetchVendorOrders(user_id);
        let reply;
        let found = false;
        if (orders.length === 0) {
          reply = "📦 No recent orders for your products.";
        } else {
          found = true;
          reply = orders
            .map(
              (o) => `📦 Order ID: ${o.id}\n• Customer: ${o.customer_name}\n• Product: ${o.product_name}\n• Qty: ${o.quantity ?? "N/A"}\n• Total: ₹${o.total_price}\n• Status: ${o.status}\n• Date: ${o.created_at}`
            )
            .join("\n\n");
        }

        await logConversation({ user_id, role, message, reply });

        return res.json({
          reply,
          user_id,
          role,
          found,
          source: "database",
        });
      }
    }

    // 2) If user asks for GI tagged products
    if (lowerMessage.includes("gi") || lowerMessage.includes("gi tag") || lowerMessage.includes("gi-approved") || lowerMessage.includes("gi approved")) {
      const giProducts = await fetchGiProducts();
      let reply;
      let found = false;
      if (!giProducts || giProducts.length === 0) {
        reply = "No GI-approved products found in our catalog right now.";
      } else {
        found = true;
        reply = giProducts
          .map(
            (p) => `**${p.name}**\n• Price: ₹${p.price || "N/A"}\n• Stock: ${p.stock ?? "N/A"}\n• Region: ${p.region || p.location || "N/A"}\n• GI status: ${p.gi_status || (p.is_gi_approved ? "approved" : "N/A")}\n• Certificate: ${p.gi_certificate_url || "N/A"}\n`
          )
          .join("\n\n");
      }

      await logConversation({ user_id, role, message, reply });

      return res.json({
        reply,
        user_id,
        role,
        found,
        source: "database",
      });
    }

    // 3) Try product name lookup first (DB-first accuracy)
    // If the user typed a product name or asked "get me product names" or typed a specific product (e.g., "Chanderi saree")
    // we run a DB search
    const productSearchCandidates = await fetchProductByName(message);
    if (productSearchCandidates && productSearchCandidates.length > 0) {
      // Build a detailed response from DB
      const reply = productSearchCandidates
        .map((p) => {
          return `**${p.name}**\n- 💰 Price: ₹${p.price || "N/A"}\n- 📦 Stock: ${p.stock ?? "N/A"}\n- 🏷 Category: ${p.category || "N/A"}\n- 🌍 Region: ${p.region || p.location || "N/A"}\n- 🆔 GI Approved: ${p.gi_status || (p.is_gi_approved ? "approved" : "no")}\n- 📜 GI Certificate: ${p.gi_certificate_url || "N/A"}\n- 🖼 Image: ${safeImage(p.images)}\n\n${p.description || ""}`;
        })
        .join("\n\n---\n\n");

      await logConversation({ user_id, role, message, reply });

      return res.json({
        reply,
        user_id,
        role,
        found: true,
        source: "database",
      });
    }

    // If not matched in DB, fall through to Vertex AI (context aware)
    // Prepare inline instruction (no system role)
    const instruction = `You are GI Connect's official chatbot. The current user role is "${role}". Answer clearly and concisely. If database context is provided, prioritize it and be factual. If you are unsure, say you don't know and suggest an action (view products page, contact support).`;

    // Build contents array (only user role)
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `${instruction}\n\n${roleGreeting}\n\nUser (${role}): ${message}`,
          },
        ],
      },
    ];

    // If we had context above (none matched), context is empty here; we still call Vertex
    console.log("📤 Vertex AI request contents:", JSON.stringify(contents, null, 2));

    const result = await model.generateContent({ contents });
    console.log("✅ Vertex AI raw result:", JSON.stringify(result, null, 2));

    const aiReply = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    // Log conversation (db store)
    await logConversation({ user_id, role, message, reply: aiReply });

    return res.json({
      reply: aiReply,
      user_id,
      role,
      found: false, // not matched in DB; from AI
      source: "ai",
    });
  } catch (err) {
    console.error("🔥 Chat error full:", err);
    // Try to log the failed attempt as well (non-blocking)
    try {
      await logConversation({
        user_id: req.body?.user_id || "unknown",
        role: req.body?.role || "unknown",
        message: req.body?.message || "",
        reply: `ERROR: ${err.message || String(err)}`,
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
