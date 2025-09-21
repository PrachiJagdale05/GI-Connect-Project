// index.js (CommonJS - for Cloud Run)
const express = require("express");
const cors = require("cors");
const { VertexAI } = require("@google-cloud/vertexai");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const app = express();
app.use(express.json());

// ---------------- CORS ----------------
const allowedOrigins =
  process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(",")
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:5173", "https://gi-connectivity.lovable.app"];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ---------------- Supabase Client ----------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------- Vertex AI Setup ----------------
const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: process.env.VERTEX_LOCATION || "us-central1",
});

// ✅ Updated model name to gemini-2.0-flash-lite
const model = vertexAI.getGenerativeModel({
  model: process.env.MODEL_NAME || "gemini-2.0-flash-lite",
});

// ---------------- Chat Endpoint ----------------
app.post("/chat", async (req, res) => {
  try {
    const { message, user_id, role, conversation_id } = req.body;

    if (!message || !user_id || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Save message to Supabase (customer/admin/vendor query)
    const { data: savedMessage, error: saveError } = await supabase
      .from("messages")
      .insert([
        {
          user_id,
          role,
          content: message,
          conversation_id: conversation_id || null, // ✅ Safe handling
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error("Supabase Insert Error:", saveError);
      return res.status(500).json({ error: "Failed to save message" });
    }

    // Generate AI response
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
    });

    const aiReply =
      response.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response.";

    // Save AI response
    await supabase.from("messages").insert([
      {
        user_id: "system",
        role: "assistant",
        content: aiReply,
        conversation_id: conversation_id || null,
      },
    ]);

    return res.json({ reply: aiReply });
  } catch (error) {
    console.error("Chat Handler Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------- Health Check ----------------
app.get("/", (req, res) => {
  res.send("Chatbot Backend is Running ✅");
});

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
