// index.js (Cloud Run friendly) - image enhancement (image-to-image) workflow
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Basic request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ----- ENV strict names -----
const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generated-images";
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME; // e.g. "gemini-1.0-pro-vision"
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME || process.env.IMAGE_MODEL; // e.g. "imagegeneration@006"

// We clamp MAX_IMAGES but enhancement will produce 1 image by default
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 1), 4);

const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

// Global vars
let supabase = null;
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

// Crash safety
process.on("uncaughtException", (err) => console.error("uncaughtException:", err));
process.on("unhandledRejection", (reason) => console.error("unhandledRejection:", reason));

// Start server first so Cloud Run is happy
const server = app.listen(PORT, () => {
  console.log(`vendor-ai-worker listening on port ${PORT}`);
  initializeRuntime().catch(err => console.error("Runtime initialization failed:", err));
});

async function initializeRuntime() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!PROJECT_ID) missing.push("VERTEX_PROJECT_ID / GCP_PROJECT");
  if (!VISION_MODEL) missing.push("VISION_MODEL_NAME");
  if (!IMAGE_MODEL) missing.push("IMAGE_MODEL_NAME");
  if (!WORKER_SECRET) missing.push("WORKER_SHARED_SECRET");

  if (missing.length) {
    console.error("Missing required env vars:", missing.join(", "));
    return;
  }

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log("Supabase client initialized.");
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}

async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse?.token || tokenResponse?.access_token;
}

// Health check
app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

// Main orchestration
app.post("/orchestrate", async (req, res) => {
  try {
    const incoming = req.header("x-worker-secret");
    if (!incoming || incoming !== WORKER_SECRET) {
      console.warn("Invalid or missing x-worker-secret header");
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!supabase) {
      console.error("Runtime not initialized.");
      return res.status(500).json({ error: "server_not_ready" });
    }

    const { image_url: imageUrl, product_name: productName, maker_id } = req.body || {};
    if (!imageUrl || !productName) {
      return res.status(400).json({ error: "missing image_url or product_name" });
    }

    console.log("Orchestration started for:", productName);

    // 1) Vision model -> structured metadata (JSON)
    const vision = await callVisionModel(imageUrl, productName);
    console.log("Vision result:", vision);

    // 2) Image enhancement (image-to-image) - preserve original product and enhance background/quality
    // We'll produce a single enhanced image (sampleCount=1). If you want multiple variants, adjust sampleCount.
    const enhancementPrompt = `Enhance the uploaded product photo. Preserve the product exactly, sharpen details, correct color/exposure if needed, and produce a clean studio-quality background suitable for marketplace display. Do not change the product's shape or features.`;
    const rawImages = await callImageEnhancement(imageUrl, enhancementPrompt, 1); // returns array of data URIs
    console.log(`Received ${rawImages.length} enhanced images`);

    // 3) Upload to Supabase
    const uploadedUrls = [];
    for (let i = 0; i < rawImages.length; i++) {
      try {
        const publicUrl = await uploadBase64ToSupabase(
          rawImages[i],
          `generated/${maker_id || "anon"}/${Date.now()}_${i}`
        );
        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.warn("Upload failed for image", i, err);
      }
    }

    return res.json({
      product_name: vision.product_name,
      category: vision.category,
      description: vision.description,
      price: Number(vision.price) || 0,
      stock: Number(vision.stock) || 0,
      generated_images: uploadedUrls,
    });
  } catch (err) {
    console.error("Orchestration error:", err);
    return res.status(500).json({ error: "orchestration_failed", details: String(err?.message || err) });
  }
});

/* ---------- Helpers ---------- */

// Gemini Vision model (unchanged: multimodal generateContent expecting JSON output)
async function callVisionModel(imageUrl, productName) {
  if (!VISION_MODEL) throw new Error("VISION_MODEL_NAME not configured");

  const accessToken = await getAccessToken();
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${VISION_MODEL}:generateContent`;

  const imageBytes = await fetch(imageUrl)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch image at ${imageUrl} (${r.status})`);
      return r.arrayBuffer();
    })
    .then(buf => Buffer.from(buf).toString("base64"));

  const promptText = `You are an assistant that extracts product metadata from an image.
Generate valid JSON with keys: product_name, category, description, price, stock, and image_prompt.
Base your response on the provided image and product name: ${productName}
Return JSON only.`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText },
          { inlineData: { mimeType: "image/jpeg", data: imageBytes } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
      responseMimeType: "application/json"
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Vision model failed:", resp.status, text);
    throw new Error(`Vision model request failed: ${text}`);
  }

  const json = JSON.parse(text);
  const candidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (candidate) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      console.warn("Vision returned text but JSON.parse failed, attempting substring parse");
      // try to extract JSON substring
      const m = candidate.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error("Vision model returned non-JSON response");
    }
  }
  throw new Error("Empty response from Gemini Vision model");
}

/**
 * Image enhancement (image-to-image) using Vertex image model.
 * - imageUrl: URL of the vendor uploaded image (publicly accessible)
 * - prompt: textual instruction to guide enhancement
 * - count: how many enhanced variants to request (we default to 1)
 *
 * NOTE: the exact REST shape may vary by Vertex model version. This implementation
 * uses the common `predict` shape and expects responses containing `predictions[].bytesBase64Encoded`.
 */
async function callImageEnhancement(imageUrl, prompt, count = 1) {
  if (!IMAGE_MODEL) throw new Error("IMAGE_MODEL_NAME not configured");

  // Fetch original image and convert to base64
  const imageBytes = await fetch(imageUrl)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch image at ${imageUrl} (${r.status})`);
      return r.arrayBuffer();
    })
    .then(buf => Buffer.from(buf).toString("base64"));

  const accessToken = await getAccessToken();

  // Using the v1beta1 predict endpoint for image models (publisher google)
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${IMAGE_MODEL}:predict`;

  // Instance includes the input image bytes and the prompt. Edit mode / options may depend on model.
  const body = {
    instances: [
      {
        // many Vertex image models accept a prompt + an image encoded in base64
        prompt,
        // include input image bytes so model performs image-to-image editing
        image: {
          bytesBase64Encoded: imageBytes
        }
      }
    ],
    parameters: {
      sampleCount: Math.max(1, Math.min(count, MAX_IMAGES)), // clamp to allowed
      aspectRatio: "1:1",
      // guidanceScale closer to 1-7 controls faithfulness vs creativity; lower = more faithful
      guidanceScale: 5.0,
      // Some publisher models support editMode or similar flags; include if supported
      // editMode: "enhance" // (uncomment if your model supports an editMode param)
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Image enhancement failed:", resp.status, text);
    throw new Error(`Image enhancement failed: ${text}`);
  }

  const json = JSON.parse(text);
  const preds = json.predictions || [];

  // Map to data URIs (expecting preds[*].bytesBase64Encoded)
  const images = preds
    .map(p => p.bytesBase64Encoded || p.image || p.b64_json || null)
    .filter(Boolean)
    .map(b64 => {
      // some models return raw base64 without header, some with; normalize
      return b64.startsWith("data:image") ? b64 : `data:image/png;base64,${b64}`;
    });

  // If nothing found in predictions, try to extract any base64 substring from raw text as fallback
  if (!images.length) {
    const matches = [...text.matchAll(/(?:data:image\/\w+;base64,)?([A-Za-z0-9+/=]{200,})/g)].map(m => m[1]);
    if (matches.length) return matches.map(m => `data:image/png;base64,${m}`);
  }

  return images;
}

async function uploadBase64ToSupabase(base64OrDataUri, pathFilename) {
  if (!supabase) throw new Error("Supabase client not initialized");
  let base64 = base64OrDataUri;
  let ext = "png";
  const match = (base64OrDataUri || "").match(/^data:image\/(\w+);base64,(.*)$/);
  if (match) {
    ext = match[1] === "jpeg" ? "jpg" : match[1];
    base64 = match[2];
  }
  const buffer = Buffer.from(base64, "base64");
  const path = `${pathFilename}.${ext}`;

  // upload (service_role key required)
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: `image/${ext}`,
    upsert: false,
  });
  if (error) {
    console.error("Supabase upload error", error);
    throw new Error("Supabase upload failed");
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}
