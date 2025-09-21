// index.js - vendor-ai-worker (Cloud Run friendly, ESM style)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";

// --------- App + basic middleware ----------
const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

console.log("vendor-ai-worker starting", {
  node: process.version,
  cwd: process.cwd(),
  preview_env: {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    VISION_MODEL_NAME: !!process.env.VISION_MODEL_NAME,
    IMAGE_MODEL_NAME: !!process.env.IMAGE_MODEL_NAME,
    WORKER_SHARED_SECRET: !!process.env.WORKER_SHARED_SECRET
  }
});

// --------- ENV (strict names) ----------
const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generated-images";
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME; // e.g. "gemini-2.0-flash-lite"
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME || process.env.IMAGE_MODEL; // e.g. "imagegeneration@006"
const INPAINT_MODEL = process.env.INPAINT_MODEL_NAME || "imageinpainting@002";
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 4), 4); // clamp to 4
const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

// --------- minimal runtime guards ----------
const missing = [];
if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!PROJECT_ID) missing.push("VERTEX_PROJECT_ID");
if (!VISION_MODEL) missing.push("VISION_MODEL_NAME");
if (!IMAGE_MODEL) missing.push("IMAGE_MODEL_NAME");
if (!WORKER_SECRET) missing.push("WORKER_SHARED_SECRET");

if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  // Continue starting but API calls return server_not_ready
}

// --------- clients ----------
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log("Supabase client ready");
  }
} catch (e) {
  console.error("Supabase init failed:", e);
}

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

// --------- helpers ----------
async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token || tokenResponse?.access_token;
  if (!token) throw new Error("Unable to obtain access token for Vertex AI");
  return token;
}

function clampSamples(n) {
  // many publisher models accept 1..4
  n = Number(n) || 1;
  if (n < 1) return 1;
  if (n > 4) return 4;
  return n;
}

// robust JSON parse fallback
function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    const m = (str || "").match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Uniform function to call Publisher models using predict (image gen / inpaint)
async function callPredictModel(publisherModelId, bodyObj) {
  const accessToken = await getAccessToken();
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${encodeURIComponent(publisherModelId)}:predict`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bodyObj)
  });
  const text = await resp.text();
  if (!resp.ok) {
    const msg = `Model ${publisherModelId} predict failed: ${resp.status} ${text}`;
    console.error(msg);
    throw new Error(msg);
  }
  // parse as JSON if possible
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// Call Gemini Vision (multimodal) via generateContent to analyze vendor image
async function callVisionGenerate(imageUrl, productName) {
  if (!VISION_MODEL) throw new Error("VISION_MODEL not configured");
  const accessToken = await getAccessToken();
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${encodeURIComponent(VISION_MODEL)}:generateContent`;

  // fetch image bytes and convert to base64 inline for better compatibility
  const imageResp = await fetch(imageUrl);
  if (!imageResp.ok) throw new Error(`Failed fetch image ${imageUrl}: ${imageResp.status}`);
  const imageBuf = Buffer.from(await imageResp.arrayBuffer());
  const imageBase64 = imageBuf.toString("base64");

  const promptText = `You are an assistant that extracts product metadata from an image.
Return a VALID JSON object only with keys:
product_name, category, description (1-2 sentences), price (approx number), stock (approx int), image_prompt (short prompt for generating images).
Use the provided image and the product name: "${productName}".
Return JSON only.`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText },
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
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
    console.error("Vision generate failed:", resp.status, text);
    throw new Error(`Vision model request failed: ${text}`);
  }

  const parsed = tryParseJson(text);
  if (!parsed) {
    // try candidate path
    try {
      const json = JSON.parse(text);
      const candidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidate) {
        const p = tryParseJson(candidate);
        if (p) return p;
      }
    } catch (e) {
      // ignore
    }
    throw new Error("Unable to parse vision model output as JSON");
  }

  // Normalize result and fallback defaults
  return {
    product_name: parsed.product_name ?? productName,
    category: parsed.category ?? parsed.category_name ?? "Other",
    description: parsed.description ?? parsed.desc ?? "",
    price: parsed.price ?? parsed.estimated_price ?? 0,
    stock: parsed.stock ?? parsed.stock_count ?? 0,
    image_prompt: parsed.image_prompt ?? (productName + " product photo")
  };
}

// Text-to-image (Imagen 006) using publisher predict
async function callTextToImage(prompt, sampleCount = 1) {
  if (!IMAGE_MODEL) throw new Error("IMAGE_MODEL not configured");
  const count = clampSamples(sampleCount);
  const body = {
    instances: [{ prompt }],
    parameters: { sampleCount: count, aspectRatio: "1:1", temperature: 0.7 }
  };
  const json = await callPredictModel(IMAGE_MODEL, body);

  // gather images from likely fields
  const candidates = [];
  if (Array.isArray(json.predictions)) {
    for (const p of json.predictions) {
      // bytesBase64Encoded or images array or image field
      if (p.bytesBase64Encoded) candidates.push(`data:image/png;base64,${p.bytesBase64Encoded}`);
      else if (Array.isArray(p.images) && p.images.length) candidates.push(...p.images.map(i => i.startsWith("data:") ? i : `data:image/png;base64,${i}`));
      else if (p.image) candidates.push(p.image.startsWith("data:") ? p.image : `data:image/png;base64,${p.image}`);
      else if (p.data) candidates.push(p.data.startsWith("data:") ? p.data : `data:image/png;base64,${p.data}`);
    }
  }
  // fallback: try to extract base64 blobs from raw
  if (!candidates.length && typeof json.raw === "string") {
    const matches = [...json.raw.matchAll(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/g)].map(m => m[0]);
    if (matches.length) candidates.push(...matches);
  }
  return candidates.slice(0, count);
}

// Image-to-image enhancement: use same image model but pass image bytes (edit/enhance)
async function callImageToImageEnhance(imageDataUri, prompt, sampleCount = 1) {
  if (!IMAGE_MODEL) throw new Error("IMAGE_MODEL not configured");
  const count = clampSamples(sampleCount);
  const rawBase64 = imageDataUri.replace(/^data:image\/\w+;base64,/, "");
  const body = {
    instances: [
      {
        prompt,
        image: { bytesBase64Encoded: rawBase64 }
      }
    ],
    parameters: { sampleCount: count, aspectRatio: "1:1", temperature: 0.6, guidanceScale: 5.0 }
  };

  const json = await callPredictModel(IMAGE_MODEL, body);

  const candidates = [];
  if (Array.isArray(json.predictions)) {
    for (const p of json.predictions) {
      if (p.bytesBase64Encoded) candidates.push(`data:image/png;base64,${p.bytesBase64Encoded}`);
      else if (p.image) candidates.push(p.image.startsWith("data:") ? p.image : `data:image/png;base64,${p.image}`);
      else if (p.data) candidates.push(p.data.startsWith("data:") ? p.data : `data:image/png;base64,${p.data}`);
    }
  }
  if (!candidates.length && typeof json.raw === "string") {
    const matches = [...json.raw.matchAll(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/g)].map(m => m[0]);
    if (matches.length) candidates.push(...matches);
  }
  return candidates.slice(0, count);
}

// Inpainting: use INPAINT_MODEL predict (mask optional). We'll call publisher inpaint if configured.
async function callInpaintModel(imageDataUri, maskDataUri = null, prompt = "", sampleCount = 1) {
  if (!INPAINT_MODEL) throw new Error("INPAINT_MODEL not configured");
  const count = clampSamples(sampleCount);
  const rawImage = imageDataUri.replace(/^data:image\/\w+;base64,/, "");
  const bodyInstance = {
    image: { imageBytes: rawImage },
    prompt
  };
  if (maskDataUri) {
    bodyInstance.mask = { imageBytes: maskDataUri.replace(/^data:image\/\w+;base64,/, "") };
  }
  const body = { instances: [bodyInstance], parameters: { sampleCount: count, guidanceScale: 6.5 } };
  const json = await callPredictModel(INPAINT_MODEL, body);

  const candidates = [];
  if (Array.isArray(json.predictions)) {
    for (const p of json.predictions) {
      if (p.bytesBase64Encoded) candidates.push(`data:image/png;base64,${p.bytesBase64Encoded}`);
      else if (p.image) candidates.push(p.image.startsWith("data:") ? p.image : `data:image/png;base64,${p.image}`);
      else if (p.data) candidates.push(p.data.startsWith("data:") ? p.data : `data:image/png;base64,${p.data}`);
    }
  }
  if (!candidates.length && typeof json.raw === "string") {
    const matches = [...json.raw.matchAll(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/g)].map(m => m[0]);
    if (matches.length) candidates.push(...matches);
  }
  return candidates.slice(0, count);
}

// Upload (buffer) to supabase storage and return public URL
async function uploadBase64ToSupabase(base64OrDataUri, pathFilename) {
  if (!supabase) throw new Error("Supabase not initialized");
  let base64 = base64OrDataUri;
  let ext = "png";
  const m = (base64OrDataUri || "").match(/^data:image\/(\w+);base64,(.*)$/);
  if (m) {
    ext = m[1] === "jpeg" ? "jpg" : m[1];
    base64 = m[2];
  }
  const buffer = Buffer.from(base64, "base64");
  const path = `${pathFilename}.${ext}`;

  // Upload (service role key required)
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: `image/${ext}`,
    upsert: false
  });

  if (error) {
    // If already exists, you may choose to overwrite or return public URL
    console.error("Supabase upload error:", error);
    throw new Error("Supabase upload failed: " + JSON.stringify(error));
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}

// Utility: normalize candidate (string or buffer) to data URI
function ensureDataUri(b) {
  if (!b) return null;
  if (typeof b !== "string") return null;
  if (b.startsWith("data:image/")) return b;
  // assume raw base64
  return `data:image/png;base64,${b}`;
}

// --------- Routes ----------
app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

app.post("/orchestrate", async (req, res) => {
  try {
    const incoming = req.header("x-worker-secret");
    if (!incoming || incoming !== WORKER_SECRET) {
      console.warn("Invalid x-worker-secret");
      return res.status(401).json({ error: "unauthorized" });
    }
    if (!supabase) {
      console.error("Supabase not ready");
      return res.status(500).json({ error: "server_not_ready" });
    }

    const { image_url: imageUrl, product_name: productName, maker_id } = req.body || {};
    if (!productName) return res.status(400).json({ error: "product_name required" });
    if (!imageUrl) {
      console.warn("No image_url provided — pipeline will still run text-to-image");
    }

    console.log("Start orchestration", { productName, imageUrl, maker_id });

    // ---------- 1) Vision analysis ----------
    let vision = {
      product_name: productName,
      category: "Other",
      description: "",
      price: 0,
      stock: 0,
      image_prompt: `${productName} product photo`
    };

    try {
      if (imageUrl) {
        vision = await callVisionGenerate(imageUrl, productName);
      } else {
        console.log("Skipping vision (no image_url). Using product_name fallback.");
      }
    } catch (err) {
      console.warn("Vision failed, falling back to defaults:", err.message);
      // continue with fallback vision
    }

    // ---------- 2) Text-to-image: generate base variations ----------
    const basePrompt = vision.image_prompt || `${vision.product_name} product photo`;
    let textVariants = [];
    try {
      textVariants = await callTextToImage(basePrompt, Math.min(MAX_IMAGES, 4));
      console.log("Text-to-image produced", textVariants.length);
    } catch (err) {
      console.error("Text-to-image error:", err);
      // proceed — we may still attempt enhancement if vendor image exists
      textVariants = [];
    }

    // ---------- 3) Image-to-image enhancement (if vendor image provided) ----------
    let enhancedVariants = [];
    if (imageUrl) {
      try {
        // fetch vendor image and convert to data URI
        const imgResp = await fetch(imageUrl);
        if (!imgResp.ok) throw new Error(`Failed to fetch vendor image ${imageUrl} status:${imgResp.status}`);
        const imgBuf = Buffer.from(await imgResp.arrayBuffer());
        const vendorDataUri = `data:image/jpeg;base64,${imgBuf.toString("base64")}`;

        // enhance and return up to 2 variants (kept small for cost/latency)
        enhancedVariants = await callImageToImageEnhance(vendorDataUri, `Enhance product photo: keep product identical, improve clarity, correct color and lighting, produce studio background suitable for ecommerce.`, Math.min(2, MAX_IMAGES));
        console.log("Enhancement produced", enhancedVariants.length);
      } catch (err) {
        console.warn("Image-to-image enhancement failed:", err.message);
        enhancedVariants = [];
      }
    }

    // ---------- 4) Optional inpainting (useful to clean background) ----------
    // We'll only call inpainting if enhancement produced images or vendor image exists.
    let inpaintedVariants = [];
    try {
      // choose source: prefer enhancedVariants[0] if available, else vendor image
      const imageForInpaint = enhancedVariants[0] || (imageUrl ? null : null);
      if (imageForInpaint) {
        // For simple flow we call inpaint without a mask to ask the model to "clean background".
        inpaintedVariants = await callInpaintModel(imageForInpaint, null, `Replace background with a clean studio white background. Keep product unchanged.`, 1);
        console.log("Inpainting produced", inpaintedVariants.length);
      } else if (imageUrl) {
        // if no enhanced variant but vendor image present, use vendor image for inpaint
        const resp = await fetch(imageUrl);
        if (resp.ok) {
          const b = Buffer.from(await resp.arrayBuffer()).toString("base64");
          const dataUri = `data:image/jpeg;base64,${b}`;
          inpaintedVariants = await callInpaintModel(dataUri, null, `Replace background with a clean studio white background. Keep product unchanged.`, 1);
        }
      }
    } catch (err) {
      console.warn("Inpainting failed:", err.message);
      inpaintedVariants = [];
    }

    // ---------- 5) Merge candidate pools and upload top up to 4 ----------
    const pool = [
      ...enhancedVariants,
      ...inpaintedVariants,
      ...textVariants
    ].map(ensureDataUri).filter(Boolean);

    // de-duplicate by base64 substring (simple)
    const seen = new Set();
    const unique = [];
    for (const d of pool) {
      const key = d.slice(0, 200); // first 200 chars
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(d);
      }
      if (unique.length >= 8) break; // keep a working set
    }

    // Upload up to 4 final variants
    const uploadedUrls = [];
    for (let i = 0; i < Math.min(unique.length, 4); i++) {
      const dataUri = unique[i];
      const filename = `generated/${maker_id || "anon"}/${Date.now()}_${i}`;
      try {
        const publicUrl = await uploadBase64ToSupabase(dataUri, filename);
        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.warn("Upload failed for variant", i, err && err.message ? err.message : err);
      }
    }

    // If nothing uploaded, return an error explaining why (but prefer to return partial)
    if (!uploadedUrls.length) {
      console.warn("No images uploaded - returning warning but include vision metadata");
      return res.status(502).json({
        error: "no_images_generated",
        details: "Models produced no images or uploads failed. See server logs.",
        vision,
      });
    }

    // --------- Response ----------
    const responsePayload = {
      product_name: vision.product_name,
      category: vision.category,
      description: vision.description,
      price: Number(vision.price) || 0,
      stock: Number(vision.stock) || 0,
      generated_images: uploadedUrls
    };

    console.log("Orchestration complete", { product: vision.product_name, generated: uploadedUrls.length });
    return res.json(responsePayload);

  } catch (err) {
    console.error("Orchestration fatal error:", err && err.stack ? err.stack : String(err));
    return res.status(500).json({ error: "orchestration_failed", details: String(err?.message || err) });
  }
});

// --------- graceful shutdown ----------
const server = app.listen(PORT, () => {
  console.log(`vendor-ai-worker listening on port ${PORT}`);
});
process.on("SIGTERM", () => {
  console.info("SIGTERM received, closing server");
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.info("SIGINT received, closing server");
  server.close(() => process.exit(0));
});
