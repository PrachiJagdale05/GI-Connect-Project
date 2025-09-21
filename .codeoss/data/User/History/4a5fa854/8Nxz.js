// index.js (CommonJS - Cloud Run backend)
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
const model = vertexAI.getGenerativeModel({
  model: process.env.MODEL_NAME || "gemini-2.0-flash-lite", // ✅ updated model
});

// ---------------- Helpers ----------------
// (unchanged) fetchProductInfo, fetchCustomerOrders, fetchVendorOrders...

// ---------------- Routes ----------------
app.get("/", (req, res) => {
  res.send("✅ GI Connect Chatbot backend is running.");
});

app.post("/chat", async (req, res) => {
  try {
    // ✅ DEBUG LOG: show exactly what we received
    console.log("📥 Incoming /chat request body:", req.body);

    const { message, user_id, role } = req.body;
    if (!message || !user_id || !role)
      return res.status(400).json({ error: "message, user_id, and role are required" });

    // Role-based greeting
    let roleGreeting = "";
    if (role === "customer") roleGreeting = "Hey Customer 👋, how can I help you today?";
    if (role === "vendor") roleGreeting = "Hi Vendor 👋, how can I assist with your services?";
    if (role === "admin") roleGreeting = "Hello Admin 👋, what would you like to manage today?";

    // Role-aware context fetching
    let context = "";
    const lowerMessage = message.toLowerCase();

    if (role === "customer" && lowerMessage.includes("order")) {
      context = await fetchCustomerOrders(user_id);
    } else if (role === "vendor" && lowerMessage.includes("order")) {
      context = await fetchVendorOrders(user_id);
    } else if (["saree", "mango", "art", "dupatt", "handloom"].some((k) => lowerMessage.includes(k))) {
      context = await fetchProductInfo(message);
    }

    const contents = [
      { role: "system", parts: [{ text: `You are GI Connect's official chatbot. User role: ${role}.` }] },
      { role: "user", parts: [{ text: roleGreeting }] },
      { role: "user", parts: [{ text: message }] },
    ];

    if (context) {
      contents.push({ role: "user", parts: [{ text: "Database context:\n" + context }] });
    }

    const result = await model.generateContent({ contents });
    const aiReply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      context ||
      "Sorry, I couldn't generate a response.";

    return res.json({ reply: aiReply });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "Something went wrong" });
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
