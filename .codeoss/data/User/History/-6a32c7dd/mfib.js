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
const VISION_MODEL = process.env.VISION_MODEL_NAME; // e.g. "gemini-1.0-pro-vision"
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME || process.env.IMAGE_MODEL; // e.g. "imagegeneration@006"
const INPAINT_MODEL = process.env.INPAINT_MODEL_NAME || "imageinpainting@002";
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 4), 4);
const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

// --------- runtime guards ----------
const missing = [];
if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!PROJECT_ID) missing.push("VERTEX_PROJECT_ID");
if (!VISION_MODEL) missing.push("VISION_MODEL_NAME");
if (!IMAGE_MODEL) missing.push("IMAGE_MODEL_NAME");
if (!WORKER_SECRET) missing.push("WORKER_SHARED_SECRET");

if (missing.length) {
  console.error("⚠ Missing required env vars:", missing.join(", "));
}

// --------- clients ----------
let supabase = null;
try {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log("✅ Supabase client ready");
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
  n = Number(n) || 1;
  return Math.max(1, Math.min(4, n));
}

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

// Generic call to Publisher models (predict)
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
    console.error(`❌ Model ${publisherModelId} predict failed: ${resp.status} ${text}`);
    throw new Error(`Model ${publisherModelId} predict failed: ${resp.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// Vision model call
async function callVisionGenerate(imageUrl, productName) {
  const accessToken = await getAccessToken();
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${encodeURIComponent(VISION_MODEL)}:generateContent`;

  const imageResp = await fetch(imageUrl);
  if (!imageResp.ok) throw new Error(`Failed fetch image ${imageUrl}: ${imageResp.status}`);
  const imageBuf = Buffer.from(await imageResp.arrayBuffer());
  const imageBase64 = imageBuf.toString("base64");

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are an assistant that extracts product metadata from an image.
Return JSON only with: product_name, category, description, price, stock, image_prompt.
Use product name: "${productName}".`
          },
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
  if (!resp.ok) throw new Error(`Vision model failed: ${resp.status} ${text}`);

  const parsed = tryParseJson(text);
  if (!parsed) throw new Error("Unable to parse vision model output as JSON");

  return {
    product_name: parsed.product_name ?? productName,
    category: parsed.category ?? "Other",
    description: parsed.description ?? "",
    price: parsed.price ?? 0,
    stock: parsed.stock ?? 0,
    image_prompt: parsed.image_prompt ?? `${productName} product photo`
  };
}

// Text-to-Image
async function callTextToImage(prompt, count = 1) {
  const body = {
    instances: [{ prompt }],
    parameters: { sampleCount: clampSamples(count), aspectRatio: "1:1", temperature: 0.7 }
  };
  const json = await callPredictModel(IMAGE_MODEL, body);
  const candidates = [];

  if (Array.isArray(json.predictions)) {
    for (const p of json.predictions) {
      if (p.bytesBase64Encoded) candidates.push(`data:image/png;base64,${p.bytesBase64Encoded}`);
      else if (p.image) candidates.push(p.image.startsWith("data:") ? p.image : `data:image/png;base64,${p.image}`);
    }
  }
  return candidates;
}

// Image-to-Image Enhance
async function callImageToImageEnhance(imageDataUri, prompt, count = 1) {
  const rawBase64 = imageDataUri.replace(/^data:image\/\w+;base64,/, "");
  const body = {
    instances: [{ prompt, image: { bytesBase64Encoded: rawBase64 } }],
    parameters: { sampleCount: clampSamples(count), aspectRatio: "1:1", temperature: 0.6, guidanceScale: 5.0 }
  };
  const json = await callPredictModel(IMAGE_MODEL, body);
  return json.predictions?.map(p => `data:image/png;base64,${p.bytesBase64Encoded}`) ?? [];
}

// Inpainting
async function callInpaintModel(imageDataUri, prompt, count = 1) {
  const rawImage = imageDataUri.replace(/^data:image\/\w+;base64,/, "");
  const body = {
    instances: [{ image: { imageBytes: rawImage }, prompt }],
    parameters: { sampleCount: clampSamples(count), guidanceScale: 6.5 }
  };
  const json = await callPredictModel(INPAINT_MODEL, body);
  return json.predictions?.map(p => `data:image/png;base64,${p.bytesBase64Encoded}`) ?? [];
}

// Supabase upload
async function uploadBase64ToSupabase(dataUri, pathFilename) {
  if (!supabase) throw new Error("Supabase not initialized");
  const m = dataUri.match(/^data:image\/(\w+);base64,(.*)$/);
  if (!m) throw new Error("Invalid data URI");
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const buffer = Buffer.from(m[2], "base64");
  const path = `${pathFilename}.${ext}`;

  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, buffer, {
    contentType: `image/${ext}`,
    upsert: false
  });

  if (error) throw new Error("Supabase upload failed: " + JSON.stringify(error));
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}

// --------- Routes ----------
app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

app.post("/orchestrate", async (req, res) => {
  try {
    if (req.header("x-worker-secret") !== WORKER_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }
    if (!supabase) return res.status(500).json({ error: "server_not_ready" });

    const { image_url, product_name, maker_id } = req.body || {};
    if (!product_name) return res.status(400).json({ error: "product_name required" });

    let vision = {
      product_name,
      category: "Other",
      description: "",
      price: 0,
      stock: 0,
      image_prompt: `${product_name} product photo`
    };

    try {
      if (image_url) vision = await callVisionGenerate(image_url, product_name);
    } catch (e) {
      console.warn("Vision failed:", e.message);
    }

    const basePrompt = vision.image_prompt;
    const textVariants = await callTextToImage(basePrompt, MAX_IMAGES).catch(() => []);
    const enhancedVariants = image_url
      ? await callImageToImageEnhance(
          `data:image/jpeg;base64,${Buffer.from(await (await fetch(image_url)).arrayBuffer()).toString("base64")}`,
          "Enhance product photo: keep product identical, improve clarity, correct color and lighting, produce studio background suitable for ecommerce.",
          Math.min(2, MAX_IMAGES)
        ).catch(() => [])
      : [];

    const inpaintedVariants = enhancedVariants.length
      ? await callInpaintModel(enhancedVariants[0], "Replace background with a clean studio white background. Keep product unchanged.", 1).catch(() => [])
      : [];

    const allCandidates = [...enhancedVariants, ...inpaintedVariants, ...textVariants];
    const uploadedUrls = [];

    for (let i = 0; i < Math.min(allCandidates.length, 4); i++) {
      const filename = `generated/${maker_id || "anon"}/${Date.now()}_${i}`;
      try {
        uploadedUrls.push(await uploadBase64ToSupabase(allCandidates[i], filename));
      } catch (e) {
        console.warn("Upload failed:", e.message);
      }
    }

    if (!uploadedUrls.length) {
      return res.status(502).json({ error: "no_images_generated", vision });
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
    console.error("Fatal error:", err);
    return res.status(500).json({ error: "orchestration_failed", details: err.message });
  }
});

// --------- graceful shutdown ----------
const server = app.listen(PORT, () => {
  console.log(`✅ vendor-ai-worker listening on port ${PORT}`);
});
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
