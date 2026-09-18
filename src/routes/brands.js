const express = require("express");
const { Op } = require("sequelize");
const Brand = require("../models/Brand");
const Product = require("../models/Product");
const HomeBrand = require("../models/HomeBrand");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");
const { validateSlug } = require("../utils/validators");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

function serialize(b) {
  const j = b.toJSON();
  return {
    id: j.id,
    slug: j.slug,
    name: j.name,
    description: j.description,
    logo: j.logo ?? null,
    isActive: j.isActive ?? j.is_active ?? true,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

// GET /brands - public list
publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.isActive !== undefined) {
      const v = String(req.query.isActive).toLowerCase();
      if (v === "true" || v === "false") where.isActive = v === "true";
    }
    if (req.query.q) {
      const search = buildSearchWhere(req.query.q, ["name", "slug"]);
      Object.assign(where, search);
    }
    const { count, rows } = await Brand.findAndCountAll({ where, order: sort, limit, offset });
    const data = rows.map(serialize);
    const meta = buildMeta(page, limit, count);
    return sendSuccess(res, data, meta);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// GET /brands/:slug
publicRouter.get("/:slug", async (req, res) => {
  try {
    const brand = await Brand.findOne({ where: { slug: req.params.slug } });
    if (!brand) return sendError(res, { code: "NOT_FOUND", message: "Brand not found", status: 404 });
    return sendSuccess(res, serialize(brand));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: POST /admin/brands
adminRouter.post("/", async (req, res) => {
  try {
    const { slug, name, description, logo, isActive } = req.body;
    const slugErr = validateSlug(slug);
    if (slugErr) return sendError(res, { code: "VALIDATION_ERROR", message: slugErr, status: 422, details: { slug: slugErr } });
    if (!name) return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    const brand = await Brand.create({
      slug: slug.toLowerCase(),
      name,
      description,
      logo: logo || null,
      isActive: isActive !== undefined ? !!isActive : true,
    });
    return sendSuccess(res, serialize(brand), null, 201);
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

// ADMIN: PUT /admin/brands/:slug
adminRouter.put("/:slug", async (req, res) => {
  try {
    const brand = await Brand.findOne({ where: { slug: req.params.slug } });
    if (!brand) return sendError(res, { code: "NOT_FOUND", message: "Brand not found", status: 404 });
    const { slug, name, description, logo, isActive } = req.body;
    if (slug && slug !== brand.slug) {
      const err = validateSlug(slug);
      if (err) return sendError(res, { code: "VALIDATION_ERROR", message: err, status: 422 });
      const exists = await Brand.findOne({ where: { slug: slug.toLowerCase() } });
      if (exists) return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
      brand.slug = slug.toLowerCase();
    }
    if (name !== undefined) brand.name = name;
    if (description !== undefined) brand.description = description;
    if (logo !== undefined) brand.logo = logo || null;
    if (isActive !== undefined) brand.isActive = !!isActive;
    await brand.save();
    return sendSuccess(res, serialize(brand));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: PATCH /admin/brands/:slug/active
adminRouter.patch("/:slug/active", async (req, res) => {
  try {
    const brand = await Brand.findOne({ where: { slug: req.params.slug } });
    if (!brand) return sendError(res, { code: "NOT_FOUND", message: "Brand not found", status: 404 });
    const { isActive } = req.body;
    if (isActive === undefined) return sendError(res, { code: "VALIDATION_ERROR", message: "isActive is required", status: 422 });
    brand.isActive = !!isActive;
    await brand.save();
    return sendSuccess(res, { slug: brand.slug, isActive: brand.isActive });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN: DELETE /admin/brands/:slug
adminRouter.delete("/:slug", async (req, res) => {
  try {
    const brand = await Brand.findOne({ where: { slug: req.params.slug } });
    if (!brand) return sendError(res, { code: "NOT_FOUND", message: "Brand not found", status: 404 });
    // clear references explicitly: FK constraints may be absent on non-altered DBs
    await Product.update({ brandId: null }, { where: { brandId: brand.id } });
    const homeBrands = await HomeBrand.findAll({ where: { brandIds: { [Op.not]: null } } });
    for (const hb of homeBrands) {
      const ids = Array.isArray(hb.brandIds) ? hb.brandIds : [];
      if (ids.includes(brand.id)) {
        hb.brandIds = ids.filter((id) => id !== brand.id);
        await hb.save();
      }
    }
    await brand.destroy();
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
