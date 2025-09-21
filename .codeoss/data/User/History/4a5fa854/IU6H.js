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
  model: process.env.MODEL_NAME || "gemini-1.5-flash",
});

// ---------------- Helpers ----------------

// Fetch product info
async function fetchProductInfo(query) {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, description, price, stock, images, region, location, is_approal, category, gi_staus, gi_cerificate_url"
      )
      .ilike("name", `%${query}%`)
      .limit(3);

    if (error) throw error;
    if (!data || data.length === 0) return "❌ No matching products found.";

    return data
      .map((p) => {
        const img = Array.isArray(p.images) && p.images.length ? p.images[0] : "No image available";
        return `
**${p.name}**
- 💰 Price: ₹${p.price || "N/A"}
- 📦 Stock: ${p.stock ?? "N/A"}
- 🏷 Category: ${p.category || "N/A"}
- 🌍 Region: ${p.region || "N/A"}
- 📍 Location: ${p.location || "N/A"}
- 🆔 GI Approved: ${p.gi_staus ? "✅ Yes" : "❌ No"}
- 📜 GI Certificate: ${p.gi_cerificate_url || "N/A"}
- 🖼 Image: ${img}

${p.description || ""}
        `;
      })
      .join("\n\n");
  } catch (e) {
    console.error("fetchProductInfo failed:", e);
    return "⚠️ Error fetching products.";
  }
}

// Fetch orders for customer
async function fetchCustomerOrders(customerId) {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, product_name, total_price, status, created_id")
      .eq("customer_id", customerId)
      .order("created_id", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return "🛒 You don’t have any orders yet.";

    return data
      .map(
        (o) => `
🛒 **Order ID:** ${o.id}
📦 Product: ${o.product_name}
💰 Total: ₹${o.total_price}
📌 Status: ${o.status}
🗓 Date: ${o.created_id}
        `
      )
      .join("\n\n");
  } catch (e) {
    console.error("fetchCustomerOrders failed:", e);
    return "⚠️ Error fetching your orders.";
  }
}

// Fetch orders for vendor
async function fetchVendorOrders(vendorId) {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, product_name, total_price, status, created_id")
      .eq("vendor_id", vendorId)
      .order("created_id", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return "📦 No recent orders for your products.";

    return data
      .map(
        (o) => `
📦 **Order ID:** ${o.id}
👤 Customer: ${o.customer_name}
🛒 Product: ${o.product_name}
💰 Total: ₹${o.total_price}
📌 Status: ${o.status}
🗓 Date: ${o.created_id}
        `
      )
      .join("\n\n");
  } catch (e) {
    console.error("fetchVendorOrders failed:", e);
    return "⚠️ Error fetching vendor orders.";
  }
}

// ---------------- Routes ----------------
app.get("/", (req, res) => {
  res.send("✅ GI Connect Chatbot backend is running.");
});

app.post("/chat", async (req, res) => {
  try {
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

    // Prepare Vertex AI prompt
    const contents = [
      { role: "system", parts: [{ text: `You are GI Connect's official chatbot. User role: ${role}.` }] },
      { role: "user", parts: [{ text: roleGreeting }] },
      { role: "user", parts: [{ text: message }] },
    ];

    if (context) {
      contents.push({ role: "user", parts: [{ text: "Database context:\n" + context }] });
    }

    // Call Vertex AI
    const result = await model.generateContent({ contents });
    const aiReply = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || context || "Sorry, I couldn't generate a response.";

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
