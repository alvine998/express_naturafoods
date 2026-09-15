const express = require("express");
const Innovation = require("../models/Innovation");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

function serialize(i) {
  const j = i.toJSON();
  return {
    id: j.id,
    title: j.title,
    desc: j.desc,
    tag: j.tag,
    img: j.img,
    eyebrow: j.eyebrow,
    link: j.link,
    cta: j.cta,
    isPublished: j.isPublished ?? j.is_published ?? true,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["title", "desc", "tag"]));
    const { count, rows } = await Innovation.findAndCountAll({ where, order: sort, limit, offset });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:id", async (req, res) => {
  try {
    const inv = await Innovation.findByPk(req.params.id);
    if (!inv) return sendError(res, { code: "NOT_FOUND", message: "Innovation not found", status: 404 });
    return sendSuccess(res, serialize(inv));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const { id, title, desc, tag, img, eyebrow, link, cta, isPublished } = req.body;
    if (!id) return sendError(res, { code: "VALIDATION_ERROR", message: "id is required", status: 422 });
    if (!title) return sendError(res, { code: "VALIDATION_ERROR", message: "title is required", status: 422 });
    const inv = await Innovation.create({ id, title, desc, tag, img, eyebrow, link, cta, isPublished });
    return sendSuccess(res, serialize(inv), null, 201);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.put("/:id", async (req, res) => {
  try {
    const inv = await Innovation.findByPk(req.params.id);
    if (!inv) return sendError(res, { code: "NOT_FOUND", message: "Innovation not found", status: 404 });
    if (req.body.id && req.body.id !== inv.id) {
      const exists = await Innovation.findByPk(req.body.id);
      if (exists) return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
      inv.id = req.body.id;
    }
    ["title", "desc", "tag", "img", "eyebrow", "link", "cta", "isPublished"].forEach((f) => {
      if (req.body[f] !== undefined) inv[f] = req.body[f];
    });
    await inv.save();
    return sendSuccess(res, serialize(inv));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await Innovation.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Innovation not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
