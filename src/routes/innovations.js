const express = require("express");
const Innovation = require("../models/Innovation");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere, defaultOrder } = require("../utils/pagination");
const { resolveSortIndex } = require("../utils/validators");

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
    img: [j.img_en, j.img_id, j.img_zn, j.img].find((value) => typeof value === "string" && value.trim()) ?? null,
    img_id: j.img_id ?? null,
    img_en: j.img_en ?? null,
    img_zn: j.img_zn ?? null,
    eyebrow: j.eyebrow,
    link: j.link,
    cta: j.cta,
    isPublished: j.isPublished ?? j.is_published ?? true,
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
    if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["title", "desc", "tag"]));
    const { count, rows } = await Innovation.findAndCountAll({ where, order: defaultOrder(req, sort), limit, offset });
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
    const { id, title, desc, tag, img, img_id, img_en, img_zn, eyebrow, link, cta, isPublished } = req.body;
    if (!id) return sendError(res, { code: "VALIDATION_ERROR", message: "id is required", status: 422 });
    if (!title) return sendError(res, { code: "VALIDATION_ERROR", message: "title is required", status: 422 });
    if (![img_id, img_en, img_zn, img].some((value) => typeof value === "string" && value.trim())) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "at least one of img_id, img_en, or img_zn is required", status: 422 });
    }
    const sortIndex = resolveSortIndex(req.body);
    if (sortIndex === null) return sendError(res, { code: "VALIDATION_ERROR", message: "sortIndex must be an integer", status: 422 });
    const fallbackImage = [img_en, img_id, img_zn, img].find((value) => typeof value === "string" && value.trim());
    const inv = await Innovation.create({ id, title, desc, tag, img: fallbackImage, img_id, img_en: img_en ?? img, img_zn, eyebrow, link, cta, isPublished, ...(sortIndex !== undefined ? { sortIndex } : {}) });
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
    ["title", "desc", "tag", "img", "img_id", "img_en", "img_zn", "eyebrow", "link", "cta", "isPublished", "sortIndex"].forEach((f) => {
      if (req.body[f] !== undefined) inv[f] = req.body[f];
    });
    if (["img", "img_id", "img_en", "img_zn"].some((field) => req.body[field] !== undefined)) {
      if (req.body.img !== undefined && req.body.img_id === undefined && req.body.img_en === undefined && req.body.img_zn === undefined) {
        inv.img_en = req.body.img;
      }
      inv.img = [inv.img_en, inv.img_id, inv.img_zn, inv.img].find((value) => typeof value === "string" && value.trim()) ?? null;
      if (![inv.img_id, inv.img_en, inv.img_zn, inv.img].some((value) => typeof value === "string" && value.trim())) {
        return sendError(res, { code: "VALIDATION_ERROR", message: "at least one of img_id, img_en, or img_zn is required", status: 422 });
      }
    }
    if (req.body.index !== undefined && req.body.sortIndex === undefined) {
      const v = resolveSortIndex(req.body);
      if (v === null) return sendError(res, { code: "VALIDATION_ERROR", message: "sortIndex must be an integer", status: 422 });
      if (v !== undefined) inv.sortIndex = v;
    }
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
