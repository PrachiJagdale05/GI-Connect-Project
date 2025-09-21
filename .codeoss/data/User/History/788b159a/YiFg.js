// index.js - Cloud Run worker (image-to-image, no mask)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// --- Required env names (strict) ---
const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generated-images";
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME;    // Gemini vision model (multimodal)
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME;      // Image-to-image model (publisher model id)
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 5), 5);
const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

// Fail fast if required envs missing
const missing = [];
if (!WORKER_SECRET) missing.push("WORKER_SHARED_SECRET");
if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!PROJECT_ID) missing.push("VERTEX_PROJECT_ID / GCP_PROJECT");
if (!VISION_MODEL) missing.push("VISION_MODEL_NAME");
if (!IMAGE_MODEL) missing.push("IMAGE_MODEL_NAME");
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  // Do not exit - but log loudly. Cloud Run will show logs and you can fix envs.
}

const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE_KEY || "");

// Google auth to call Vertex REST APIs
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token || tokenResponse?.access_token;
  if (!token) throw new Error("Unable to obtain access token for Vertex API");
  return token;
}

/* ---------------------------
   Helpers
   --------------------------- */

// call Gemini Vision (multimodal) to get structured JSON suggestions
async function callVisionModel(imageUrl, productName) {
  if (!VISION_MODEL) throw new Error("VISION_MODEL_NAME not configured");

  const accessToken = await getAccessToken();

  // Build a concise instruction to output JSON only.
  const promptText = `
You are an assistant that extracts product metadata from an image and product name.
Return JSON ONLY containing keys:
product_name, category, description, price, stock, image_prompt.
Base values on the image and the product name: "${productName}".
`;

  // Use generateContent endpoint for multimodal (Gemini) models (publisher path)
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${encodeURIComponent(
    VISION_MODEL
  )}:generateContent`;

  // fetch image bytes, convert to base64 and send as inlineData
  const imageBase64 = await fetch(imageUrl)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch image for vision: ${r.status}`);
      return r.arrayBuffer();
    })
    .then(buf => Buffer.from(buf).toString("base64"));

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
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Vision model failed:", resp.status, text);
    throw new Error("Vision model request failed: " + text);
  }

  // parse model response: candidate text should be JSON
  let parsed;
  try {
    const json = JSON.parse(text);
    const candidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    parsed = candidate ? JSON.parse(candidate) : (json?.predictions?.[0] ?? json);
  } catch (err) {
    // Try to extract JSON substring if model wrapped text
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch (err2) {
      parsed = null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    console.warn("Vision parse failed, returning fallback:", text);
    return {
      product_name: productName,
      category: "Other",
      description: "",
      price: 0,
      stock: 0,
      image_prompt: productName
    };
  }

  return {
    product_name: parsed.product_name ?? productName,
    category: parsed.category ?? parsed.category_name ?? "Other",
    description: parsed.description ?? parsed.desc ?? "",
    price: parsed.price ?? Number(parsed.estimated_price) ?? 0,
    stock: parsed.stock ?? parsed.stock_count ?? 0,
    image_prompt: parsed.image_prompt ?? parsed.image_prompt_text ?? (productName + " product photo"),
  };
}

/**
 * Image-to-image generation (no mask)
 * - Sends image bytes + prompt to the image model.
 * - Many publisher image models accept `:predict` with instances containing image bytes + prompt.
 * - We ask the model to preserve the product and only improve background/lighting/colors.
 */
async function callImageGeneration(prompt, sourceImageUrl, count = 1) {
  if (!IMAGE_MODEL) throw new Error("IMAGE_MODEL_NAME not configured");

  const accessToken = await getAccessToken();

  // Fetch original image bytes and base64 encode
  const imageBase64 = await fetch(sourceImageUrl)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch source image for image-gen: ${r.status}`);
      return r.arrayBuffer();
    })
    .then(buf => Buffer.from(buf).toString("base64"));

  // Compose a stricter prompt instructing the model to keep the product identical
  const strictPrompt = `${prompt}
Enhance the supplied image (preserve the product/object exactly). Only make improvements to lighting, color balance, background cleaning, and minor styling. Do NOT replace or re-imagine the product. Output photorealistic images that maintain the original product pose and shape.`;

  // Endpoint: generic predict on the model
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/models/${encodeURIComponent(
    IMAGE_MODEL
  )}:predict`;

  // Many Vertex image publisher models accept `instances` where `image` contains bytes and `prompt` is provided.
  const instances = [];
  for (let i = 0; i < count; i++) {
    instances.push({
      // field names may vary by model; this is a common accepted shape
      image: { bytesBase64Encoded: imageBase64 },
      prompt: strictPrompt
    });
  }

  const body = {
    instances,
    parameters: {
      // model-specific params
      sampleCount: 1,       // we request one sample per instance; we create `count` instances instead
      guidanceScale: 7.0,
      // you can add resolution or other model-specific params if supported
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
    console.error("Image gen failed:", resp.status, text);
    throw new Error("Image generation failed: " + text);
  }

  // Parse the response - try common shapes: predictions[].bytesBase64Encoded or predictions[].image or
  // predictions[].content.parts... Adjust here if your model returns different fields.
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    console.warn("Image gen returned non-JSON:", text);
    throw new Error("Image generation returned non-JSON response");
  }

  // Try to extract base64 image bytes
  const out = [];
  // Common: json.predictions is an array where each item may have bytesBase64Encoded
  if (Array.isArray(json.predictions)) {
    for (const p of json.predictions) {
      // model might return bytesBase64Encoded or bytes or image or content.parts...
      if (p.bytesBase64Encoded) out.push(`data:image/png;base64,${p.bytesBase64Encoded}`);
      else if (p.imageBytesBase64) out.push(`data:image/png;base64,${p.imageBytesBase64}`);
      else if (p.image) {
        // sometimes image is { bytesBase64Encoded }
        if (typeof p.image === "string" && p.image.startsWith("data:image")) out.push(p.image);
        else if (p.image.bytesBase64Encoded) out.push(`data:image/png;base64,${p.image.bytesBase64Encoded}`);
      } else if (typeof p === "string" && p.startsWith("data:image")) out.push(p);
      else {
        // attempt to find base64 substring
        const m = JSON.stringify(p).match(/([A-Za-z0-9+/=]{200,})/);
        if (m) out.push(`data:image/png;base64,${m[1]}`);
      }
    }
  } else {
    // fallback: inspect top-level fields
    if (json.bytesBase64Encoded) out.push(`data:image/png;base64,${json.bytesBase64Encoded}`);
  }

  // Deduplicate and slice to requested count
  const unique = Array.from(new Set(out)).slice(0, count);
  if (unique.length === 0) {
    console.warn("No images extracted from image-gen response:", JSON.stringify(json).slice(0, 2000));
    throw new Error("Image generation produced no usable images");
  }
  return unique;
}

// Upload data-URI or base64 to Supabase storage and return public URL
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
    throw new Error("Supabase upload failed: " + JSON.stringify(error));
  }
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}

/* ---------------------------
   Routes
   --------------------------- */

// Health
app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

// Orchestration route
app.post("/orchestrate", async (req, res) => {
  try {
    const incoming = req.header("x-worker-secret");
    if (!incoming || incoming !== WORKER_SECRET) {
      console.warn("Invalid or missing x-worker-secret header");
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!supabase) {
      console.error("Supabase client not initialized.");
      return res.status(500).json({ error: "server_not_ready" });
    }

    const { image_url: imageUrl, product_name: productName, maker_id } = req.body || {};
    if (!imageUrl || !productName) {
      return res.status(400).json({ error: "missing image_url or product_name" });
    }

    console.log("Orchestration started for:", productName);

    // 1) Vision -> suggestions
    const visionResult = await callVisionModel(imageUrl, productName);
    console.log("Vision result:", visionResult);

    // 2) Image-to-image generation (no mask)
    const prompt = visionResult.image_prompt || `${visionResult.product_name} product photo`;
    const rawImages = await callImageGeneration(prompt, imageUrl, Math.min(MAX_IMAGES, 5));
    console.log(`Image generation returned ${rawImages.length} images`);

    // 3) Upload generated images to Supabase storage
    const generatedUrls = [];
    for (let i = 0; i < rawImages.length; i++) {
      try {
        const url = await uploadBase64ToSupabase(rawImages[i], `generated/${maker_id || "anon"}/${Date.now()}_${i}`);
        generatedUrls.push(url);
      } catch (err) {
        console.warn("Upload failed for generated image", i, err);
      }
    }

    // 4) Final payload
    const payload = {
      product_name: visionResult.product_name,
      category: visionResult.category,
      description: visionResult.description,
      price: Number(visionResult.price) || 0,
      stock: Number(visionResult.stock) || 0,
      generated_images: generatedUrls,
    };

    console.log("Orchestration finished:", payload);
    return res.json(payload);
  } catch (err) {
    console.error("Orchestration error:", err);
    return res.status(500).json({ error: "orchestration_failed", details: String(err?.message || err) });
  }
});

/* ---------------------------
   Start server (already listening above) and graceful shutdown
   --------------------------- */
process.on("SIGTERM", () => {
  console.info("SIGTERM received, closing server");
  server.close(() => process.exit(0));
});
// index.js - Cloud Run worker (image-to-image, no mask)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// --- Required env names (strict) ---
const PORT = Number(process.env.PORT || 8080);
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "generated-images";
const PROJECT_ID = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCP_PROJECT_ID;
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const VISION_MODEL = process.env.VISION_MODEL_NAME;    // Gemini vision model (multimodal)
const IMAGE_MODEL = process.env.IMAGE_MODEL_NAME;      // Image-to-image model (publisher model id)
const MAX_IMAGES = Math.min(Number(process.env.MAX_GENERATED_IMAGES || 5), 5);
const REGION_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

// Fail fast if required envs missing
const missing = [];
if (!WORKER_SECRET) missing.push("WORKER_SHARED_SECRET");
if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!PROJECT_ID) missing.push("VERTEX_PROJECT_ID / GCP_PROJECT");
if (!VISION_MODEL) missing.push("VISION_MODEL_NAME");
if (!IMAGE_MODEL) missing.push("IMAGE_MODEL_NAME");
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  // Do not exit - but log loudly. Cloud Run will show logs and you can fix envs.
}

const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE_KEY || "");

// Google auth to call Vertex REST APIs
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function getAccessToken() {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token || tokenResponse?.access_token;
  if (!token) throw new Error("Unable to obtain access token for Vertex API");
  return token;
}

/* ---------------------------
   Helpers
   --------------------------- */

// call Gemini Vision (multimodal) to get structured JSON suggestions
async function callVisionModel(imageUrl, productName) {
  if (!VISION_MODEL) throw new Error("VISION_MODEL_NAME not configured");

  const accessToken = await getAccessToken();

  // Build a concise instruction to output JSON only.
  const promptText = `
You are an assistant that extracts product metadata from an image and product name.
Return JSON ONLY containing keys:
product_name, category, description, price, stock, image_prompt.
Base values on the image and the product name: "${productName}".
`;

  // Use generateContent endpoint for multimodal (Gemini) models (publisher path)
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${encodeURIComponent(
    VISION_MODEL
  )}:generateContent`;

  // fetch image bytes, convert to base64 and send as inlineData
  const imageBase64 = await fetch(imageUrl)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch image for vision: ${r.status}`);
      return r.arrayBuffer();
    })
    .then(buf => Buffer.from(buf).toString("base64"));

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
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    console.error("Vision model failed:", resp.status, text);
    throw new Error("Vision model request failed: " + text);
  }

  // parse model response: candidate text should be JSON
  let parsed;
  try {
    const json = JSON.parse(text);
    const candidate = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    parsed = candidate ? JSON.parse(candidate) : (json?.predictions?.[0] ?? json);
  } catch (err) {
    // Try to extract JSON substring if model wrapped text
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch (err2) {
      parsed = null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    console.warn("Vision parse failed, returning fallback:", text);
    return {
      product_name: productName,
      category: "Other",
      description: "",
      price: 0,
      stock: 0,
      image_prompt: productName
    };
  }

  return {
    product_name: parsed.product_name ?? productName,
    category: parsed.category ?? parsed.category_name ?? "Other",
    description: parsed.description ?? parsed.desc ?? "",
    price: parsed.price ?? Number(parsed.estimated_price) ?? 0,
    stock: parsed.stock ?? parsed.stock_count ?? 0,
    image_prompt: parsed.image_prompt ?? parsed.image_prompt_text ?? (productName + " product photo"),
  };
}

/**
 * Image-to-image generation (no mask)
 * - Sends image bytes + prompt to the image model.
 * - Many publisher image models accept `:predict` with instances containing image bytes + prompt.
 * - We ask the model to preserve the product and only improve background/lighting/colors.
 */
async function callImageGeneration(prompt, sourceImageUrl, count = 1) {
  if (!IMAGE_MODEL) throw new Error("IMAGE_MODEL_NAME not configured");

  const accessToken = await getAccessToken();

  // Fetch original image bytes and base64 encode
  const imageBase64 = await fetch(sourceImageUrl)
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch source image for image-gen: ${r.status}`);
      return r.arrayBuffer();
    })
    .then(buf => Buffer.from(buf).toString("base64"));

  // Compose a stricter prompt instructing the model to keep the product identical
  const strictPrompt = `${prompt}
Enhance the supplied image (preserve the product/object exactly). Only make improvements to lighting, color balance, background cleaning, and minor styling. Do NOT replace or re-imagine the product. Output photorealistic images that maintain the original product pose and shape.`;

  // Endpoint: generic predict on the model
  const url = `${REGION_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}/models/${encodeURIComponent(
    IMAGE_MODEL
  )}:predict`;

  // Many Vertex image publisher models accept `instances` where `image` contains bytes and `prompt` is provided.
  const instances = [];
  for (let i = 0; i < count; i++) {
    instances.push({
      // field names may vary by model; this is a common accepted shape
      image: { bytesBase64Encoded: imageBase64 },
      prompt: strictPrompt
    });
  }

  const body = {
    instances,
    parameters: {
      // model-specific params
      sampleCount: 1,       // we request one sample per instance; we create `count` instances instead
      guidanceScale: 7.0,
      // you can add resolution or other model-specific params if supported
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
    console.error("Image gen failed:", resp.status, text);
    throw new Error("Image generation failed: " + text);
  }

  // Parse the response - try common shapes: predictions[].bytesBase64Encoded or predictions[].image or
  // predictions[].content.parts... Adjust here if your model returns different fields.
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    console.warn("Image gen returned non-JSON:", text);
    throw new Error("Image generation returned non-JSON response");
  }

  // Try to extract base64 image bytes
  const out = [];
  // Common: json.predictions is an array where each item may have bytesBase64Encoded
  if (Array.isArray(json.predictions)) {
    for (const p of json.predictions) {
      // model might return bytesBase64Encoded or bytes or image or content.parts...
      if (p.bytesBase64Encoded) out.push(`data:image/png;base64,${p.bytesBase64Encoded}`);
      else if (p.imageBytesBase64) out.push(`data:image/png;base64,${p.imageBytesBase64}`);
      else if (p.image) {
        // sometimes image is { bytesBase64Encoded }
        if (typeof p.image === "string" && p.image.startsWith("data:image")) out.push(p.image);
        else if (p.image.bytesBase64Encoded) out.push(`data:image/png;base64,${p.image.bytesBase64Encoded}`);
      } else if (typeof p === "string" && p.startsWith("data:image")) out.push(p);
      else {
        // attempt to find base64 substring
        const m = JSON.stringify(p).match(/([A-Za-z0-9+/=]{200,})/);
        if (m) out.push(`data:image/png;base64,${m[1]}`);
      }
    }
  } else {
    // fallback: inspect top-level fields
    if (json.bytesBase64Encoded) out.push(`data:image/png;base64,${json.bytesBase64Encoded}`);
  }

  // Deduplicate and slice to requested count
  const unique = Array.from(new Set(out)).slice(0, count);
  if (unique.length === 0) {
    console.warn("No images extracted from image-gen response:", JSON.stringify(json).slice(0, 2000));
    throw new Error("Image generation produced no usable images");
  }
  return unique;
}

// Upload data-URI or base64 to Supabase storage and return public URL
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
    throw new Error("Supabase upload failed: " + JSON.stringify(error));
  }
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}

/* ---------------------------
   Routes
   --------------------------- */

// Health
app.get("/", (req, res) => res.send("vendor-ai-worker is running 🚀"));

// Orchestration route
app.post("/orchestrate", async (req, res) => {
  try {
    const incoming = req.header("x-worker-secret");
    if (!incoming || incoming !== WORKER_SECRET) {
      console.warn("Invalid or missing x-worker-secret header");
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!supabase) {
      console.error("Supabase client not initialized.");
      return res.status(500).json({ error: "server_not_ready" });
    }

    const { image_url: imageUrl, product_name: productName, maker_id } = req.body || {};
    if (!imageUrl || !productName) {
      return res.status(400).json({ error: "missing image_url or product_name" });
    }

    console.log("Orchestration started for:", productName);

    // 1) Vision -> suggestions
    const visionResult = await callVisionModel(imageUrl, productName);
    console.log("Vision result:", visionResult);

    // 2) Image-to-image generation (no mask)
    const prompt = visionResult.image_prompt || `${visionResult.product_name} product photo`;
    const rawImages = await callImageGeneration(prompt, imageUrl, Math.min(MAX_IMAGES, 5));
    console.log(`Image generation returned ${rawImages.length} images`);

    // 3) Upload generated images to Supabase storage
    const generatedUrls = [];
    for (let i = 0; i < rawImages.length; i++) {
      try {
        const url = await uploadBase64ToSupabase(rawImages[i], `generated/${maker_id || "anon"}/${Date.now()}_${i}`);
        generatedUrls.push(url);
      } catch (err) {
        console.warn("Upload failed for generated image", i, err);
      }
    }

    // 4) Final payload
    const payload = {
      product_name: visionResult.product_name,
      category: visionResult.category,
      description: visionResult.description,
      price: Number(visionResult.price) || 0,
      stock: Number(visionResult.stock) || 0,
      generated_images: generatedUrls,
    };

    console.log("Orchestration finished:", payload);
    return res.json(payload);
  } catch (err) {
    console.error("Orchestration error:", err);
    return res.status(500).json({ error: "orchestration_failed", details: String(err?.message || err) });
  }
});

/* ---------------------------
   Start server (already listening above) and graceful shutdown
   --------------------------- */
process.on("SIGTERM", () => {
  console.info("SIGTERM received, closing server");
  server.close(() => process.exit(0));
});
