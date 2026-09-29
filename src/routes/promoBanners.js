const express = require("express");
const PromoBanner = require("../models/PromoBanner");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(authMiddleware);

const STATUSES = ["active", "inactive"];

function serialize(banner) {
  const j = banner.toJSON();
  return {
    id: j.id,
    name: j.name,
    description: j.description ?? null,
    status: j.status,
    image: j.image,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

function invalidStatus(status) {
  return status !== undefined && !STATUSES.includes(status);
}

async function list(req, res, where = {}) {
  const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
  if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["name", "description"]));
  const { count, rows } = await PromoBanner.findAndCountAll({
    where,
    order: sort,
    limit,
    offset,
  });
  return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
}

publicRouter.get("/", async (req, res) => {
  try {
    return await list(req, res, { status: "active" });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:id", async (req, res) => {
  try {
    const banner = await PromoBanner.findOne({ where: { id: req.params.id, status: "active" } });
    if (!banner) return sendError(res, { code: "NOT_FOUND", message: "Promo banner not found", status: 404 });
    return sendSuccess(res, serialize(banner));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.get("/", async (req, res) => {
  try {
    const where = {};
    if (req.query.status !== undefined) {
      if (invalidStatus(req.query.status)) {
        return sendError(res, { code: "VALIDATION_ERROR", message: "status must be active or inactive", status: 422 });
      }
      where.status = req.query.status;
    }
    return await list(req, res, where);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.get("/:id", async (req, res) => {
  try {
    const banner = await PromoBanner.findByPk(req.params.id);
    if (!banner) return sendError(res, { code: "NOT_FOUND", message: "Promo banner not found", status: 404 });
    return sendSuccess(res, serialize(banner));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const { name, description, image, status } = req.body;
    if (typeof name !== "string" || !name.trim()) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    }
    if (typeof image !== "string" || !image.trim()) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "image is required", status: 422 });
    }
    if (invalidStatus(status)) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "status must be active or inactive", status: 422 });
    }
    const banner = await PromoBanner.create({
      name: name.trim(),
      description: description ?? null,
      image: image.trim(),
      status: status || "active",
    });
    return sendSuccess(res, serialize(banner), null, 201);
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    }
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.put("/:id", async (req, res) => {
  try {
    const banner = await PromoBanner.findByPk(req.params.id);
    if (!banner) return sendError(res, { code: "NOT_FOUND", message: "Promo banner not found", status: 404 });
    const { name, description, image, status } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return sendError(res, { code: "VALIDATION_ERROR", message: "name must not be empty", status: 422 });
      }
      banner.name = name.trim();
    }
    if (description !== undefined) banner.description = description;
    if (image !== undefined) {
      if (typeof image !== "string" || !image.trim()) {
        return sendError(res, { code: "VALIDATION_ERROR", message: "image must not be empty", status: 422 });
      }
      banner.image = image.trim();
    }
    if (status !== undefined) {
      if (invalidStatus(status)) {
        return sendError(res, { code: "VALIDATION_ERROR", message: "status must be active or inactive", status: 422 });
      }
      banner.status = status;
    }
    await banner.save();
    return sendSuccess(res, serialize(banner));
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    }
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await PromoBanner.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Promo banner not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
