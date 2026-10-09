const express = require("express");
const OfficialPartner = require("../models/OfficialPartner");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere, defaultOrder } = require("../utils/pagination");
const { resolveSortIndex } = require("../utils/validators");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

function serialize(p) {
  const j = p.toJSON();
  return {
    id: j.id,
    name: j.name_en ?? j.name_id ?? j.name_zn ?? j.name,
    name_id: j.name_id ?? null,
    name_en: j.name_en ?? null,
    name_zn: j.name_zn ?? null,
    description_id: j.description_id ?? null,
    description_en: j.description_en ?? null,
    description_zn: j.description_zn ?? null,
    images: j.images,
    background: j.background,
    isPublished: j.isPublished ?? j.is_published ?? true,
    link: j.link,
    color: j.color,
    brandIds: Array.isArray(j.brandIds ?? j.brand_ids) ? (j.brandIds ?? j.brand_ids) : [],
    order: j.order,
    sortIndex: j.order ?? 0,
    index: j.order ?? 0,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

// GET /official-partners
publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.isPublished !== undefined) {
      const v = String(req.query.isPublished).toLowerCase();
      if (v === "true" || v === "false") where.isPublished = v === "true";
    }
    if (req.query.q) {
      const search = buildSearchWhere(req.query.q, ["name", "name_id", "name_en", "name_zn", "id", "description_id", "description_en", "description_zn"]);
      Object.assign(where, search);
    }
    const order = defaultOrder(req, sort, "order");
    const { count, rows } = await OfficialPartner.findAndCountAll({ where, order, limit, offset });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:id", async (req, res) => {
  try {
    const p = await OfficialPartner.findByPk(req.params.id);
    if (!p) return sendError(res, { code: "NOT_FOUND", message: "Official partner not found", status: 404 });
    return sendSuccess(res, serialize(p));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN
adminRouter.post("/", async (req, res) => {
  try {
    const { id, name, name_id, name_en, name_zn, description_id, description_en, description_zn, images, background, isPublished, link, color, brandIds, order } = req.body;
    if (!id) return sendError(res, { code: "VALIDATION_ERROR", message: "id is required", status: 422 });
    const legacyName = name_en ?? name_id ?? name_zn ?? name;
    if (![name_id, name_en, name_zn, name].some((value) => typeof value === "string" && value.trim())) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "at least one of name_id, name_en, or name_zn is required", status: 422 });
    }
    if (!Array.isArray(images) || images.length === 0 || images.some((image) => typeof image !== "string" || image.trim() === "")) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "images must be a non-empty array of strings", status: 422 });
    }
    if (!background) return sendError(res, { code: "VALIDATION_ERROR", message: "background is required", status: 422 });
    const normalizedBrandIds = Array.isArray(brandIds) ? [...new Set(brandIds.map((v) => String(v).trim()).filter(Boolean))] : [];
    const partner = await OfficialPartner.create({
      id: String(id).toLowerCase(),
      name: legacyName,
      name_id,
      name_en,
      name_zn,
      description_id,
      description_en,
      description_zn,
      images,
      background,
      isPublished: isPublished !== undefined ? !!isPublished : true,
      link,
      color,
      brandIds: normalizedBrandIds.length ? normalizedBrandIds : null,
      order: resolveSortIndex(req.body, ["order"]) ?? order ?? 0,
    });
    return sendSuccess(res, serialize(partner), null, 201);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.put("/:id", async (req, res) => {
  try {
    const partner = await OfficialPartner.findByPk(req.params.id);
    if (!partner) return sendError(res, { code: "NOT_FOUND", message: "Official partner not found", status: 404 });
    const { id, name, name_id, name_en, name_zn, description_id, description_en, description_zn, images, background, isPublished, link, color, brandIds, order } = req.body;
    if (id && id !== partner.id) {
      const exists = await OfficialPartner.findByPk(id);
      if (exists) return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
      partner.id = String(id).toLowerCase();
    }
    if (name !== undefined) partner.name = name;
    if (name_id !== undefined) partner.name_id = name_id;
    if (name_en !== undefined) partner.name_en = name_en;
    if (name_zn !== undefined) partner.name_zn = name_zn;
    if (name !== undefined || name_id !== undefined || name_en !== undefined || name_zn !== undefined) {
      partner.name = partner.name_en ?? partner.name_id ?? partner.name_zn ?? partner.name;
    }
    if (![partner.name_id, partner.name_en, partner.name_zn, partner.name].some((value) => typeof value === "string" && value.trim())) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "at least one of name_id, name_en, or name_zn is required", status: 422 });
    }
    if (description_id !== undefined) partner.description_id = description_id;
    if (description_en !== undefined) partner.description_en = description_en;
    if (description_zn !== undefined) partner.description_zn = description_zn;
    if (images !== undefined) {
      if (!Array.isArray(images) || images.length === 0 || images.some((image) => typeof image !== "string" || image.trim() === "")) {
        return sendError(res, { code: "VALIDATION_ERROR", message: "images must be a non-empty array of strings", status: 422 });
      }
      partner.images = images;
    }
    if (background !== undefined) partner.background = background;
    if (isPublished !== undefined) partner.isPublished = !!isPublished;
    if (link !== undefined) partner.link = link;
    if (color !== undefined) partner.color = color;
    if (brandIds !== undefined) {
      const normalizedBrandIds = Array.isArray(brandIds) ? [...new Set(brandIds.map((v) => String(v).trim()).filter(Boolean))] : [];
      partner.brandIds = normalizedBrandIds.length ? normalizedBrandIds : null;
    }
    {
      const v = resolveSortIndex(req.body, ["order"]);
      if (v === null) return sendError(res, { code: "VALIDATION_ERROR", message: "sortIndex must be an integer", status: 422 });
      if (v !== undefined) partner.order = v;
      else if (order !== undefined) partner.order = order;
    }
    await partner.save();
    return sendSuccess(res, serialize(partner));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.patch("/:id/publish", async (req, res) => {
  try {
    const partner = await OfficialPartner.findByPk(req.params.id);
    if (!partner) return sendError(res, { code: "NOT_FOUND", message: "Official partner not found", status: 404 });
    const { isPublished } = req.body;
    if (isPublished === undefined) return sendError(res, { code: "VALIDATION_ERROR", message: "isPublished is required", status: 422 });
    partner.isPublished = !!isPublished;
    await partner.save();
    return sendSuccess(res, { id: partner.id, isPublished: partner.isPublished });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.patch("/reorder", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return sendError(res, { code: "VALIDATION_ERROR", message: "ids must be array", status: 422 });
    for (let i = 0; i < ids.length; i++) {
      await OfficialPartner.update({ order: i }, { where: { id: ids[i] } });
    }
    return sendSuccess(res, { ids });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await OfficialPartner.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Official partner not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
