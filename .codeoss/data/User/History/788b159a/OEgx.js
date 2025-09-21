// index.js (Cloud Run friendly) - enhanced: handles "missing mask" by auto-retrying with generated mask
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";
import sharp from "sharp"; // <-- add this dependency in package.json

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Basic logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ENV (strict)
const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generated-images";
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME;
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME || process.env.IMAGE_MODEL;
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 1), 4); // enhancement defaults to 1
const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

let supabase = null;
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

// Crash safety
process.on("uncaughtException", (err) => console.error("uncaughtException:", err));
process.on("unhandledRejection", (reason) => console.error("unhandledRejection:", reason));

// start listening quickly
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

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log("Supabase client initialized.");
}

async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse?.token || tokenResponse?.access_token;
}

// health
app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

// main orchestrate
app.post("/orchestrate", async (req, res) => {
  try {
    const incoming = req.header("x-worker-secret");
    if (!incoming || incoming !== WORKER_SECRET) {
      console.warn("Invalid x-worker-secret");
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

    // 1) Vision model -> metadata
    const vision = await callVisionModel(imageUrl, productName);
    console.log("Vision result:", vision);

    // 2) Image enhancement (image-to-image)
    const enhancementPrompt = `Enhance the uploaded product photo. Preserve the product exactly, sharpen details, correct exposure and color, and produce a clean studio-friendly background suitable for marketplace display. Do not modify the product shape or features.`;
    const rawImages = await callImageEnhancementWithMaskFallback(imageUrl, enhancementPrompt, Math.max(1, MAX_IMAGES));
    console.log(`Received ${rawImages.length} enhanced image(s)`);

    // 3) Upload to supabase
    const uploadedUrls = [];
    for (let i = 0; i < rawImages.length; i++) {
      try {
        const publicUrl = await uploadBase64ToSupabase(rawImages[i], `generated/${maker_id || "anon"}/${Date.now()}_${i}`);
        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.warn(`Upload failed for image ${i}:`, err?.message ?? err);
      }
    }

    return res.json({
      product_name: vision.product_name,
      category: vision.category,
      description: vision.description,
      price: Number(vision.price) || 0,
      stock: Number(vision.stock) || 0,
      generated_images: uploadedUrls
    });
  } catch (err) {
    console.error("Orchestration error:", err);
    return res.status(500).json({ error: "orchestration_failed", details: String(err?.message || err) });
  }
});

/* ---------- Helpers ---------- */

async function callVisionModel(imageUrl, productName) {
  if (!VISION_MODEL) throw new Error("VISION_MODEL_NAME not configured");
  const accessToken = await getAccessToken();
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${VISION_MODEL}:generateContent`;

  const imageBytes = await fetch(imageUrl)
    .then(r => { if(!r.ok) throw new Error(`Fetch failed ${r.status}`); return r.arrayBuffer(); })
    .then(buf => Buffer.from(buf).toString("base64"));

  const promptText = `You are an assistant that extracts product metadata from an image.
Generate valid JSON only with keys: product_name, category, description, price, stock, and image_prompt.
Use the provided image and product name: ${productName}`;

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
    generationConfig: { temperature: 0.2, maxOutputTokens: 512, responseMimeType: "application/json" }
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
    try { return JSON.parse(candidate); } 
    catch (e) {
      const m = candidate.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error("Vision model returned unparseable JSON");
    }
  }
  throw new Error("Empty response from Gemini Vision model");
}

/**
 * Attempt enhancement without mask. If the model replies with a "mask" error,
 * auto-generate a full-white mask matching original image size and retry using
 * several plausible mask field names.
 */
async function callImageEnhancementWithMaskFallback(imageUrl, prompt, count = 1) {
  // fetch image buffer once (we'll reuse)
  const respImg = await fetch(imageUrl);
  if (!respImg.ok) throw new Error(`Failed to fetch image for enhancement (${respImg.status})`);
  const arrayBuf = await respImg.arrayBuffer();
  const imgBuffer = Buffer.from(arrayBuf);
  const imgBase64 = imgBuffer.toString("base64");

  // try initial call (no mask)
  try {
    return await callImageEnhancementRequest(imgBase64, prompt, count);
  } catch (err) {
    const errText = String(err?.message ?? err);
    // look for mask-related failure
    if (errText.toLowerCase().includes("mask")) {
      console.warn("Enhancement initial attempt failed due to missing mask. Will create mask and retry.", errText);
      // generate full-white mask same size using sharp
      const maskBase64 = await createFullWhiteMaskBase64(imgBuffer);
      // try multiple common mask field names
      const maskFieldCandidates = ["image_mask", "mask", "mask_image", "imageMask"];
      for (const fieldName of maskFieldCandidates) {
        try {
          console.log("Retrying enhancement with mask field:", fieldName);
          return await callImageEnhancementRequest(imgBase64, prompt, count, { maskField: fieldName, maskBase64 });
        } catch (innerErr) {
          console.warn(`Retry with mask field ${fieldName} failed:`, innerErr?.message ?? innerErr);
          // continue trying next mask field name
        }
      }
      throw new Error("All mask-retry attempts failed: " + errText);
    }
    throw err; // not a mask problem — bubble up
  }
}

/**
 * Low-level call to image model. Accepts raw base64 image and optional mask.
 * If mask provided, it will add the chosen mask field to the instance.
 */
async function callImageEnhancementRequest(imageBase64, prompt, count = 1, options = {}) {
  if (!IMAGE_MODEL) throw new Error("IMAGE_MODEL_NAME not configured");
  const accessToken = await getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${IMAGE_MODEL}:predict`;

  // build instance
  const instance = { prompt, image: { bytesBase64Encoded: imageBase64 } };
  if (options.maskBase64 && options.maskField) {
    instance[options.maskField] = { bytesBase64Encoded: options.maskBase64 };
  }

  const body = {
    instances: [ instance ],
    parameters: {
      sampleCount: Math.max(1, Math.min(count, MAX_IMAGES)),
      aspectRatio: "1:1",
      guidanceScale: 5.0 // moderate faithfulness (lower -> more faithful)
      // add additional model-specific params if required
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Image enhancement request failed:", resp.status, text);
    throw new Error(text || `Image enhancement failed with status ${resp.status}`);
  }

  // parse response — many publisher image models return predictions[] with base64 bytes
  const json = JSON.parse(text);
  const preds = json.predictions || [];
  const images = preds
    .map(p => p.bytesBase64Encoded || p.image || p.b64_json || null)
    .filter(Boolean)
    .map(b64 => (b64.startsWith("data:image") ? b64 : `data:image/png;base64,${b64}`));

  // fallback: extract base64 substrings from raw text
  if (!images.length) {
    const matches = [...text.matchAll(/(?:data:image\/\w+;base64,)?([A-Za-z0-9+/=]{200,})/g)].map(m => m[1]);
    if (matches.length) return matches.map(m => `data:image/png;base64,${m}`);
  }

  return images;
}

/** create a full-white PNG mask for the same width/height of the input image */
async function createFullWhiteMaskBase64(imageBuffer) {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1024;
  const maskBuffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  return maskBuffer.toString("base64");
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
