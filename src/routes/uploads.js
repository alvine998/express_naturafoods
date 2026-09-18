const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { isR2Configured, uploadToR2, deleteFromR2, getPublicUrl, parseKeyFromUrl } = require("../config/r2");

const router = express.Router();
router.use(authMiddleware);

// ensure upload dir exists for fallback
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_TYPES_MESSAGE = "Only image, video, and PDF files are allowed";

// Use memoryStorage so we can either upload to R2 or write to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max, but image check 10MB
  fileFilter: (req, file, cb) => {
    // accept image/*, video/*, and PDF
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/") || file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error(ALLOWED_TYPES_MESSAGE));
  },
});

function handleMulterError(err, req, res, next) {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: "File too large (max 10MB image, 20MB video)", status: 413 });
    if (err.message && err.message.includes(ALLOWED_TYPES_MESSAGE)) return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
  next();
}

// Try to load sharp for image processing (optional). If not installed, skip conversion.
let sharp = null;
try {
  sharp = require("sharp");
} catch (_) {
  // sharp not installed - image will be stored as-is
}

async function processImageBuffer(buffer, originalMime) {
  // If sharp available and is image, convert to webp 1600px max
  if (!sharp || !originalMime.startsWith("image/")) {
    return { buffer, contentType: originalMime, ext: originalMime.split("/")[1] || "bin" };
  }
  try {
    // SVG and GIF should not be forced to webp? Keep simple: convert all raster images to webp
    // For gif/svg, keep original
    if (originalMime === "image/svg+xml" || originalMime === "image/gif") {
      return { buffer, contentType: originalMime, ext: originalMime === "image/svg+xml" ? "svg" : "gif" };
    }
    const processed = await sharp(buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return { buffer: processed, contentType: "image/webp", ext: "webp" };
  } catch (e) {
    console.warn("[uploads] sharp processing failed, falling back to original:", e.message);
    return { buffer, contentType: originalMime, ext: originalMime.split("/")[1] || "bin" };
  }
}

async function storeFile({ buffer, originalname, mimetype, folder, size }) {
  const safeFolder = (folder || "general").replace(/[^a-z0-9-_]/gi, "") || "general";
  // image size limit 10MB, video 20MB (already enforced by multer, but check again after processing)
  if (mimetype.startsWith("image/") && size > 10 * 1024 * 1024) {
    throw Object.assign(new Error("Image must be <10MB"), { code: "PAYLOAD_TOO_LARGE", status: 413 });
  }
  if (size > 20 * 1024 * 1024) {
    throw Object.assign(new Error("File too large"), { code: "PAYLOAD_TOO_LARGE", status: 413 });
  }

  // Process image if possible
  let processed = { buffer, contentType: mimetype, ext: path.extname(originalname).replace(".", "") || mimetype.split("/")[1] || "bin" };
  if (mimetype.startsWith("image/")) {
    processed = await processImageBuffer(buffer, mimetype);
  } else {
    // for video, keep original ext
    processed.ext = path.extname(originalname).replace(".", "") || "mp4";
    processed.contentType = mimetype;
  }

  const ext = processed.ext;
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `${safeFolder}/${filename}`;

  if (isR2Configured) {
    // Upload to Cloudflare R2
    const url = await uploadToR2({
      buffer: processed.buffer,
      key,
      contentType: processed.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    });
    return { url, key, filename, contentType: processed.contentType, size: processed.buffer.length };
  } else {
    // Fallback to local disk
    const dir = path.join(uploadDir, safeFolder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, processed.buffer);
    const url = getPublicUrl(key); // will be http://localhost:4000/uploads/<key>
    return { url, key, filename, contentType: processed.contentType, size: processed.buffer.length };
  }
}

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return sendError(res, { code: "VALIDATION_ERROR", message: "file is required", status: 422 });
    const folder = req.body.folder || req.query.folder || "general";
    // req.file has buffer, originalname, mimetype, size
    const result = await storeFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      folder,
      size: req.file.size,
    });
    return sendSuccess(res, { url: result.url, key: result.key, originalName: req.file.originalname, size: result.size, mime: result.contentType }, null, 201);
  } catch (err) {
    if (err.status === 413) return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: err.message, status: 413 });
    if (err.code === "LIMIT_FILE_SIZE") return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: "File too large", status: 413 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// base64 fallback — also supports R2
router.post("/base64", async (req, res) => {
  try {
    const { dataUrl, folder } = req.body;
    if (!dataUrl || !dataUrl.startsWith("data:")) return sendError(res, { code: "VALIDATION_ERROR", message: "dataUrl is required", status: 422 });
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return sendError(res, { code: "VALIDATION_ERROR", message: "Invalid dataUrl", status: 422 });
    const mime = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    if (!mime.startsWith("image/") && !mime.startsWith("video/") && mime !== "application/pdf") return sendError(res, { code: "VALIDATION_ERROR", message: "Only image, video, and PDF are allowed", status: 422 });
    if (mime.startsWith("image/") && buffer.length > 10 * 1024 * 1024) return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: "Image must be <10MB", status: 413 });
    if (buffer.length > 20 * 1024 * 1024) return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: "File too large", status: 413 });

    const result = await storeFile({
      buffer,
      originalname: `upload.${mime.split("/")[1] || "bin"}`,
      mimetype: mime,
      folder: folder || "general",
      size: buffer.length,
    });

    return sendSuccess(res, { url: result.url, key: result.key, originalName: `upload.${result.contentType.split("/")[1]}`, size: result.size, mime: result.contentType }, null, 201);
  } catch (err) {
    if (err.status === 413) return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: err.message, status: 413 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

router.delete("/", async (req, res) => {
  try {
    const url = req.body?.url || req.query?.url || req.body?.key;
    const keyFromBody = req.body?.key;
    let key = keyFromBody || parseKeyFromUrl(url);
    if (!key) return sendError(res, { code: "VALIDATION_ERROR", message: "url or key is required", status: 422 });
    // Security: prevent path traversal
    if (key.includes("..")) return sendError(res, { code: "VALIDATION_ERROR", message: "Invalid key", status: 422 });

    if (isR2Configured) {
      try {
        await deleteFromR2(key);
      } catch (e) {
        // If R2 delete fails because object not found, treat as success (idempotent)
        if (!String(e.message).includes("NoSuchKey")) throw e;
      }
      // Also try to delete local fallback if exists (for migration period)
      const localPath = path.join(uploadDir, key);
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    } else {
      // Local fallback
      // key is like "products/xxx.webp" -> full path uploads/products/xxx.webp
      // Also handle legacy URL that included /uploads/ prefix - parseKeyFromUrl already stripped
      const filepath = path.join(uploadDir, key);
      if (!fs.existsSync(filepath)) {
        // try alternative: if key still contains uploads/ prefix
        const alt = path.join(uploadDir, url?.split("/uploads/")[1] || "");
        if (alt && fs.existsSync(alt)) fs.unlinkSync(alt);
        else return sendError(res, { code: "NOT_FOUND", message: "File not found", status: 404 });
      } else {
        fs.unlinkSync(filepath);
      }
    }
    return sendSuccess(res, { message: "Deleted", key });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = router;
