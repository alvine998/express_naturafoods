const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");

const router = express.Router();
router.use(authMiddleware);

// ensure upload dir exists
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || req.query.folder || "general";
    const dir = path.join(uploadDir, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webp";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max, but image check 5MB
  fileFilter: (req, file, cb) => {
    // accept image/* and video/*
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only image and video files are allowed"));
  },
});

function handleMulterError(err, req, res, next) {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: "File too large (max 5MB image, 20MB video)", status: 413 });
    if (err.message && err.message.includes("Only image and video")) return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
  next();
}

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return sendError(res, { code: "VALIDATION_ERROR", message: "file is required", status: 422 });
    // image size limit 5MB, video 20MB
    if (req.file.mimetype.startsWith("image/") && req.file.size > 5 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: "Image must be <5MB", status: 413 });
    }
    const folder = req.body.folder || req.query.folder || "general";
    const baseUrl = process.env.CDN_URL || `http://localhost:${process.env.PORT || 4000}`;
    // In production CDN_URL should be https://cdn.naturafoods.co.id
    const url = `${baseUrl}/uploads/${folder}/${req.file.filename}`;
    return sendSuccess(res, { url, originalName: req.file.originalname, size: req.file.size, mime: req.file.mimetype }, null, 201);
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE") return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: "File too large", status: 413 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// base64 fallback
router.post("/base64", async (req, res) => {
  try {
    const { dataUrl, folder } = req.body;
    if (!dataUrl || !dataUrl.startsWith("data:")) return sendError(res, { code: "VALIDATION_ERROR", message: "dataUrl is required", status: 422 });
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return sendError(res, { code: "VALIDATION_ERROR", message: "Invalid dataUrl", status: 422 });
    const mime = matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    if (mime.startsWith("image/") && buffer.length > 5 * 1024 * 1024) return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: "Image must be <5MB", status: 413 });
    if (buffer.length > 20 * 1024 * 1024) return sendError(res, { code: "PAYLOAD_TOO_LARGE", message: "File too large", status: 413 });
    const dir = path.join(uploadDir, folder || "general");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ext = mime.split("/")[1] || "bin";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);
    const baseUrl = process.env.CDN_URL || `http://localhost:${process.env.PORT || 4000}`;
    const url = `${baseUrl}/uploads/${folder || "general"}/${filename}`;
    return sendSuccess(res, { url, originalName: `upload.${ext}`, size: buffer.length, mime }, null, 201);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

router.delete("/", async (req, res) => {
  try {
    const { url } = req.body || req.query;
    if (!url) return sendError(res, { code: "VALIDATION_ERROR", message: "url is required", status: 422 });
    // Only allow deletion of files under /uploads/
    if (!url.includes("/uploads/")) return sendError(res, { code: "VALIDATION_ERROR", message: "Invalid url", status: 422 });
    const relative = url.split("/uploads/")[1];
    if (!relative) return sendError(res, { code: "NOT_FOUND", message: "File not found", status: 404 });
    const filepath = path.join(uploadDir, relative);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    return sendSuccess(res, { message: "Deleted" });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = router;
