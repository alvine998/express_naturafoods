const express = require("express");
const { Op } = require("sequelize");
const Product = require("../models/Product");
const Category = require("../models/Category");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");
const { validateSlug } = require("../utils/validators");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

// helper to serialize product to contract shape
function serialize(p) {
  const j = p.toJSON();
  // Sequelize underscored true stores is_highlight etc but toJSON exposes isHighlight due to field mapping? Ensure camelCase
  return {
    id: j.id,
    slug: j.slug,
    categoryId: j.categoryId ?? j.category_id,
    category: j.category ? { id: j.category.id, slug: j.category.slug, name: j.category.name } : null,
    type: j.type,
    title: j.title,
    note: j.note,
    tag: j.tag,
    img: j.img,
    desc: j.desc,
    isHighlight: j.isHighlight ?? j.is_highlight ?? false,
    isPublished: j.isPublished ?? j.is_published ?? true,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

// GET /products - public list with filters
publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 8, maxLimit: 50 });
    const where = {};
    if (req.query.categoryId) where.categoryId = req.query.categoryId;
    if (req.query.type) where.type = req.query.type;
    if (req.query.isHighlight !== undefined) {
      const v = String(req.query.isHighlight).toLowerCase();
      if (v === "true" || v === "false") where.isHighlight = v === "true";
    }
    if (req.query.isPublished !== undefined) {
      const v = String(req.query.isPublished).toLowerCase();
      if (v === "true" || v === "false") where.isPublished = v === "true";
    }
    if (req.query.q) {
      const search = buildSearchWhere(req.query.q, ["title", "slug", "tag", "type"]);
      Object.assign(where, search);
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, as: "category" }],
      order: sort,
      limit,
      offset,
    });
    const data = rows.map(serialize);
    const meta = buildMeta(page, limit, count);
    return sendSuccess(res, data, meta);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// GET /products/highlighted - alias
publicRouter.get("/highlighted", async (req, res) => {
  try {
    const where = { isHighlight: true };
    if (req.query.categoryId) where.categoryId = req.query.categoryId;
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 8, maxLimit: 50 });
    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, as: "category" }],
      order: sort,
      limit,
      offset,
    });
    const data = rows.map(serialize);
    const meta = buildMeta(page, limit, count);
    return sendSuccess(res, data, meta);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// GET /products/:slug
publicRouter.get("/:slug", async (req, res) => {
  try {
    const p = await Product.findOne({
      where: { slug: req.params.slug },
      include: [{ model: Category, as: "category" }],
    });
    if (!p) return sendError(res, { code: "NOT_FOUND", message: "Product not found", status: 404 });
    return sendSuccess(res, serialize(p));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: POST /admin/products
adminRouter.post("/", async (req, res) => {
  try {
    const { slug, categoryId, type, title, note, tag, img, desc, isHighlight, isPublished } = req.body;
    const slugErr = validateSlug(slug);
    if (slugErr) return sendError(res, { code: "VALIDATION_ERROR", message: slugErr, status: 422, details: { slug: slugErr } });
    if (!categoryId) return sendError(res, { code: "VALIDATION_ERROR", message: "categoryId is required", status: 422 });
    const catExists = await Category.findByPk(categoryId);
    if (!catExists) return sendError(res, { code: "VALIDATION_ERROR", message: "Category not found", status: 422 });
    if (!title) return sendError(res, { code: "VALIDATION_ERROR", message: "title is required", status: 422 });
    if (!img) return sendError(res, { code: "VALIDATION_ERROR", message: "img is required", status: 422 });
    const product = await Product.create({
      slug: slug.toLowerCase(),
      categoryId,
      type: type || "general",
      title,
      note,
      tag,
      img,
      desc,
      isHighlight: !!isHighlight,
      isPublished: isPublished !== undefined ? !!isPublished : true,
    });
    const created = await Product.findByPk(product.id, { include: [{ model: Category, as: "category" }] });
    return sendSuccess(res, serialize(created), null, 201);
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

// PUT /admin/products/:slug
adminRouter.put("/:slug", async (req, res) => {
  try {
    const product = await Product.findOne({ where: { slug: req.params.slug } });
    if (!product) return sendError(res, { code: "NOT_FOUND", message: "Product not found", status: 404 });
    const { slug, categoryId, type, title, note, tag, img, desc, isHighlight, isPublished } = req.body;
    if (slug && slug !== product.slug) {
      const err = validateSlug(slug);
      if (err) return sendError(res, { code: "VALIDATION_ERROR", message: err, status: 422 });
      const exists = await Product.findOne({ where: { slug: slug.toLowerCase() } });
      if (exists) return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
      product.slug = slug.toLowerCase();
    }
    if (categoryId !== undefined) {
      const catExists = await Category.findByPk(categoryId);
      if (!catExists) return sendError(res, { code: "VALIDATION_ERROR", message: "Category not found", status: 422 });
      product.categoryId = categoryId;
    }
    if (type !== undefined) product.type = type;
    if (title !== undefined) product.title = title;
    if (note !== undefined) product.note = note;
    if (tag !== undefined) product.tag = tag;
    if (img !== undefined) product.img = img;
    if (desc !== undefined) product.desc = desc;
    if (isHighlight !== undefined) product.isHighlight = !!isHighlight;
    if (isPublished !== undefined) product.isPublished = !!isPublished;
    await product.save();
    const updated = await Product.findByPk(product.id, { include: [{ model: Category, as: "category" }] });
    return sendSuccess(res, serialize(updated));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// PATCH /admin/products/:slug/highlight
adminRouter.patch("/:slug/highlight", async (req, res) => {
  try {
    const product = await Product.findOne({ where: { slug: req.params.slug } });
    if (!product) return sendError(res, { code: "NOT_FOUND", message: "Product not found", status: 404 });
    const { isHighlight } = req.body;
    if (isHighlight === undefined) return sendError(res, { code: "VALIDATION_ERROR", message: "isHighlight is required", status: 422 });
    product.isHighlight = !!isHighlight;
    await product.save();
    return sendSuccess(res, { slug: product.slug, isHighlight: product.isHighlight });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// DELETE /admin/products/:slug
adminRouter.delete("/:slug", async (req, res) => {
  try {
    const deleted = await Product.destroy({ where: { slug: req.params.slug } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Product not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
