const express = require("express");
const Sale = require("../models/Sale");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere, defaultOrder } = require("../utils/pagination");
const { resolveSortIndex } = require("../utils/validators");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

function resolvePublished(body) {
  if (body.isPublished !== undefined) return !!body.isPublished;
  if (body.published !== undefined) return !!body.published;
  if (body.is_published !== undefined) return !!body.is_published;
  return undefined;
}

function serialize(s) {
  const j = s.toJSON();
  const isPublished = j.isPublished ?? j.is_published ?? j.published ?? true;
  return {
    id: j.id,
    name: j.name,
    gender: j.gender,
    position_id: j.position_id ?? null,
    position_en: j.position_en ?? null,
    position_zn: j.position_zn ?? null,
    whatsapp: j.whatsapp,
    email: j.email,
    photo: j.photo,
    location_id: j.location_id ?? null,
    location_en: j.location_en ?? null,
    location_zn: j.location_zn ?? null,
    isPublished,
    published: isPublished,
    sortIndex: j.sortIndex ?? j.sort_index ?? 0,
    index: j.sortIndex ?? j.sort_index ?? 0,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.gender) where.gender = req.query.gender;
    if (req.query.location_id) where.location_id = req.query.location_id;
    if (req.query.location_en) where.location_en = req.query.location_en;
    if (req.query.location_zn) where.location_zn = req.query.location_zn;
    if (req.query.position_id) where.position_id = req.query.position_id;
    if (req.query.position_en) where.position_en = req.query.position_en;
    if (req.query.position_zn) where.position_zn = req.query.position_zn;
    if (req.query.isPublished !== undefined) {
      const v = String(req.query.isPublished).toLowerCase();
      if (v === "true" || v === "false") where.isPublished = v === "true";
    } else if (req.query.published !== undefined) {
      const v = String(req.query.published).toLowerCase();
      if (v === "true" || v === "false") where.isPublished = v === "true";
    }
    if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["name", "position_id", "position_en", "position_zn", "location_id", "location_en", "location_zn", "email", "whatsapp"]));
    const { count, rows } = await Sale.findAndCountAll({ where, order: defaultOrder(req, sort), limit, offset });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:id", async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) return sendError(res, { code: "NOT_FOUND", message: "Sale not found", status: 404 });
    return sendSuccess(res, serialize(sale));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const { id, name, gender, position_id, position_en, position_zn, whatsapp, email, photo, location_id, location_en, location_zn } = req.body;
    if (!id) return sendError(res, { code: "VALIDATION_ERROR", message: "id is required", status: 422 });
    if (!name) return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    const published = resolvePublished(req.body);
    const sortIndex = resolveSortIndex(req.body);
    if (sortIndex === null) return sendError(res, { code: "VALIDATION_ERROR", message: "sortIndex must be an integer", status: 422 });
    const sale = await Sale.create({
      id,
      name,
      ...(gender !== undefined ? { gender: String(gender).toLowerCase() } : {}),
      position_id,
      position_en,
      position_zn,
      whatsapp,
      email,
      photo,
      location_id,
      location_en,
      location_zn,
      ...(published !== undefined ? { isPublished: published } : {}),
      ...(sortIndex !== undefined ? { sortIndex } : {}),
    });
    return sendSuccess(res, serialize(sale), null, 201);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.put("/:id", async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) return sendError(res, { code: "NOT_FOUND", message: "Sale not found", status: 404 });
    if (req.body.id && req.body.id !== sale.id) {
      const exists = await Sale.findByPk(req.body.id);
      if (exists) return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
      sale.id = req.body.id;
    }
    ["name", "gender", "position_id", "position_en", "position_zn", "whatsapp", "email", "photo", "location_id", "location_en", "location_zn", "sortIndex"].forEach((f) => {
      if (req.body[f] !== undefined) sale[f] = req.body[f];
    });
    if (req.body.gender !== undefined) sale.gender = String(req.body.gender).toLowerCase();
    const published = resolvePublished(req.body);
    if (published !== undefined) sale.isPublished = published;
    if (req.body.index !== undefined && req.body.sortIndex === undefined) {
      const v = resolveSortIndex(req.body);
      if (v === null) return sendError(res, { code: "VALIDATION_ERROR", message: "sortIndex must be an integer", status: 422 });
      if (v !== undefined) sale.sortIndex = v;
    }
    await sale.save();
    return sendSuccess(res, serialize(sale));
  } catch (err) {
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.patch("/:id/publish", async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) return sendError(res, { code: "NOT_FOUND", message: "Sale not found", status: 404 });
    const published = resolvePublished(req.body);
    if (published === undefined) return sendError(res, { code: "VALIDATION_ERROR", message: "isPublished (or published) is required", status: 422 });
    sale.isPublished = published;
    await sale.save();
    return sendSuccess(res, { id: sale.id, isPublished: sale.isPublished, published: sale.isPublished });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await Sale.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Sale not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
