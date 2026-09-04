const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ENDPOINT = process.env.R2_ENDPOINT; // optional override e.g. https://xxx.r2.cloudflarestorage.com
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.CDN_URL; // e.g. https://cdn.naturafoods.co.id or https://xxx.r2.dev

const isR2Configured = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);

let s3Client = null;
if (isR2Configured) {
  const endpoint = R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  s3Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: false,
  });
  console.log(`[R2] Configured bucket=${R2_BUCKET} endpoint=${endpoint} publicUrl=${R2_PUBLIC_URL || "bucket.r2.dev"}`);
} else {
  console.log("[R2] Not configured — falling back to local disk storage (set R2_* in .env to enable Cloudflare R2)");
}

function getPublicUrl(key) {
  // key is like "products/abc.webp"
  // When R2 is configured, return public CDN URL; otherwise return local localhost URL
  if (isR2Configured) {
    const base = (R2_PUBLIC_URL || process.env.CDN_URL || "").replace(/\/$/, "");
    if (base) return `${base}/${key}`;
    // fallback to R2 dev url style if no public url set
    return `https://${R2_BUCKET}.r2.dev/${key}`;
  }
  // local fallback (disk storage)
  const port = process.env.PORT || 4000;
  return `http://localhost:${port}/uploads/${key}`;
}

async function uploadToR2({ buffer, key, contentType, cacheControl }) {
  if (!isR2Configured) throw new Error("R2 not configured");
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: cacheControl || "public, max-age=31536000, immutable",
  });
  await s3Client.send(cmd);
  return getPublicUrl(key);
}

async function deleteFromR2(key) {
  if (!isR2Configured) throw new Error("R2 not configured");
  const cmd = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  await s3Client.send(cmd);
}

function parseKeyFromUrl(url) {
  if (!url) return null;
  // handle both https://cdn.naturafoods.co.id/uploads/products/xxx.webp and http://localhost:4000/uploads/products/xxx.webp
  // and also https://cdn.naturafoods.co.id/products/xxx.webp (without /uploads prefix if using R2 direct)
  try {
    const u = new URL(url);
    let pathname = u.pathname.replace(/^\/+/, ""); // remove leading /
    // if pathname starts with uploads/, strip it to get key? But for R2, key includes folder directly.
    // We support both: if using local fallback, URL is /uploads/<key>; for R2, URL is <publicUrl>/<key> where key already includes folder.
    // So try to extract key as pathname without leading uploads/
    if (pathname.startsWith("uploads/")) pathname = pathname.slice("uploads/".length);
    return pathname || null;
  } catch {
    // url may not be valid URL (rare), fallback split
    if (url.includes("/uploads/")) return url.split("/uploads/")[1];
    return null;
  }
}

module.exports = {
  s3Client,
  isR2Configured,
  R2_BUCKET,
  R2_PUBLIC_URL,
  getPublicUrl,
  uploadToR2,
  deleteFromR2,
  parseKeyFromUrl,
};
