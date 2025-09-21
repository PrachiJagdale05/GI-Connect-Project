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
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ---------------- Vertex AI ----------------
const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.VERTEX_LOCATION || "us-central1",
});

// ✅ Gemini 2.5 Flash Lite
const model = vertexAI.getGenerativeModel({
  model: process.env.MODEL_NAME || "publishers/google/models/gemini-2.5-flash-lite",
});

// ---------------- Helpers ----------------
// Get user role from Supabase profiles
async function getUserRole(user_id) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user_id)
      .single();

    if (error) {
      console.error("Supabase role fetch error:", error.message);
      return "customer"; // fallback
    }
    return data?.role || "customer";
  } catch (e) {
    console.error("Role fetch exception:", e);
    return "customer";
  }
}

// Role-specific greeting
function roleGreeting(role) {
  switch (role) {
    case "admin":
      return "Hello Admin 👋, what would you like to manage today?";
    case "vendor":
      return "Hi Vendor 👋, how can I assist you with your services today?";
    default:
      return "Hey Customer 👋, how can I help you today?";
  }
}

// ---------------- Routes ----------------
app.get("/", (req, res) => {
  res.send("✅ GI Connect Chatbot backend is running.");
});

app.post("/chat", async (req, res) => {
  try {
    console.log("📥 Incoming /chat request body:", JSON.stringify(req.body, null, 2));

    const { message, user_id } = req.body;
    if (!message || !user_id) {
      return res.status(400).json({ error: "message and user_id are required" });
    }

    // 1. Fetch role
    const role = await getUserRole(user_id);

    // 2. Greeting
    const greeting = roleGreeting(role);

    // 3. Role-based context
    const roleContext = `
      You are GI-Connect's role-aware chatbot.
      Role: ${role}.
      Rules:
      - Customer: answer about orders, account info, support only.
      - Admin: answer about user management, analytics, system stats.
      - Vendor: answer about listings, payments, inventory only.
      - Never reveal other roles' data.
      Context: GI-Connect platform only.
    `;

    // 4. Call Gemini
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${roleContext}\n\n${greeting}\n\nUser says: ${message}`,
            },
          ],
        },
      ],
    });

    const reply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm sorry, I couldn't generate a response.";

    // 5. Respond
    return res.json({
      success: true,
      reply,
      role,
      user_id,
    });
  } catch (err) {
    console.error("🔥 Chat error:", err);
    return res.status(200).json({
      success: false,
      reply: "Something went wrong while processing your request.",
      details: err.message,
    });
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
