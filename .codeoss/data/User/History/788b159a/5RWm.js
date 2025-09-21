// index.js - Cloud Run safe, ESM
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// --- ENV
const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generated-images";
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME;
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME || "imagegeneration@006";
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 4), 4);

const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

let supabase = null;
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

// --- Init
const server = app.listen(PORT, () => {
  console.log(`vendor-ai-worker listening on port ${PORT}`);
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
});

// --- Helpers
async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse?.token;
}

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

// ---- Vertex Calls ----
async function callVisionModel(imageUrl, productName) {
  const token = await getAccessToken();
  const imageBytes = await fetchImageAsBase64(imageUrl);

  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${VISION_MODEL}:generateContent`;
  const body = {
    contents: [{
      role: "user",
      parts: [
        { text: `Extract product metadata JSON for ${productName}` },
        { inlineData: { mimeType: "image/jpeg", data: imageBytes } }
      ]
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 512, responseMimeType: "application/json" }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Vision failed: ${text}`);
  const json = JSON.parse(text);
  return JSON.parse(json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
}

async function callImageGeneration(prompt, count = 1, base64 = null) {
  const token = await getAccessToken();
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${IMAGE_MODEL}:predict`;

  const instance = { prompt };
  if (base64) instance.image = { bytesBase64Encoded: base64 };

  const body = { instances: [instance], parameters: { sampleCount: count, aspectRatio: "1:1", guidanceScale: 7 } };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`ImageGen failed: ${text}`);
  const json = JSON.parse(text);

  return (json.predictions || [])
    .map(p => p.bytesBase64Encoded)
    .filter(Boolean)
    .map(b => `data:image/png;base64,${b}`);
}

async function callInpainting(base64, prompt = "Enhance product clarity, clean background") {
  const token = await getAccessToken();
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imageinpainting@002:predict`;

  const body = { instances: [{ prompt, image: { bytesBase64Encoded: base64.replace(/^data:image\/\w+;base64,/, "") } }] };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Inpainting failed: ${text}`);
  const json = JSON.parse(text);
  return `data:image/png;base64,${json.predictions?.[0]?.bytesBase64Encoded}`;
}

async function uploadToSupabase(base64, pathFilename) {
  let ext = "png";
  let base64Clean = base64;
  const m = base64.match(/^data:image\/(\w+);base64,(.*)$/);
  if (m) { ext = m[1]; base64Clean = m[2]; }

  const buffer = Buffer.from(base64Clean, "base64");
  const path = `${pathFilename}.${ext}`;
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: `image/${ext}`, upsert: false
  });
  if (error) throw new Error("Upload failed: " + error.message);
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}

// --- Route
app.post("/orchestrate", async (req, res) => {
  try {
    if (req.header("x-worker-secret") !== WORKER_SECRET)
      return res.status(401).json({ error: "unauthorized" });

    const { image_url, product_name, maker_id } = req.body;
    if (!image_url || !product_name)
      return res.status(400).json({ error: "missing image_url or product_name" });

    // Step 1: Vision metadata
    const vision = await callVisionModel(image_url, product_name);
    const prompt = vision.image_prompt || `${vision.product_name} studio product photo`;

    // Step 2: Text-to-Image variations
    const text2img = await callImageGeneration(prompt, MAX_IMAGES);

    // Step 3: Image-to-Image refinement (feed original image + prompt)
    const origBase64 = await fetchImageAsBase64(image_url);
    const refined = await callImageGeneration(prompt, MAX_IMAGES, origBase64);

    // Step 4: Inpainting enhancement
    const enhanced = [];
    for (const img of [...text2img, ...refined]) {
      try {
        enhanced.push(await callInpainting(img));
      } catch {
        enhanced.push(img);
      }
    }

    // Step 5: Upload
    const urls = [];
    for (let i = 0; i < enhanced.length; i++) {
      urls.push(await uploadToSupabase(enhanced[i], `generated/${maker_id || "anon"}/${Date.now()}_${i}`));
    }

    res.json({ ...vision, generated_images: urls });
  } catch (err) {
    console.error("Orchestration error:", err);
    res.status(500).json({ error: "failed", details: err.message });
  }
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
