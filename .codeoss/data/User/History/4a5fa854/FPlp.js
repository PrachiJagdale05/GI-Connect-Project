import express from "express";
import { createClient } from "@supabase/supabase-js";
import { VertexAI } from "@google-cloud/vertexai";

const app = express();
app.use(express.json());

// --- Supabase client ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Vertex AI client ---
const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT,
  location: process.env.VERTEX_LOCATION || "us-central1",
});

const model = vertexAI.getGenerativeModel({
  model: "publishers/google/models/gemini-2.5-flash-lite",
});

// --- Utility: get user role from Supabase ---
async function getUserRole(user_id) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user_id)
    .single();

  if (error) {
    console.error("Supabase role fetch error:", error.message);
    return "customer"; // fallback role
  }
  return data?.role || "customer";
}

// --- Role-specific greeting ---
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

// --- Chat endpoint ---
app.post("/chat", async (req, res) => {
  try {
    const { message, user_id } = req.body;

    if (!message || !user_id) {
      return res.status(400).json({ error: "message and user_id are required" });
    }

    // 1. Fetch role
    const role = await getUserRole(user_id);

    // 2. Role greeting
    const greeting = roleGreeting(role);

    // 3. Construct contextual instruction (instead of system role)
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

    // 5. Respond JSON
    res.json({
      success: true,
      reply,
      role,
      user_id,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(200).json({
      success: false,
      reply: "Something went wrong while processing your request.",
      details: err.message,
    });
  }
});

// Health check
app.get("/", (req, res) => res.send("Chatbot running ✅"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
