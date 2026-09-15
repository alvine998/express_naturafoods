const express = require("express");
const Education = require("../models/Education");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

function serialize(e) {
  const j = e.toJSON();
  return {
    id: j.id,
    title: j.title,
    desc: j.desc,
    duration: j.duration,
    level: j.level,
    img: j.img,
    eyebrow: j.eyebrow,
    cta: j.cta,
    link: j.link,
    isPublished: j.isPublished ?? j.is_published ?? true,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.level) where.level = req.query.level;
    if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["title", "desc", "level"]));
    const { count, rows } = await Education.findAndCountAll({ where, order: sort, limit, offset });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:id", async (req, res) => {
  try {
    const e = await Education.findByPk(req.params.id);
    if (!e) return sendError(res, { code: "NOT_FOUND", message: "Education not found", status: 404 });
    return sendSuccess(res, serialize(e));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const { id, title, desc, duration, level, img, eyebrow, cta, link, isPublished } = req.body;
    if (!id) return sendError(res, { code: "VALIDATION_ERROR", message: "id is required", status: 422 });
    if (!title) return sendError(res, { code: "VALIDATION_ERROR", message: "title is required", status: 422 });
    const edu = await Education.create({ id, title, desc, duration, level, img, eyebrow, cta, link, isPublished });
    return sendSuccess(res, serialize(edu), null, 201);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.put("/:id", async (req, res) => {
  try {
    const edu = await Education.findByPk(req.params.id);
    if (!edu) return sendError(res, { code: "NOT_FOUND", message: "Education not found", status: 404 });
    const fields = ["id", "title", "desc", "duration", "level", "img", "eyebrow", "cta", "link", "isPublished"];
    // handle id change
    if (req.body.id && req.body.id !== edu.id) {
      const exists = await Education.findByPk(req.body.id);
      if (exists) return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
      edu.id = req.body.id;
    }
    fields.forEach((f) => {
      if (f === "id") return;
      if (req.body[f] !== undefined) edu[f] = req.body[f];
    });
    await edu.save();
    return sendSuccess(res, serialize(edu));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await Education.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Education not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
