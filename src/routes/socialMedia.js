const express = require("express");
const { Op } = require("sequelize");
const SocialMedia = require("../models/SocialMedia");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere, defaultOrder } = require("../utils/pagination");
const { resolveSortIndex } = require("../utils/validators");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

function serialize(s) {
  const j = s.toJSON();
  return {
    id: j.id,
    name: j.name,
    description: j.description,
    image: j.image,
    instagram: j.instagram,
    facebook: j.facebook,
    tiktok: j.tiktok,
    sortIndex: j.sortIndex ?? j.sort_index ?? 0,
    index: j.sortIndex ?? j.sort_index ?? 0,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

// GET /social-media
publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.q) {
      const search = buildSearchWhere(req.query.q, ["name", "description"]);
      Object.assign(where, search);
    }
    const { count, rows } = await SocialMedia.findAndCountAll({ where, order: defaultOrder(req, sort), limit, offset });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:id", async (req, res) => {
  try {
    const s = await SocialMedia.findByPk(req.params.id);
    if (!s) return sendError(res, { code: "NOT_FOUND", message: "Social media not found", status: 404 });
    return sendSuccess(res, serialize(s));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: POST /admin/social-media
adminRouter.post("/", async (req, res) => {
  try {
    const { name, description, image, instagram, facebook, tiktok } = req.body;
    if (!name) return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    const sortIndex = resolveSortIndex(req.body);
    if (sortIndex === null) return sendError(res, { code: "VALIDATION_ERROR", message: "sortIndex must be an integer", status: 422 });
    const social = await SocialMedia.create({ name, description, image, instagram, facebook, tiktok, ...(sortIndex !== undefined ? { sortIndex } : {}) });
    return sendSuccess(res, serialize(social), null, 201);
  } catch (err) {
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: PUT /admin/social-media/:id
adminRouter.put("/:id", async (req, res) => {
  try {
    const social = await SocialMedia.findByPk(req.params.id);
    if (!social) return sendError(res, { code: "NOT_FOUND", message: "Social media not found", status: 404 });
    const { name, description, image, instagram, facebook, tiktok } = req.body;
    if (name !== undefined) social.name = name;
    if (description !== undefined) social.description = description;
    if (image !== undefined) social.image = image;
    if (instagram !== undefined) social.instagram = instagram;
    if (facebook !== undefined) social.facebook = facebook;
    if (tiktok !== undefined) social.tiktok = tiktok;
    if (req.body.sortIndex !== undefined) social.sortIndex = req.body.sortIndex;
    if (req.body.index !== undefined && req.body.sortIndex === undefined) {
      const v = resolveSortIndex(req.body);
      if (v === null) return sendError(res, { code: "VALIDATION_ERROR", message: "sortIndex must be an integer", status: 422 });
      if (v !== undefined) social.sortIndex = v;
    }
    await social.save();
    return sendSuccess(res, serialize(social));
  } catch (err) {
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: DELETE /admin/social-media/:id
adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await SocialMedia.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Social media not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
