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
  "visi_id",
  "visi_en",
  "visi_zn",
  "misi_id",
  "misi_en",
  "misi_zn",
  "visiBackground",
  "visiPersonPhoto",
  "visiPersonName",
  "visiPersonPosition",
  "misiBackground",
  "misiPersonPhoto",
  "misiPersonName",
  "misiPersonPosition",
  "careerBanner",
  "careerBannerID",
  "careerBannerEN",
  "careerBannerZN",
  "careerUrl",
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
const CAREER_BANNER_ALIAS_MAP = {
  career_banner: "careerBanner",
  career_banner_id: "careerBannerID",
  career_banner_en: "careerBannerEN",
  career_banner_zn: "careerBannerZN",
  careerBannerId: "careerBannerID",
  careerBannerEn: "careerBannerEN",
  careerBannerZn: "careerBannerZN",
};
function extract(body = {}) {
  const normalized = { ...body };
  for (const [alias, target] of Object.entries(CAREER_BANNER_ALIAS_MAP)) {
    if (normalized[alias] !== undefined && normalized[target] === undefined) {
      normalized[target] = normalized[alias];
    }
  }
  // keep legacy careerBanner in sync for backward compat
  if (normalized.careerBanner !== undefined) {
    if (
      normalized.careerBannerEN === undefined &&
      normalized.careerBannerID === undefined &&
      normalized.careerBannerZN === undefined
    ) {
      normalized.careerBannerEN = normalized.careerBanner;
    }
  } else if (
    normalized.careerBannerID !== undefined ||
    normalized.careerBannerEN !== undefined ||
    normalized.careerBannerZN !== undefined
  ) {
    normalized.careerBanner =
      normalized.careerBannerEN ??
      normalized.careerBannerID ??
      normalized.careerBannerZN ??
      null;
  }
  const out = {};
  for (const field of FIELDS) {
    if (normalized[field] !== undefined) out[field] = normalized[field];
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
    visi_id: j.visi_id ?? null,
    visi_en: j.visi_en ?? null,
    visi_zn: j.visi_zn ?? null,
    misi_id: j.misi_id ?? null,
    misi_en: j.misi_en ?? null,
    misi_zn: j.misi_zn ?? null,
    visiBackground: j.visiBackground ?? j.visi_background ?? null,
    visiPersonPhoto: j.visiPersonPhoto ?? j.visi_person_photo ?? null,
    visiPersonName: j.visiPersonName ?? j.visi_person_name ?? null,
    visiPersonPosition: j.visiPersonPosition ?? j.visi_person_position ?? null,
    misiBackground: j.misiBackground ?? j.misi_background ?? null,
    misiPersonPhoto: j.misiPersonPhoto ?? j.misi_person_photo ?? null,
    misiPersonName: j.misiPersonName ?? j.misi_person_name ?? null,
    misiPersonPosition: j.misiPersonPosition ?? j.misi_person_position ?? null,
    careerBanner:
      j.careerBannerEN ??
      j.careerBannerID ??
      j.careerBannerZN ??
      j.careerBanner ??
      j.career_banner_en ??
      j.career_banner_id ??
      j.career_banner_zn ??
      j.career_banner ??
      null,
    careerBannerID: j.careerBannerID ?? j.career_banner_id ?? null,
    careerBannerEN: j.careerBannerEN ?? j.career_banner_en ?? null,
    careerBannerZN: j.careerBannerZN ?? j.career_banner_zn ?? null,
    career_banner_id: j.careerBannerID ?? j.career_banner_id ?? null,
    career_banner_en: j.careerBannerEN ?? j.career_banner_en ?? null,
    career_banner_zn: j.careerBannerZN ?? j.career_banner_zn ?? null,
    careerUrl: j.careerUrl ?? j.career_url ?? null,
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
