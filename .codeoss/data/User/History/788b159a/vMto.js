// index.js - Cloud Run safe, ESM
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";
import fetch from "node-fetch";
import sharp from "sharp";

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

console.log("vendor-ai-worker booting", {
  node: process.version,
  cwd: process.cwd(),
  env_preview: {
    PORT: process.env.PORT,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VISION_MODEL_NAME: !!process.env.VISION_MODEL_NAME,
    IMAGE_MODEL_NAME: !!process.env.IMAGE_MODEL_NAME,
    SEGMENT_MODEL_NAME: !!process.env.SEGMENT_MODEL_NAME,
    INPAINT_MODEL_NAME: !!process.env.INPAINT_MODEL_NAME,
    SR_MODEL_NAME: !!process.env.SR_MODEL_NAME,
    WORKER_SHARED_SECRET: !!process.env.WORKER_SHARED_SECRET
  }
});

// --- ENV names (strict) ---
const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generated-images";
const PROJECT_ID =
  process.env.VERTEX_PROJECT_ID ||
  process.env.GCP_PROJECT ||
  process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME;
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME || process.env.IMAGE_MODEL;
const SEGMENT_MODEL = process.env.SEGMENT_MODEL_NAME; // REQUIRED (sam)
const INPAINT_MODEL = process.env.INPAINT_MODEL_NAME; // REQUIRED (sd-inpaint)
const SR_MODEL = process.env.SR_MODEL_NAME; // optional
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 4), 4);
const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

// Fidelity thresholds (tweakable via env)
const MIN_PSNR = Number(process.env.MIN_PSNR || 30);
const MAX_MSE = Number(process.env.MAX_MSE || 200);
const MAX_COLOR_DELTA = Number(process.env.MAX_COLOR_DELTA || 6);

// --- Globals ---
let supabase = null;
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

// crash safety
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err?.stack || String(err));
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason?.stack || String(reason));
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`vendor-ai-worker listening on port ${PORT}`);
  initializeRuntime().catch((e) =>
    console.error("initializeRuntime failed:", e)
  );
});

async function initializeRuntime() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!PROJECT_ID) missing.push("VERTEX_PROJECT_ID / GCP_PROJECT");
  if (!VISION_MODEL) missing.push("VISION_MODEL_NAME");
  if (!IMAGE_MODEL) missing.push("IMAGE_MODEL_NAME");
  if (!SEGMENT_MODEL) missing.push("SEGMENT_MODEL_NAME");
  if (!INPAINT_MODEL) missing.push("INPAINT_MODEL_NAME");
  if (!WORKER_SECRET) missing.push("WORKER_SHARED_SECRET");

  if (missing.length) {
    console.error("Missing required env vars:", missing.join(", "));
    return;
  }

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log("Supabase client initialized.");
  } catch (err) {
    console.error("Failed to init Supabase client:", err);
  }
}

async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token || tokenResponse?.access_token;
  if (!token) throw new Error("Unable to obtain access token for Vertex API");
  return token;
}

/* -------------------- ROUTES -------------------- */
app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

/**
 * Orchestration: vision → segmentation → inpainting → composite → (SR optional) → QA → upload
 */
app.post("/orchestrate", async (req, res) => {
  try {
    const incoming = req.header("x-worker-secret");
    if (!incoming || incoming !== WORKER_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!supabase) {
      return res.status(500).json({
        error: "server_not_ready",
        details:
          "Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or other required envs",
      });
    }

    const { image_url: imageUrl, product_name: productName, maker_id } =
      req.body || {};
    if (!imageUrl || !productName) {
      return res
        .status(400)
        .json({ error: "missing image_url or product_name" });
    }

    console.log("Orchestration started for:", {
      productName,
      imageUrl,
      maker_id,
    });

    // 1) Vision
    const visionResult = await callVisionModel(imageUrl, productName);

    // 2) Original bytes
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error("Unable to fetch source image");
    const imageArrayBuffer = await imgResp.arrayBuffer();
    const originalBytes = Buffer.from(imageArrayBuffer);
    const originalBase64 = `data:image/jpeg;base64,${originalBytes.toString(
      "base64"
    )}`;

    // 3) Segmentation (mask)
    const maskDataUri = await callSegmentationModel(originalBase64);

    // 4) Inpainting
    const prompt =
      visionResult.image_prompt ||
      `${visionResult.product_name} product photo on a clean studio background`;
    const editedBackgroundBase64s = await callInpaintModel(
      originalBase64,
      maskDataUri,
      prompt,
      Math.min(MAX_IMAGES, 4)
    );

    // 5) Composite → SR(optional) → QA → upload
    const uploadedUrls = [];
    for (let i = 0; i < editedBackgroundBase64s.length; i++) {
      try {
        const editedBg = editedBackgroundBase64s[i];
        const compositeBuffer = await compositeProductOntoBackground(
          originalBase64,
          maskDataUri,
          editedBg
        );

        let finalBuffer = compositeBuffer;
        if (SR_MODEL) {
          try {
            const srB64 = await callSRModel(
              `data:image/png;base64,${compositeBuffer.toString("base64")}`
            );
            const m = srB64.match(/^data:image\/\w+;base64,(.*)$/);
            if (m) finalBuffer = Buffer.from(m[1], "base64");
          } catch (err) {
            console.warn("SR model failed:", String(err));
          }
        }

        const pass = await runFidelityChecks(
          originalBase64,
          maskDataUri,
          finalBuffer
        );
        if (!pass) continue;

        const filename = `generated/${
          maker_id || "anon"
        }/${Date.now()}_${i}`;
        const publicUrl = await uploadBufferToSupabase(
          finalBuffer,
          `${filename}.png`
        );
        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.warn("Variant failed:", String(err));
      }
    }

    return res.json({
      product_name: visionResult.product_name,
      category: visionResult.category,
      description: visionResult.description,
      price: Number(visionResult.price) || 0,
      stock: Number(visionResult.stock) || 0,
      generated_images: uploadedUrls,
    });
  } catch (err) {
    console.error("Orchestration failed:", err);
    return res
      .status(500)
      .json({ error: "orchestration_failed", details: String(err.message) });
  }
});

/* -------------------- Helpers (Vision / Segment / Inpaint / SR / Composite / Upload / QA) -------------------- */

async function callVisionModel(imageUrl, productName) {
  if (!VISION_MODEL) throw new Error("VISION_MODEL_NAME not configured");
  const accessToken = await getAccessToken();
  const imageBytes = await fetch(imageUrl)
    .then((r) => r.arrayBuffer())
    .then((buf) => Buffer.from(buf).toString("base64"));

  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${VISION_MODEL}:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Extract product metadata. Return JSON with: product_name, category, description, price, stock, image_prompt. Product: ${productName}`,
          },
          { inlineData: { mimeType: "image/jpeg", data: imageBytes } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`Vision failed: ${text}`);

  const json = JSON.parse(text);
  const candidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = candidate ? JSON.parse(candidate) : {};
  return {
    product_name: parsed.product_name ?? productName,
    category: parsed.category ?? "Other",
    description: parsed.description ?? "",
    price: parsed.price ?? 0,
    stock: parsed.stock ?? 0,
    image_prompt:
      parsed.image_prompt ?? `${productName} product photo on white background`,
  };
}

// Segmentation
async function callSegmentationModel(imageDataUri) {
  if (!SEGMENT_MODEL) throw new Error("SEGMENT_MODEL_NAME not configured");
  const accessToken = await getAccessToken();
  const imageBase64 = imageDataUri.replace(/^data:image\/\w+;base64,/, "");

  const url = `${REGION_BASE}/${SEGMENT_MODEL}:predict`;
  const body = {
    instances: [{ image: { imageBytes: imageBase64 }, params: { outputMask: true } }],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`Segmentation failed: ${text}`);
  const json = JSON.parse(text);
  const maskB64 =
    json.predictions?.[0]?.maskBytesBase64 ||
    json.predictions?.[0]?.mask ||
    json.predictions?.[0]?.mask_base64;
  if (!maskB64) throw new Error("Segmentation returned no mask");
  return `data:image/png;base64,${maskB64}`;
}

// Inpaint
async function callInpaintModel(imageDataUri, maskDataUri, prompt, count = 1) {
  if (!INPAINT_MODEL) throw new Error("INPAINT_MODEL_NAME not configured");
  const accessToken = await getAccessToken();
  const imageBase64 = imageDataUri.replace(/^data:image\/\w+;base64,/, "");
  const maskBase64 = maskDataUri.replace(/^data:image\/\w+;base64,/, "");

  const url = `${REGION_BASE}/${INPAINT_MODEL}:predict`;
  const body = {
    instances: [{ image: { imageBytes: imageBase64 }, mask: { imageBytes: maskBase64 }, prompt }],
    parameters: { sampleCount: count, guidanceScale: 7.5 },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`Inpaint failed: ${text}`);
  const json = JSON.parse(text);
  const preds = json.predictions || [];
  return preds
    .map((p) => p.imageBytesBase64 || p.data || p.image || null)
    .filter(Boolean)
    .map((b) => (b.startsWith("data:image") ? b : `data:image/png;base64,${b}`));
}

// SR remains optional (unchanged)
// compositeProductOntoBackground, runFidelityChecks, uploadBufferToSupabase remain unchanged

