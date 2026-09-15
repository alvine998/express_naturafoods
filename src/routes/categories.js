const express = require("express");
const { Op } = require("sequelize");
const Category = require("../models/Category");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");
const { validateSlug } = require("../utils/validators");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

function serialize(c) {
  const j = c.toJSON();
  return {
    id: j.id,
    slug: j.slug,
    name: j.name,
    description: j.description,
    isActive: j.isActive ?? j.is_active ?? true,
    isHighlight: j.isHighlight ?? j.is_highlight ?? false,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

// GET /categories - public list
publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.isActive !== undefined) {
      const v = String(req.query.isActive).toLowerCase();
      if (v === "true" || v === "false") where.isActive = v === "true";
    }
    if (req.query.isHighlight !== undefined) {
      const v = String(req.query.isHighlight).toLowerCase();
      if (v === "true" || v === "false") where.isHighlight = v === "true";
    }
    if (req.query.q) {
      const search = buildSearchWhere(req.query.q, ["name", "slug"]);
      Object.assign(where, search);
    }
    const { count, rows } = await Category.findAndCountAll({ where, order: sort, limit, offset });
    const data = rows.map(serialize);
    const meta = buildMeta(page, limit, count);
    return sendSuccess(res, data, meta);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// GET /categories/:slug
publicRouter.get("/:slug", async (req, res) => {
  try {
    const cat = await Category.findOne({ where: { slug: req.params.slug } });
    if (!cat) return sendError(res, { code: "NOT_FOUND", message: "Category not found", status: 404 });
    return sendSuccess(res, serialize(cat));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: POST /admin/categories
adminRouter.post("/", async (req, res) => {
  try {
    const { slug, name, description, isActive, isHighlight } = req.body;
    const slugErr = validateSlug(slug);
    if (slugErr) return sendError(res, { code: "VALIDATION_ERROR", message: slugErr, status: 422, details: { slug: slugErr } });
    if (!name) return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    const category = await Category.create({
      slug: slug.toLowerCase(),
      name,
      description,
      isActive: isActive !== undefined ? !!isActive : true,
      isHighlight: isHighlight !== undefined ? !!isHighlight : false,
    });
    return sendSuccess(res, serialize(category), null, 201);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
    }
    if (err.name === "SequelizeValidationError") {
      return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422, details: err.errors });
    }
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: PUT /admin/categories/:slug
adminRouter.put("/:slug", async (req, res) => {
  try {
    const category = await Category.findOne({ where: { slug: req.params.slug } });
    if (!category) return sendError(res, { code: "NOT_FOUND", message: "Category not found", status: 404 });
    const { slug, name, description, isActive, isHighlight } = req.body;
    if (slug && slug !== category.slug) {
      const err = validateSlug(slug);
      if (err) return sendError(res, { code: "VALIDATION_ERROR", message: err, status: 422 });
      const exists = await Category.findOne({ where: { slug: slug.toLowerCase() } });
      if (exists) return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
      category.slug = slug.toLowerCase();
    }
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = !!isActive;
    if (isHighlight !== undefined) category.isHighlight = !!isHighlight;
    await category.save();
    return sendSuccess(res, serialize(category));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: PATCH /admin/categories/:slug/active
adminRouter.patch("/:slug/active", async (req, res) => {
  try {
    const category = await Category.findOne({ where: { slug: req.params.slug } });
    if (!category) return sendError(res, { code: "NOT_FOUND", message: "Category not found", status: 404 });
    const { isActive } = req.body;
    if (isActive === undefined) return sendError(res, { code: "VALIDATION_ERROR", message: "isActive is required", status: 422 });
    category.isActive = !!isActive;
    await category.save();
    return sendSuccess(res, { slug: category.slug, isActive: category.isActive });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: PATCH /admin/categories/:slug/highlight
adminRouter.patch("/:slug/highlight", async (req, res) => {
  try {
    const category = await Category.findOne({ where: { slug: req.params.slug } });
    if (!category) return sendError(res, { code: "NOT_FOUND", message: "Category not found", status: 404 });
    const { isHighlight } = req.body;
    if (isHighlight === undefined) return sendError(res, { code: "VALIDATION_ERROR", message: "isHighlight is required", status: 422 });
    category.isHighlight = !!isHighlight;
    await category.save();
    return sendSuccess(res, { slug: category.slug, isHighlight: category.isHighlight });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: DELETE /admin/categories/:slug
adminRouter.delete("/:slug", async (req, res) => {
  try {
    const deleted = await Category.destroy({ where: { slug: req.params.slug } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Category not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
