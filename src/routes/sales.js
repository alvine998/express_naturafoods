const express = require("express");
const Sale = require("../models/Sale");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");

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
    position: j.position,
    whatsapp: j.whatsapp,
    email: j.email,
    photo: j.photo,
    location: j.location,
    isPublished,
    published: isPublished,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.gender) where.gender = req.query.gender;
    if (req.query.location) where.location = req.query.location;
    if (req.query.position) where.position = req.query.position;
    if (req.query.isPublished !== undefined) {
      const v = String(req.query.isPublished).toLowerCase();
      if (v === "true" || v === "false") where.isPublished = v === "true";
    } else if (req.query.published !== undefined) {
      const v = String(req.query.published).toLowerCase();
      if (v === "true" || v === "false") where.isPublished = v === "true";
    }
    if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["name", "position", "location", "email", "whatsapp"]));
    const { count, rows } = await Sale.findAndCountAll({ where, order: sort, limit, offset });
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
    const { id, name, gender, position, whatsapp, email, photo, location } = req.body;
    if (!id) return sendError(res, { code: "VALIDATION_ERROR", message: "id is required", status: 422 });
    if (!name) return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    const published = resolvePublished(req.body);
    const sale = await Sale.create({
      id,
      name,
      gender,
      position,
      whatsapp,
      email,
      photo,
      location,
      ...(published !== undefined ? { isPublished: published } : {}),
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
    ["name", "gender", "position", "whatsapp", "email", "photo", "location"].forEach((f) => {
      if (req.body[f] !== undefined) sale[f] = req.body[f];
    });
    const published = resolvePublished(req.body);
    if (published !== undefined) sale.isPublished = published;
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
