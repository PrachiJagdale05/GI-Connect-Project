// index.js (CommonJS - safe for Cloud Run)
const express = require("express");
const cors = require("cors");
const { VertexAI } = require("@google-cloud/vertexai");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const app = express();
app.use(express.json());

// ---------------- CORS ----------------
const allowedOrigins =
  (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(",")) || [
    "http://localhost:5173",
    "https://gi-connectivity.lovable.app",
    // keep a regex as string is fine but Cloud Run envs won't allow raw regex; fallback above
  ];

function allowOrigin(origin) {
  if (!origin) return false;
  return allowedOrigins.some((rule) =>
    rule instanceof RegExp ? rule.test(origin) : rule === origin
  );
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(204).send("");
  next();
});

// ---------------- Supabase ----------------
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn(
    "WARN: SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Supabase-related features will log errors but server will still start."
  );
}
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ---------------- Vertex AI ----------------
const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || undefined,
  location: process.env.VERTEX_LOCATION || "us-central1",
});
const model = vertexAI.getGenerativeModel({
  model: process.env.MODEL_NAME || "gemini-1.5-flash",
});
 


// ---------------- Helpers ----------------
async function loadHistory(conversationId, limit = 10) {
  if (!conversationId) return [];
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) {
      console.error("Supabase loadHistory error:", error);
      return [];
    }
    return data.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  } catch (e) {
    console.error("loadHistory failed:", e);
    return [];
  }
}

async function ensureConversation(conversationId, userId, role) {
  if (conversationId) return conversationId;
  try {
    const { data, error } = await supabase
      .from("conversations")
      .insert([{ user_id: userId ?? null, role }])
      .select("id")
      .single();
    if (error) {
      console.error("Supabase ensureConversation error:", error);
      throw error;
    }
    return data.id;
  } catch (e) {
    console.error("ensureConversation failed:", e);
    throw e;
  }
}

async function fetchProductInfo(query) {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, price, description, stock, images, category, region, location, is_gi_approved, vendor_id"
      )
      .ilike("name", `%${query}%`)
      .limit(5);

    if (error) {
      console.error("Supabase fetchProductInfo error:", error);
      return "Error fetching products.";
    }
    if (!data || data.length === 0) return "No matching products found.";
    return data
      .map((p) => {
        const img = Array.isArray(p.images) && p.images.length ? p.images[0] : "No image available";
        return `**${p.name}**\nPrice: ₹${p.price}\nStock: ${p.stock}\nCategory: ${p.category || "N/A"}\nRegion: ${p.region || "N/A"}\nLocation: ${p.location || "N/A"}\nGI Approved: ${p.is_gi_approved ? "✅ Yes" : "❌ No"}\n\n${p.description || ""}\n\nImage: ${img}`;
      })
      .join("\n\n");
  } catch (e) {
    console.error("fetchProductInfo failed:", e);
    return "Error fetching products.";
  }
}

async function fetchOrders(userId) {
  if (!userId) return "You need to log in to view your orders.";
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_date, status, total_price")
      .eq("user_id", userId)
      .order("order_date", { ascending: false });
    if (error) {
      console.error("Supabase fetchOrders error:", error);
      return "Error fetching orders.";
    }
    if (!data || data.length === 0) return "You don’t have any orders yet.";
    return data
      .map((o) => `🛒 Order ID: ${o.id}\nDate: ${o.order_date}\nStatus: ${o.status}\nTotal: ₹${o.total_price}`)
      .join("\n\n");
  } catch (e) {
    console.error("fetchOrders failed:", e);
    return "Error fetching orders.";
  }
}

// ---------------- Routes ----------------
app.get("/", (req, res) => {
  res.send("✅ Chatbot service is running");
});

app.post("/chat", async (req, res) => {
  try {
    const { message, user_id, conversation_id, role } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    // Ensure conversation exists
    let convoId;
    try {
      convoId = await ensureConversation(conversation_id, user_id, role);
    } catch (dbErr) {
      console.error("Conversation creation failed:", dbErr);
      return res.status(500).json({ error: "Database error: conversation" });
    }

    // Load history
    let history = [];
    try {
      history = await loadHistory(convoId);
    } catch (dbErr) {
      console.error("History load failed:", dbErr);
    }

    // Call Gemini
    let result;
    try {
      result = await model.generateContent({ contents: history });
    } catch (aiErr) {
      console.error("Gemini API call failed:", aiErr);
      return res.status(500).json({ error: "AI model error" });
    }

    const aiReply = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    res.json({ reply: aiReply, conversation_id: convoId });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});


// ---------------- Start server ----------------
// Cloud Run requires the container to listen on PORT and 0.0.0.0
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Chatbot server listening on port ${PORT}`);
});

// Graceful logging for unhandled errors
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
module.exports = app;
