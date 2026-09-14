const express = require("express");
const HomeBrand = require("../models/HomeBrand");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(authMiddleware);

function serialize(h) {
  const j = h.toJSON();
  return {
    id: j.id,
    name: j.name,
    image: j.image,
    desc: j.desc,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["name", "desc"]));
    const { count, rows } = await HomeBrand.findAndCountAll({ where, order: sort, limit, offset });
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
    const h = await HomeBrand.create({ id, name, image, desc });
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
    if (req.body.id && req.body.id !== h.id) {
      const exists = await HomeBrand.findByPk(req.body.id);
      if (exists) return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
      h.id = req.body.id;
    }
    ["name", "image", "desc"].forEach((f) => {
      if (req.body[f] !== undefined) h[f] = req.body[f];
    });
    await h.save();
    return sendSuccess(res, serialize(h));
  } catch (err) {
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
