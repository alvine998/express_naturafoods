const express = require("express");
const { CompanySetting, DEFAULT_COMPANY_SETTING } = require("../models/CompanySetting");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

const SINGLETON_ID = "default";
const FIELDS = [
  "name",
  "logo",
  "description",
  "visi",
  "misi",
  "tagline",
  "email",
  "phone",
  "whatsapp",
  "address",
  "website",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "mapsUrl",
];
const ALIASES = { vision: "visi", mission: "misi" };

function extract(body = {}) {
  const out = {};
  for (const field of FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (body[alias] !== undefined && out[target] === undefined) out[target] = body[alias];
  }
  for (const key of Object.keys(out)) {
    if (typeof out[key] === "string") {
      const trimmed = out[key].trim();
      if (key !== "name" && trimmed === "") out[key] = null;
      else out[key] = trimmed;
    }
  }
  return out;
}

function serialize(setting) {
  const j = setting.toJSON();
  return {
    id: j.id,
    name: j.name,
    logo: j.logo ?? null,
    description: j.description ?? null,
    visi: j.visi ?? null,
    misi: j.misi ?? null,
    vision: j.visi ?? null,
    mission: j.misi ?? null,
    tagline: j.tagline ?? null,
    email: j.email ?? null,
    phone: j.phone ?? null,
    whatsapp: j.whatsapp ?? null,
    address: j.address ?? null,
    website: j.website ?? null,
    instagram: j.instagram ?? null,
    facebook: j.facebook ?? null,
    tiktok: j.tiktok ?? null,
    youtube: j.youtube ?? null,
    mapsUrl: j.mapsUrl ?? j.maps_url ?? null,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

async function getOrCreateDefault() {
  let setting = await CompanySetting.findByPk(SINGLETON_ID);
  if (!setting) {
    setting = await CompanySetting.create({ id: SINGLETON_ID, ...DEFAULT_COMPANY_SETTING });
  }
  return setting;
}

function hasInvalidName(data) {
  return data.name !== undefined && data.name === "";
}

function hasInvalidId(req) {
  return req.params.id !== undefined && req.params.id !== SINGLETON_ID;
}

publicRouter.get("/", async (req, res) => {
  try {
    const setting = await getOrCreateDefault();
    return sendSuccess(res, serialize(setting));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:id", async (req, res) => {
  try {
    if (req.params.id !== SINGLETON_ID) {
      return sendError(res, { code: "NOT_FOUND", message: "Company setting not found", status: 404 });
    }
    const setting = await getOrCreateDefault();
    return sendSuccess(res, serialize(setting));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const data = extract(req.body);
    if (!data.name) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    }
    const exists = await CompanySetting.findByPk(SINGLETON_ID);
    if (exists) {
      return sendError(res, { code: "CONFLICT", message: "Company setting already exists", status: 409 });
    }
    const setting = await CompanySetting.create({
      id: SINGLETON_ID,
      ...DEFAULT_COMPANY_SETTING,
      ...data,
    });
    return sendSuccess(res, serialize(setting), null, 201);
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    }
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

async function updateSetting(req, res) {
  try {
    if (hasInvalidId(req)) {
      return sendError(res, { code: "NOT_FOUND", message: "Company setting not found", status: 404 });
    }
    const data = extract(req.body);
    if (hasInvalidName(data)) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "name must not be empty", status: 422 });
    }
    const setting = await getOrCreateDefault();
    await setting.update(data);
    return sendSuccess(res, serialize(setting));
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    }
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
}

async function patchSetting(req, res) {
  return updateSetting(req, res);
}

async function deleteSetting(req, res) {
  try {
    if (hasInvalidId(req)) {
      return sendError(res, { code: "NOT_FOUND", message: "Company setting not found", status: 404 });
    }
    await CompanySetting.destroy({ where: { id: SINGLETON_ID } });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
}

adminRouter.put("/", updateSetting);
adminRouter.put("/:id", updateSetting);
adminRouter.patch("/", patchSetting);
adminRouter.patch("/:id", patchSetting);
adminRouter.delete("/", deleteSetting);
adminRouter.delete("/:id", deleteSetting);

module.exports = { publicRouter, adminRouter };
