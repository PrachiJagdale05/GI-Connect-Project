// index.js - Cloud Run safe, ESM
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// --- Quick startup log so Cloud Run logs show the process booting ---
console.log("vendor-ai-worker booting", {
  node: process.version,
  cwd: process.cwd(),
  env_preview: {
    PORT: process.env.PORT,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VISION_MODEL_NAME: !!process.env.VISION_MODEL_NAME,
    IMAGE_MODEL_NAME: !!process.env.IMAGE_MODEL_NAME,
    WORKER_SHARED_SECRET: !!process.env.WORKER_SHARED_SECRET
  }
});

// --- ENV names (strict) ---
const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generated-images";
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME;
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME || process.env.IMAGE_MODEL;
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 4), 4);
const REGION_BASE = https://${LOCATION}-aiplatform.googleapis.com/v1;

// --- Globals to be initialized asynchronously ---
let supabase = null;
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

// crash safety -- log but do not exit
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err && err.stack ? err.stack : String(err));
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason && reason.stack ? reason.stack : String(reason));
});

// Start the server immediately so Cloud Run sees a listening port
const server = app.listen(PORT, () => {
  console.log(vendor-ai-worker listening on port ${PORT});
  // initialize runtime after server is listening (non-blocking)
  initializeRuntime().catch(e => console.error("initializeRuntime failed:", e));
});

// Initialize supabase client and other runtime prerequisites
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
    // Don't throw — server must stay alive to let operators view logs and set envs
    return;
  }

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log("Supabase client initialized.");
  } catch (err) {
    console.error("Failed to init Supabase client:", err);
  }
}

// Helper: obtain Google access token for Vertex API calls
async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token || tokenResponse?.access_token;
  if (!token) throw new Error("Unable to obtain access token for Vertex API");
  return token;
}

/* -------------------- ROUTES -------------------- */

// Health
app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

// Orchestrate main route
app.post("/orchestrate", async (req, res) => {
  try {
    // 1) auth using x-worker-secret
    const incoming = req.header("x-worker-secret");
    if (!incoming || incoming !== WORKER_SECRET) {
      console.warn("Invalid or missing x-worker-secret header");
      return res.status(401).json({ error: "unauthorized" });
    }

    // 2) runtime readiness
    if (!supabase) {
      console.error("Runtime not initialized - missing envs or supabase init failed");
      return res.status(500).json({ error: "server_not_ready", details: "Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or other required envs" });
    }

    const { image_url: imageUrl, product_name: productName, maker_id } = req.body || {};
    if (!imageUrl || !productName) {
      return res.status(400).json({ error: "missing image_url or product_name" });
    }

    console.log("Orchestration started for:", { productName, imageUrl, maker_id });

    // 3) Vision analysis
    let visionResult;
    try {
      visionResult = await callVisionModel(imageUrl, productName);
      console.log("Vision result:", visionResult);
    } catch (err) {
      console.error("callVisionModel failed:", err && err.stack ? err.stack : String(err));
      return res.status(500).json({ error: "orchestration_failed", details: Vision model failed: ${String(err?.message ?? err)} });
    }

    // 4) Image generation (image-to-image style or prompt-based depending on model)
    const prompt = visionResult.image_prompt || ${visionResult.product_name} product photo;
    let rawImages;
    try {
      rawImages = await callImageGeneration(prompt, Math.min(MAX_IMAGES, 4));
      console.log(Image generation returned ${rawImages.length} items);
    } catch (err) {
      console.error("callImageGeneration failed:", err && err.stack ? err.stack : String(err));
      return res.status(500).json({ error: "orchestration_failed", details: Image generation failed: ${String(err?.message ?? err)} });
    }

    // 5) Upload generated images to Supabase storage and collect public URLs
    const uploadedUrls = [];
    for (let i = 0; i < rawImages.length; i++) {
      const base64OrDataUri = rawImages[i];
      const filename = generated/${maker_id || "anon"}/${Date.now()}_${i};
      try {
        const publicUrl = await uploadBase64ToSupabase(base64OrDataUri, filename);
        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.warn("uploadBase64ToSupabase failed for index", i, err);
      }
    }

    // 6) Reply
    const payload = {
      product_name: visionResult.product_name,
      category: visionResult.category,
      description: visionResult.description,
      price: Number(visionResult.price) || 0,
      stock: Number(visionResult.stock) || 0,
      generated_images: uploadedUrls
    };

    console.log("Orchestration finished", { product: payload.product_name, generated_count: uploadedUrls.length });
    return res.json(payload);
  } catch (err) {
    console.error("Orchestration unexpected error:", err && err.stack ? err.stack : String(err));
    return res.status(500).json({ error: "orchestration_failed", details: String(err?.message || err) });
  }
});

/* -------------------- Helpers (Vision / Image Gen / Upload) -------------------- */

// NOTE: The exact URL/shape used here must match the model you have access to.
// If your project doesn't have access to the publisher model, Vertex will 404.
// callVisionModel should use an endpoint that supports multimodal image+prompt input
async function callVisionModel(imageUrl, productName) {
  if (!VISION_MODEL) throw new Error("VISION_MODEL_NAME not configured");

  const accessToken = await getAccessToken();

  // We send the image bytes inline as base64 and instruct the model to return JSON only
  const imageBytes = await fetch(imageUrl).then(r => r.arrayBuffer()).then(buf => Buffer.from(buf).toString("base64"));

  const promptText = `You are an assistant that extracts product metadata from an image.
Return VALID JSON ONLY with keys: product_name, category, description, price, stock, image_prompt.
Use the provided image and the product name: ${productName}`;

  const url = ${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${VISION_MODEL}:generateContent;

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
    headers: {
      Authorization: Bearer ${accessToken},
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Vision model request failed:", resp.status, text);
    throw new Error(Vision model request failed: ${text});
  }

  // parse: look for candidate text that is JSON
  const json = JSON.parse(text);
  const candidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) throw new Error("Empty response from vision model");
  let parsed = null;
  try {
    parsed = JSON.parse(candidate);
  } catch (err) {
    // try to extract JSON substring
    const m = candidate.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  }
  if (!parsed) throw new Error("Vision model returned non-JSON output");
  return {
    product_name: parsed.product_name ?? productName,
    category: parsed.category ?? "Other",
    description: parsed.description ?? "",
    price: parsed.price ?? 0,
    stock: parsed.stock ?? 0,
    image_prompt: parsed.image_prompt ?? ${productName} product photo
  };
}

// callImageGeneration: generic predict for an image model that returns base64 bytes
async function callImageGeneration(prompt, count = 1) {
  if (!IMAGE_MODEL) throw new Error("IMAGE_MODEL_NAME not configured");

  const accessToken = await getAccessToken();
  const url = ${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${IMAGE_MODEL}:predict;

  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: count,
      aspectRatio: "1:1",
      guidanceScale: 7.0
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: Bearer ${accessToken}, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Image gen request failed:", resp.status, text);
    throw new Error(Image generation failed: ${text});
  }

  const json = JSON.parse(text);
  const preds = json.predictions || [];
  const b64s = preds
    .map(p => p.bytesBase64Encoded ?? p.data ?? p.image ?? null)
    .filter(Boolean);

  // normalize into data URIs
  return b64s.map(b => (b.startsWith("data:image") ? b : data:image/png;base64,${b}));
}

// Upload base64/dataURI to Supabase storage and return public URL
async function uploadBase64ToSupabase(base64OrDataUri, pathFilename) {
  if (!supabase) throw new Error("Supabase client not initialized");
  let base64 = base64OrDataUri;
  let ext = "png";
  const m = (base64OrDataUri || "").match(/^data:image\/(\w+);base64,(.*)$/);
  if (m) {
    ext = m[1] === "jpeg" ? "jpg" : m[1];
    base64 = m[2];
  }
  const buffer = Buffer.from(base64, "base64");
  const path = ${pathFilename}.${ext};

  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: image/${ext},
    upsert: false
  });
  if (error) {
    console.error("Supabase upload error", error);
    throw new Error("Supabase upload failed");
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.info("SIGTERM received, closing server");
  server.close(() => process.exit(0));
});
