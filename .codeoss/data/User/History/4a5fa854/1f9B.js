import express from "express";
import cors from "cors";
import { VertexAI } from "@google-cloud/vertexai";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const app = express();
app.use(express.json());

/* ---------------- CORS ---------------- */
const allowedOrigins =
  process.env.CORS_ORIGIN?.split(",") || [
    "http://localhost:5173",
    "https://gi-connectivity.lovable.app/",
    /\.lovable\.dev$/, // Lovable sandbox preview
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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(204).send("");
  next();
});

/* ---------------- Supabase ---------------- */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/* ---------------- Vertex AI ---------------- */
const vertexAI = new VertexAI({
  project:
    process.env.GCP_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.VERTEX_LOCATION || "us-central1",
});

const model = vertexAI.getGenerativeModel({
  model: process.env.MODEL_NAME || "gemini-1.5-flash",
});

/* ---------------- Helpers ---------------- */
async function loadHistory(conversationId, limit = 10) {
  if (!conversationId) return [];
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
}

async function ensureConversation(conversationId, userId, role) {
  if (conversationId) return conversationId;

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
}

async function fetchProductInfo(query) {
  const { data, error } = await supabase
    .from("products")
    .select(
      "name, price, description, stock, images, category, region, location, is_gi_approved"
    )
    .ilike("name", `%${query}%`)
    .limit(5);

  if (error) {
    console.error("Supabase fetchProductInfo error:", error);
    return "Error fetching products.";
  }

  if (!data || data.length === 0) return "No matching products found.";

  return data
    .map(
      (p) => `
**${p.name}**
Price: ₹${p.price}
Stock: ${p.stock}
Category: ${p.category || "N/A"}
Region: ${p.region || "N/A"}
Location: ${p.location || "N/A"}
GI Approved: ${p.is_gi_approved ? "✅ Yes" : "❌ No"}

${p.description || ""}

Image: ${p.images?.[0] || "No image available"}
`
    )
    .join("\n\n");
}

async function fetchOrders(userId) {
  if (!userId) return "You need to log in to view your orders.";

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
    .map(
      (o) => `
🛒 Order ID: ${o.id}
Date: ${o.order_date}
Status: ${o.status}
Total: ₹${o.total_price}
`
    )
    .join("\n\n");
}

/* ---------------- Routes ---------------- */
app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/chat", async (req, res) => {
  try {
    const { message, user_id, conversation_id, role } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    // Ensure conversation exists
    const convoId = await ensureConversation(conversation_id, user_id, role);

    // Load history
    const history = await loadHistory(convoId);

    // Role-aware instructions
    const systemInstruction = `
You are GI Connect’s official chatbot.
The logged-in user role is: ${role}.

- Customer: act as a shopping assistant, show product details, orders, etc.
- Vendor: guide on product uploads, GI certification, inventory.
- Admin: help with analytics, orders, or approvals.

Rules:
- Greet based on role.
- Be concise and warm.
- Pull product/order data from Supabase when possible.
- Never hallucinate product names, orders, or prices.
`;

    // Role-based greeting
    let roleGreeting = "";
    if (role === "customer") roleGreeting = "Hey Customer 👋, how can I help you today?";
    if (role === "vendor") roleGreeting = "Hi Vendor 👋, how can I assist with your services?";
    if (role === "admin") roleGreeting = "Hello Admin 👋, what would you like to manage today?";

    // Database context
    let context = "";
    if (role === "customer" && message.toLowerCase().includes("order")) {
      context = await fetchOrders(user_id);
    }
    if (
      message.toLowerCase().includes("saree") ||
      message.toLowerCase().includes("mango") ||
      message.toLowerCase().includes("art") ||
      message.toLowerCase().includes("dupatt") ||
      message.toLowerCase().includes("handloom")
    ) {
      context = await fetchProductInfo(message);
    }

    // Build prompt contents
    const contents = [{ role: "user", parts: [{ text: systemInstruction }] }, ...history];
    if (roleGreeting) {
      contents.push({ role: "user", parts: [{ text: roleGreeting }] });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    if (context) {
      contents.push({ role: "user", parts: [{ text: "Database context:\n" + context }] });
    }

    // Call Gemini
    const result = await model.generateContent({ contents });

    const aiReply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Sorry, I couldn't generate a response.";

    // Save conversation
    const { error: insertErr } = await supabase.from("messages").insert([
      { conversation_id: convoId, role: "user", content: message },
      { conversation_id: convoId, role: "assistant", content: aiReply },
    ]);
    if (insertErr) console.error("Supabase insert error:", insertErr);

    res.json({ reply: aiReply, conversation_id: convoId });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Start server when running in Cloud Run
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

// Export for Cloud Functions (optional if you ever use Functions)



// Export for Cloud Run / Cloud Functions
export default app;

