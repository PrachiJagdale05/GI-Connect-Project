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
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME;
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME || process.env.IMAGE_MODEL;
const SEGMENT_MODEL = process.env.SEGMENT_MODEL_NAME; // segmentation (SAM / custom)
const INPAINT_MODEL = process.env.INPAINT_MODEL_NAME; // inpainting model
const SR_MODEL = process.env.SR_MODEL_NAME; // super-resolution if available
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 4), 4);
const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

// Fidelity thresholds (tweakable via env)
const MIN_PSNR = Number(process.env.MIN_PSNR || 30); // higher is stricter
const MAX_MSE = Number(process.env.MAX_MSE || 200);  // lower is stricter
const MAX_COLOR_DELTA = Number(process.env.MAX_COLOR_DELTA || 6); // CIE Delta-E-ish heuristic

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

// Start the server
const server = app.listen(PORT, () => {
  console.log(`vendor-ai-worker listening on port ${PORT}`);
  initializeRuntime().catch(e => console.error("initializeRuntime failed:", e));
});

async function initializeRuntime() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!PROJECT_ID) missing.push("VERTEX_PROJECT_ID / GCP_PROJECT");
  if (!VISION_MODEL) missing.push("VISION_MODEL_NAME");
  if (!IMAGE_MODEL) missing.push("IMAGE_MODEL_NAME");
  if (!WORKER_SECRET) missing.push("WORKER_SHARED_SECRET");

  // segmentation/inpaint/SR are optional, skip them

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

/* --------------------
   Helper: buildModelPredictUrl
   - If user provides the full resource string (projects/.../locations/.../models/ID),
     use that and require it to start with "projects/".
   - Otherwise assume model is short name hosted by publisher (eg imagegeneration@006)
     and use the publishers/google/models path.
---------------------*/
function buildModelPredictUrl(modelResourceName, method = "predict") {
  if (!modelResourceName) throw new Error("Model resource name is empty");
  // If it's a full resource string, require it start with "projects/"
  if (modelResourceName.startsWith("projects/")) {
    return `${REGION_BASE}/${modelResourceName}:${method}`;
  }
  // Short-name (eg "imagegeneration@006" or "gemini-2.0-flash-lite") -> use publisher path
  return `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelResourceName}:${method}`;
}

/* -------------------- ROUTES -------------------- */
app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

/**
 * Main orchestration (high-level):
 * 1) verify secret
 * 2) call vision model (metadata + base prompt)
 * 3) run segmentation (optional) -> mask
 * 4) run inpaint with mask (optional) -> edited backgrounds
 * 5) composite and optional SR (optional)
 * 6) fidelity checks + upload
 */
app.post("/orchestrate", async (req, res) => {
  try {
    const incoming = req.header("x-worker-secret");
    if (!incoming || incoming !== WORKER_SECRET) {
      console.warn("Invalid or missing x-worker-secret header");
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!supabase) {
      console.error("Runtime not initialized - missing envs or supabase init failed");
      return res.status(500).json({ error: "server_not_ready", details: "Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or other required envs" });
    }

    const { image_url: imageUrl, product_name: productName, maker_id } = req.body || {};
    if (!imageUrl || !productName) {
      return res.status(400).json({ error: "missing image_url or product_name" });
    }

    console.log("Orchestration started for:", { productName, imageUrl, maker_id });

    // 1) Vision → product metadata + base prompt
    let visionResult;
    try {
      visionResult = await callVisionModel(imageUrl, productName);
      console.log("Vision result:", visionResult);
    } catch (err) {
      console.error("callVisionModel failed:", err && err.stack ? err.stack : String(err));
      return res.status(500).json({ error: "orchestration_failed", details: `Vision model failed: ${String(err?.message ?? err)}` });
    }

    // 2) Fetch original bytes
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error("Unable to fetch source image");
    const imageArrayBuffer = await imgResp.arrayBuffer();
    const originalBytes = Buffer.from(imageArrayBuffer);
    const originalBase64 = `data:image/jpeg;base64,${originalBytes.toString("base64")}`;

    // 3) Run segmentation to generate mask (base64 PNG mask) - optional
    let maskDataUri = null;
    if (SEGMENT_MODEL) {
      try {
        maskDataUri = await callSegmentationModel(originalBase64);
        console.log("Segmentation mask obtained (length):", (maskDataUri || "").length);
      } catch (err) {
        console.error("callSegmentationModel failed:", err && err.stack ? err.stack : String(err));
        return res.status(500).json({ error: "orchestration_failed", details: `Segmentation failed: ${String(err?.message ?? err)}` });
      }
    } else {
      console.log("SEGMENT_MODEL not configured; skipping segmentation step.");
      // If segmentation not present, we can still do non-masked edits or simply return original-like results.
      // For now, require segmentation for background edit flow; otherwise we could fallback to prompt-only imagegen.
      // We'll return an error here because your background-edit flow depends on a mask to preserve the product.
      // If you want fallback behavior (e.g., full-image edits), remove this early-return and adapt flow.
      return res.status(400).json({ error: "segmentation_not_configured", details: "SEGMENT_MODEL_NAME not set — background editing requires segmentation." });
    }

    // 4) Use inpainting/instructed image edit to change only background (pass mask) - optional
    let editedBackgroundBase64s = [];
    if (INPAINT_MODEL) {
      const prompt = visionResult.image_prompt || `${visionResult.product_name} product photo on a clean studio background`;
      try {
        editedBackgroundBase64s = await callInpaintModel(originalBase64, maskDataUri, prompt, Math.min(MAX_IMAGES, 4));
        console.log(`Inpaint returned ${editedBackgroundBase64s.length} variants`);
      } catch (err) {
        console.error("callInpaintModel failed:", err && err.stack ? err.stack : String(err));
        return res.status(500).json({ error: "orchestration_failed", details: `Inpainting failed: ${String(err?.message ?? err)}` });
      }
    } else {
      console.log("INPAINT_MODEL not configured; skipping inpainting step.");
      return res.status(400).json({ error: "inpaint_not_configured", details: "INPAINT_MODEL_NAME not set — background editing requires an inpaint model." });
    }

    // 5) For each variant, composite preserved product onto edited background, optional SR, QA, upload
    const uploadedUrls = [];
    for (let i = 0; i < editedBackgroundBase64s.length; i++) {
      try {
        const editedBg = editedBackgroundBase64s[i];
        // composite
        const compositeBuffer = await compositeProductOntoBackground(originalBase64, maskDataUri, editedBg);

        // optional SR (if SR model provided) — otherwise keep composite
        let finalBuffer = compositeBuffer;
        if (SR_MODEL) {
          try {
            const srB64 = await callSRModel(`data:image/png;base64,${compositeBuffer.toString("base64")}`);
            const m = srB64.match(/^data:image\/\w+;base64,(.*)$/);
            if (m) finalBuffer = Buffer.from(m[1], "base64");
          } catch (err) {
            console.warn("SR model failed for variant", i, String(err));
            // continue with non-SR composite
          }
        }

        // run fidelity checks
        const pass = await runFidelityChecks(originalBase64, maskDataUri, finalBuffer);
        if (!pass) {
          console.warn("Variant failed fidelity checks - skipping upload (variant index)", i);
          continue;
        }

        // upload final image and mask (for audit)
        const filename = `generated/${maker_id || "anon"}/${Date.now()}_${i}`;
        const publicUrl = await uploadBufferToSupabase(finalBuffer, `${filename}.png`);
        uploadedUrls.push(publicUrl);

        // store mask too
        try {
          const maskBuffer = dataUriToBuffer(maskDataUri);
          await uploadBufferToSupabase(maskBuffer, `${filename}_mask.png`);
        } catch (err) {
          console.warn("Failed to upload mask", err);
        }
      } catch (err) {
        console.warn("Processing variant failed:", err && err.stack ? err.stack : String(err));
      }
    }

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

/* -------------------- Helpers (Vision / Segment / Inpaint / SR / Composite / Upload / QA) -------------------- */

async function callVisionModel(imageUrl, productName) {
  if (!VISION_MODEL) throw new Error("VISION_MODEL_NAME not configured");
  const accessToken = await getAccessToken();
  const imageBytes = await fetch(imageUrl).then(r => r.arrayBuffer()).then(buf => Buffer.from(buf).toString("base64"));

  const promptText = `You are an assistant that extracts product metadata from an image.
Return VALID JSON ONLY with keys: product_name, category, description, price, stock, image_prompt.
Use the provided image and the product name: ${productName}`;

  // Vision model uses generateContent (multimodal)
  const url = buildModelPredictUrl(VISION_MODEL, "generateContent");

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
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Vision model request failed:", resp.status, text);
    throw new Error(`Vision model request failed: ${text}`);
  }

  const json = JSON.parse(text);
  const candidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) throw new Error("Empty response from vision model");
  let parsed = null;
  try {
    parsed = JSON.parse(candidate);
  } catch (err) {
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
    image_prompt: parsed.image_prompt ?? `${productName} product photo`
  };
}

// segmentation model should return a base64 PNG mask (single channel white = product, black = bg)
async function callSegmentationModel(imageDataUri) {
  if (!SEGMENT_MODEL) throw new Error("SEGMENT_MODEL_NAME not configured");
  const accessToken = await getAccessToken();
  const imageBase64 = imageDataUri.replace(/^data:image\/\w+;base64,/, "");

  const url = buildModelPredictUrl(SEGMENT_MODEL, "predict");
  // The exact predict body depends on your model container; we try a commonly-used shape:
  const body = {
    instances: [
      {
        image: { imageBytes: imageBase64 },
        params: { outputMask: true }
      }
    ],
    parameters: {}
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Segmentation request failed:", resp.status, text);
    throw new Error(`Segmentation failed: ${text}`);
  }

  const json = JSON.parse(text);
  // Support various response shapes:
  const maskB64 = json.predictions?.[0]?.maskBytesBase64 || json.predictions?.[0]?.mask || json.predictions?.[0]?.mask_base64;
  if (!maskB64) {
    // try candidate path (like vision generateContent)
    const candidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate && candidate.startsWith("data:image")) return candidate;
    throw new Error("Segmentation model returned no mask");
  }
  return `data:image/png;base64,${maskB64}`;
}

/**
 * callInpaintModel: runs an inpainting / masked edit that only edits background.
 * - imageDataUri: data URI
 * - maskDataUri: PNG mask where product=white(255), bg=black(0)
 * - prompt: textual prompt instructing background style
 * returns array of data URIs
 */
async function callInpaintModel(imageDataUri, maskDataUri, prompt, count = 1) {
  if (!INPAINT_MODEL) throw new Error("INPAINT_MODEL_NAME not configured");
  const accessToken = await getAccessToken();

  const imageBase64 = imageDataUri.replace(/^data:image\/\w+;base64,/, "");
  const maskBase64 = maskDataUri.replace(/^data:image\/\w+;base64,/, "");

  const url = buildModelPredictUrl(INPAINT_MODEL, "predict");

  const body = {
    instances: [
      {
        image: { imageBytes: imageBase64 },
        mask: { imageBytes: maskBase64 },
        prompt: prompt
      }
    ],
    parameters: {
      sampleCount: count,
      guidanceScale: 7.5
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Inpaint request failed:", resp.status, text);
    throw new Error(`Inpainting failed: ${text}`);
  }

  const json = JSON.parse(text);
  const preds = json.predictions || json.predictions?.[0]?.outputs || json.predictions?.[0]?.images || [];
  const b64s = preds
    .map(p => p.imageBytesBase64 ?? p.bytesBase64Encoded ?? p.data ?? p.image ?? p.output ?? null)
    .filter(Boolean);

  return b64s.map(b => (b.startsWith("data:image") ? b : `data:image/png;base64,${b}`));
}

async function callSRModel(imageDataUri) {
  if (!SR_MODEL) throw new Error("SR_MODEL_NAME not configured");
  const accessToken = await getAccessToken();
  const imageBase64 = imageDataUri.replace(/^data:image\/\w+;base64,/, "");

  const url = buildModelPredictUrl(SR_MODEL, "predict");
  const body = {
    instances: [{ image: { imageBytes: imageBase64 } }],
    parameters: {}
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("SR request failed:", resp.status, text);
    throw new Error(`SR failed: ${text}`);
  }
  const json = JSON.parse(text);
  const b64 = json.predictions?.[0]?.imageBytesBase64 || json.predictions?.[0]?.data || json.predictions?.[0]?.image || null;
  if (!b64) throw new Error("SR model returned nothing");
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
}

// Composite / fidelity / upload helpers (unchanged logic)
async function compositeProductOntoBackground(originalDataUri, maskDataUri, editedBackgroundDataUri) {
  const origBuffer = dataUriToBuffer(originalDataUri);
  const maskBuffer = dataUriToBuffer(maskDataUri);
  const bgBuffer = dataUriToBuffer(editedBackgroundDataUri);

  const origMeta = await sharp(origBuffer).metadata();
  const bgResized = await sharp(bgBuffer).resize(origMeta.width, origMeta.height, { fit: "cover" }).toBuffer();

  const productOnly = await sharp(origBuffer)
    .joinChannel(maskBuffer)
    .png()
    .toBuffer();

  const maskAlpha = await sharp(maskBuffer).ensureAlpha().resize(origMeta.width, origMeta.height).toBuffer();
  const shadow = await sharp(maskAlpha)
    .removeAlpha()
    .negate()
    .blur(20)
    .linear(0.6, -60)
    .toBuffer();

  const composed = await sharp(bgResized)
    .composite([
      { input: shadow, blend: "over" },
      { input: productOnly, blend: "over" }
    ])
    .png()
    .toBuffer();

  return composed;
}

async function runFidelityChecks(originalDataUri, maskDataUri, finalBuffer) {
  try {
    const origBuf = dataUriToBuffer(originalDataUri);
    const maskBuf = dataUriToBuffer(maskDataUri);

    const targetW = 512;

    const origImg = sharp(origBuf).resize(targetW, null, { fit: "inside" }).png();
    const finalImg = sharp(finalBuffer).resize(targetW, null, { fit: "inside" }).png();
    const maskImg = sharp(maskBuf).resize(targetW, null, { fit: "inside" }).threshold(128).png();

    const [origRaw, finalRaw, maskRaw] = await Promise.all([
      origImg.raw().toBuffer({ resolveWithObject: true }),
      finalImg.raw().toBuffer({ resolveWithObject: true }),
      maskImg.raw().toBuffer({ resolveWithObject: true })
    ]);

    const origPixels = origRaw.data;
    const finalPixels = finalRaw.data;
    const maskPixels = maskRaw.data;
    const channels = origRaw.info.channels;

    let sse = 0;
    let count = 0;
    let totalColorDelta = 0;
    for (let i = 0, p = 0; i < maskPixels.length; i += maskRaw.info.channels, p += channels) {
      const maskVal = maskPixels[i];
      if (maskVal > 128) {
        for (let c = 0; c < 3; c++) {
          const d = origPixels[p + c] - finalPixels[p + c];
          sse += d * d;
        }
        const avgOrig = (origPixels[p] + origPixels[p + 1] + origPixels[p + 2]) / 3;
        const avgFinal = (finalPixels[p] + finalPixels[p + 1] + finalPixels[p + 2]) / 3;
        totalColorDelta += Math.abs(avgOrig - avgFinal);
        count++;
      }
    }

    if (count === 0) {
      console.warn("Mask contained no product pixels for fidelity check - treating as fail");
      return false;
    }

    const mse = sse / (count * 3);
    const psnr = 10 * Math.log10((255 * 255) / (mse + 1e-12));
    const avgColorDelta = totalColorDelta / count;

    console.log("Fidelity metrics:", { mse, psnr, avgColorDelta });

    if (psnr < MIN_PSNR) {
      console.warn("PSNR below threshold", psnr, MIN_PSNR);
      return false;
    }
    if (mse > MAX_MSE) {
      console.warn("MSE above threshold", mse, MAX_MSE);
      return false;
    }
    if (avgColorDelta > MAX_COLOR_DELTA) {
      console.warn("Color delta above threshold", avgColorDelta, MAX_COLOR_DELTA);
      return false;
    }

    return true;
  } catch (err) {
    console.error("runFidelityChecks failed:", err && err.stack ? err.stack : String(err));
    return false;
  }
}

async function uploadBufferToSupabase(buffer, path) {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: "image/png",
    upsert: false
  });
  if (error) {
    console.error("Supabase upload error", error);
    throw new Error("Supabase upload failed");
  }
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}

function dataUriToBuffer(dataUri) {
  const m = (dataUri || "").match(/^data:(image\/\w+);base64,(.*)$/);
  if (!m) throw new Error("Invalid data URI");
  return Buffer.from(m[2], "base64");
}

async function uploadBase64ToSupabase(base64OrDataUri, pathFilename) {
  let base64 = base64OrDataUri;
  let ext = "png";
  const m = (base64OrDataUri || "").match(/^data:image\/(\w+);base64,(.*)$/);
  if (m) {
    ext = m[1] === "jpeg" ? "jpg" : m[1];
    base64 = m[2];
  }
  const buffer = Buffer.from(base64, "base64");
  const path = `${pathFilename}.${ext}`;
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: `image/${ext}`,
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
