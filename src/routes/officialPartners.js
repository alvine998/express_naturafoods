const express = require("express");
const { Op } = require("sequelize");
const OfficialPartner = require("../models/OfficialPartner");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(authMiddleware);

function serialize(p) {
  const j = p.toJSON();
  return {
    id: j.id,
    name: j.name,
    description: j.description,
    image: j.image,
    background: j.background,
    isPublished: j.isPublished ?? j.is_published ?? true,
    link: j.link,
    color: j.color,
    order: j.order,
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
      const search = buildSearchWhere(req.query.q, ["name", "id", "description"]);
      Object.assign(where, search);
    }
    const order = req.query.sort ? sort : [["order", "ASC"], ["createdAt", "DESC"]];
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
    const { id, name, description, image, background, isPublished, link, color, order } = req.body;
    if (!id) return sendError(res, { code: "VALIDATION_ERROR", message: "id is required", status: 422 });
    if (!name) return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    if (!image) return sendError(res, { code: "VALIDATION_ERROR", message: "image is required", status: 422 });
    if (!background) return sendError(res, { code: "VALIDATION_ERROR", message: "background is required", status: 422 });
    const partner = await OfficialPartner.create({
      id: String(id).toLowerCase(),
      name,
      description,
      image,
      background,
      isPublished: isPublished !== undefined ? !!isPublished : true,
      link,
      color,
      order: order || 0,
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
    const { id, name, description, image, background, isPublished, link, color, order } = req.body;
    if (id && id !== partner.id) {
      const exists = await OfficialPartner.findByPk(id);
      if (exists) return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
      partner.id = String(id).toLowerCase();
    }
    if (name !== undefined) partner.name = name;
    if (description !== undefined) partner.description = description;
    if (image !== undefined) partner.image = image;
    if (background !== undefined) partner.background = background;
    if (isPublished !== undefined) partner.isPublished = !!isPublished;
    if (link !== undefined) partner.link = link;
    if (color !== undefined) partner.color = color;
    if (order !== undefined) partner.order = order;
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
