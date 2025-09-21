// index.js - Final Merged Code (Clean Structure + Robust AI)
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// --- Quick startup log ---
console.log("vendor-ai-worker booting", {
  node: process.version,
  cwd: process.cwd(),
});

// --- ENV names ---
const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generated-images";
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME || "gemini-1.5-flash-001";
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME || "imagegeneration@006";
// NEW: Environment variable for the segmentation model
const SEGMENTATION_MODEL = process.env.SEGMENTATION_MODEL_NAME || "image-segmentation@001";
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 4), 8);
const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

// --- Globals ---
let supabase = null;
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

// --- Crash safety ---
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err?.stack || String(err));
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason?.stack || String(reason));
});

// --- Start server ---
const server = app.listen(PORT, () => {
  console.log(`vendor-ai-worker listening on port ${PORT}`);
  initializeRuntime().catch(e => console.error("initializeRuntime failed:", e));
});

// --- Runtime init ---
async function initializeRuntime() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!PROJECT_ID) missing.push("VERTEX_PROJECT_ID");
  if (!VISION_MODEL) missing.push("VISION_MODEL_NAME");
  if (!IMAGE_MODEL) missing.push("IMAGE_MODEL_NAME");
  if (!SEGMENTATION_MODEL) missing.push("SEGMENTATION_MODEL_NAME");
  if (!WORKER_SECRET) missing.push("WORKER_SHARED_SECRET");

  if (missing.length) {
    console.error("CRITICAL: Missing required env vars:", missing.join(", "));
    return;
  }

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log("Supabase client initialized.");
  } catch (err) {
    console.error("Failed to init Supabase client:", err);
  }
}

// --------- Helper Functions ----------
async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token || tokenResponse?.access_token;
  if (!token) throw new Error("Unable to obtain access token for Vertex AI");
  return token;
}

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    const m = (str || "").match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

async function uploadBase64ToSupabase(base64OrDataUri, pathFilename) {
  if (!supabase) throw new Error("Supabase client not initialized");
  const base64 = base64OrDataUri.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  const path = `${pathFilename}.png`;
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: `image/png`,
    upsert: true
  });
  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error("Supabase upload failed: " + JSON.stringify(error));
  }
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}

// --- AI Model Callers ---

async function callVisionGenerate(imageBase64, productName) {
  console.log("Extracting product metadata...");
  const accessToken = await getAccessToken();
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${VISION_MODEL}:generateContent`;
  const promptText = `You are an assistant that extracts product metadata from an image. Return a VALID JSON object only with keys: product_name, category, description (1-2 sentences), price (approx number), stock (approx int). Use the provided image and the product name: "${productName}". Return JSON only.`;
  const body = {
    contents: [{"role": "user", parts: [{ text: promptText }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] }],
    generation_config: { temperature: 0.2, maxOutputTokens: 2048, response_mime_type: "application/json" }
  };
  const resp = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Vision metadata request failed: ${text}`);
  const rawJson = JSON.parse(text);
  const candidateText = rawJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = tryParseJson(candidateText || text);
  if (!parsed) throw new Error("Unable to parse vision model output as JSON");
  return {
    product_name: parsed.product_name ?? productName,
    category: parsed.category ?? "Other",
    description: parsed.description ?? "",
    price: parsed.price ?? 0,
    stock: parsed.stock ?? 0
  };
}

// NEW: Specialist model for creating a reliable mask
async function callSegmentationModel(imageBase64) {
    console.log("Generating product mask using dedicated Segmentation model...");
    const accessToken = await getAccessToken();
    const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${SEGMENTATION_MODEL}:predict`;
    const body = {
        instances: [{ "image": { "bytesBase64Encoded": imageBase64 } }],
        parameters: { "maskType": "FOREGROUND" }
    };
    const resp = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const text = await resp.text();
    if (!resp.ok) { throw new Error(`Segmentation failed: ${resp.status} ${text}`); }
    const json = JSON.parse(text);
    const maskBase64 = json.predictions[0]?.categoryMask;
    if (!maskBase64) { throw new Error("Segmentation model did not return a valid mask."); }
    console.log("Successfully generated mask with segmentation model.");
    return maskBase64;
}

async function callInpaintingWithMask(imageBase64, maskBase64, prompt, sampleCount) {
    console.log(`Performing inpainting with mask. Prompt: "${prompt}"`);
    const accessToken = await getAccessToken();
    const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${IMAGE_MODEL}:predict`;
    const body = {
        instances: [{
            prompt: prompt,
            image: { bytesBase64Encoded: imageBase64 },
            mask: { image: { bytesBase64Encoded: maskBase64 } }
        }],
        parameters: { sampleCount: sampleCount, mode: "inpainting", guidanceScale: 9, aspectRatio: "1:1" }
    };
    const resp = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const text = await resp.text();
    if (!resp.ok) { throw new Error(`Inpainting failed: ${resp.status} ${text}`); }
    const json = JSON.parse(text);
    const predictions = json.predictions || [];
    const candidates = predictions.map(p => p.bytesBase64Encoded).filter(Boolean).map(b64 => `data:image/png;base64,${b64}`);
    console.log(`Inpainting generated ${candidates.length} images.`);
    return candidates;
}

// --------- ROUTES ----------

app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

// REVISED: The main orchestration logic using the new, robust pipeline
app.post("/orchestrate", async (req, res) => {
  try {
    const incoming = req.header("x-worker-secret");
    if (!incoming || incoming !== WORKER_SECRET) {
      console.warn("Invalid x-worker-secret header");
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!supabase) {
      console.error("Runtime not initialized - missing envs");
      return res.status(500).json({ error: "server_not_ready" });
    }

    const { image_url: imageUrl, product_name: productName, maker_id } = req.body || {};
    if (!imageUrl || !productName) {
      return res.status(400).json({ error: "missing image_url or product_name" });
    }

    console.log("Orchestration started with SEGMENTATION for:", { productName });
    
    // --- Pipeline ---
    // 1. Fetch image
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`Failed to fetch vendor image: ${imgResp.status}`);
    const imgBuf = Buffer.from(await imgResp.arrayBuffer());
    const imageBase64 = imgBuf.toString("base64");

    // 2. Get metadata
    const visionData = await callVisionGenerate(imageBase64, productName);

    // 3. Generate mask with specialist model
    const maskBase64 = await callSegmentationModel(imageBase64);

    // 4. Inpaint with the guaranteed-valid mask
    const backgroundPrompt = `A professional e-commerce background for '${visionData.product_name}'. Clean, studio lighting, aesthetic, 4k, photorealistic.`;
    const enhancedImages = await callInpaintingWithMask(imageBase64, maskBase64, backgroundPrompt, MAX_IMAGES);
    if (!enhancedImages || enhancedImages.length === 0) {
        return res.status(502).json({ error: "inpainting_produced_no_images", vision: visionData });
    }

    // 5. Upload results
    const uploadedUrls = [];
    for (let i = 0; i < enhancedImages.length; i++) {
      const dataUri = enhancedImages[i];
      const filename = `generated/${maker_id || "anon"}/${Date.now()}_${i}`;
      try {
        const publicUrl = await uploadBase64ToSupabase(dataUri, filename);
        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.warn(`Upload failed for variant ${i}`, err?.message);
      }
    }
     if (!uploadedUrls.length) {
        return res.status(502).json({ error: "all_image_uploads_failed", vision: visionData });
    }
    
    // 6. Return response
    const responsePayload = {
      ...visionData,
      price: Number(visionData.price) || 0,
      stock: Number(visionData.stock) || 0,
      generated_images: uploadedUrls
    };

    console.log("Orchestration complete.", { product: visionData.product_name, generated: uploadedUrls.length });
    return res.json(responsePayload);

  } catch (err) {
    console.error("Orchestration fatal error:", err?.stack || String(err));
    return res.status(500).json({ error: "orchestration_failed", details: err.message });
  }
});

// --- Graceful shutdown ---
process.on("SIGTERM", () => {
  console.info("SIGTERM received, closing server");
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.info("SIGINT received, closing server");
  server.close(() => process.exit(0));
});