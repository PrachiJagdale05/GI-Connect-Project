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
// const model = vertexAI.getGenerativeModel({
//   model: process.env.MODEL_NAME || "gemini-1.5-flash",
// });
  const model = vertexAI.getGenerativeModel({
  model: process.env.MODEL_NAME || "gemini-1.5-flash-001",
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
    if (!message || !message.trim()) return res.status(400).json({ error: "message is required" });

    const convoId = await ensureConversation(conversation_id, user_id, role);
    const history = await loadHistory(convoId);

    const systemInstruction = `You are GI Connect’s official chatbot. The logged-in user role is: ${role}.`;

    let roleGreeting = "";
    if (role === "customer") roleGreeting = "Hey Customer 👋, how can I help you today?";
    if (role === "vendor") roleGreeting = "Hi Vendor 👋, how can I assist with your services?";
    if (role === "admin") roleGreeting = "Hello Admin 👋, what would you like to manage today?";

    let context = "";
    const low = message.toLowerCase();
    if (role === "customer" && low.includes("order")) {
      context = await fetchOrders(user_id);
    }
    if (["saree", "mango", "art", "dupatt", "handloom"].some((k) => low.includes(k))) {
      context = await fetchProductInfo(message);
    }

    const contents = [{ role: "user", parts: [{ text: systemInstruction }] }, ...history];
    if (roleGreeting) contents.push({ role: "user", parts: [{ text: roleGreeting }] });
    contents.push({ role: "user", parts: [{ text: message }] });
    if (context) contents.push({ role: "user", parts: [{ text: "Database context:\n" + context }] });

    // Call Vertex AI (Gemini)
    const result = await model.generateContent({ contents });
    const aiReply = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    // persist the chat
    const { error: insertErr } = await supabase.from("messages").insert([
      { conversation_id: convoId, role: "user", content: message },
      { conversation_id: convoId, role: "assistant", content: aiReply },
    ]);
    if (insertErr) console.error("Supabase insert error:", insertErr);

    return res.json({ reply: aiReply, conversation_id: convoId });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "Something went wrong" });
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
