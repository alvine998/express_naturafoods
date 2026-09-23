const express = require("express");
const HomeBrand = require("../models/HomeBrand");
const Brand = require("../models/Brand");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere, defaultOrder } = require("../utils/pagination");
const { resolveSortIndex } = require("../utils/validators");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

function serialize(h) {
  const j = h.toJSON();
  return {
    id: j.id,
    name: j.name,
    image: j.image,
    desc: j.desc,
    brandIds: Array.isArray(j.brandIds ?? j.brand_ids) ? (j.brandIds ?? j.brand_ids) : [],
    sortIndex: j.sortIndex ?? j.sort_index ?? 0,
    index: j.sortIndex ?? j.sort_index ?? 0,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

// returns null when the payload is not an array of ids
function normalizeBrandIds(input) {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) return null;
  return [...new Set(input.map((v) => String(v).trim()).filter(Boolean))];
}

async function findMissingBrandIds(brandIds) {
  if (!brandIds.length) return [];
  const found = await Brand.findAll({ where: { id: brandIds }, attributes: ["id"] });
  const foundIds = new Set(found.map((b) => b.id));
  return brandIds.filter((id) => !foundIds.has(id));
}

publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["name", "desc"]));
    const { count, rows } = await HomeBrand.findAndCountAll({ where, order: defaultOrder(req, sort), limit, offset });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:id", async (req, res) => {
  try {
    const h = await HomeBrand.findByPk(req.params.id);
    if (!h) return sendError(res, { code: "NOT_FOUND", message: "Home brand not found", status: 404 });
    return sendSuccess(res, serialize(h));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const { id, name, image, desc } = req.body;
    if (!id) return sendError(res, { code: "VALIDATION_ERROR", message: "id is required", status: 422 });
    if (!name) return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    const brandIds = normalizeBrandIds(req.body.brandIds);
    if (brandIds === null) return sendError(res, { code: "VALIDATION_ERROR", message: "brandIds must be an array of brand ids", status: 422 });
    const missing = await findMissingBrandIds(brandIds);
    if (missing.length) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "Brand not found", status: 422, details: { brandIds: missing } });
    }
    const sortIndex = resolveSortIndex(req.body);
    if (sortIndex === null) return sendError(res, { code: "VALIDATION_ERROR", message: "sortIndex must be an integer", status: 422 });
    const h = await HomeBrand.create({ id, name, image, desc, brandIds, ...(sortIndex !== undefined ? { sortIndex } : {}) });
    return sendSuccess(res, serialize(h), null, 201);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.put("/:id", async (req, res) => {
  try {
    const h = await HomeBrand.findByPk(req.params.id);
    if (!h) return sendError(res, { code: "NOT_FOUND", message: "Home brand not found", status: 404 });

    if (req.body.brandIds !== undefined) {
      const brandIds = normalizeBrandIds(req.body.brandIds);
      if (brandIds === null) return sendError(res, { code: "VALIDATION_ERROR", message: "brandIds must be an array of brand ids", status: 422 });
      const missing = await findMissingBrandIds(brandIds);
      if (missing.length) {
        return sendError(res, { code: "VALIDATION_ERROR", message: "Brand not found", status: 422, details: { brandIds: missing } });
      }
      h.brandIds = brandIds;
    }

    if (req.body.id && req.body.id !== h.id) {
      const exists = await HomeBrand.findByPk(req.body.id);
      if (exists) return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
      h.id = req.body.id;
    }
    ["name", "image", "desc", "sortIndex"].forEach((f) => {
      if (req.body[f] !== undefined) h[f] = req.body[f];
    });
    if (req.body.index !== undefined && req.body.sortIndex === undefined) {
      const v = resolveSortIndex(req.body);
      if (v === null) return sendError(res, { code: "VALIDATION_ERROR", message: "sortIndex must be an integer", status: 422 });
      if (v !== undefined) h.sortIndex = v;
    }
    await h.save();
    return sendSuccess(res, serialize(h));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await HomeBrand.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Home brand not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
