const express = require("express");
const { Op } = require("sequelize");
const Article = require("../models/Article");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta } = require("../utils/pagination");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

function serialize(a) {
  const j = a.toJSON();
  // map DB fields to contract shape while keeping both
  const isPublished = j.status === "published";
  return {
    id: j.id,
    slug: j.slug,
    title: j.titleEN || j.titleID || j.title || "",
    titleID: j.titleID,
    titleEN: j.titleEN,
    titleZN: j.titleZN,
    category: j.category,
    excerpt: j.excerpt,
    keywords: j.keywords,
    status: j.status,
    isPublished,
    date: j.published_date,
    published_date: j.published_date,
    content: j.contentEN || j.contentID || "",
    contentID: j.contentID,
    contentId: j.contentID,
    contentEN: j.contentEN,
    contentEn: j.contentEN,
    contentZN: j.contentZN,
    contentZh: j.contentZN,
    thumbnail: j.thumbnail,
    img: j.thumbnail,
    createdAt: j.createdAt || j.created_at,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

function mapContractToDb(body, isCreate = false) {
  const data = {};
  // slug
  if (body.slug !== undefined) data.slug = String(body.slug).toLowerCase();
  // title handling: contract may send title, we map to titleEN and titleID
  if (body.title !== undefined) {
    data.titleEN = body.title;
    data.titleID = body.titleID || body.title;
    data.titleZN = body.titleZN || body.title;
  }
  if (body.titleID !== undefined) data.titleID = body.titleID;
  if (body.titleEN !== undefined) data.titleEN = body.titleEN;
  if (body.titleZN !== undefined) data.titleZN = body.titleZN;
  if (body.category !== undefined) data.category = body.category;
  if (body.excerpt !== undefined) data.excerpt = body.excerpt;
  if (body.keywords !== undefined) data.keywords = body.keywords;
  if (body.status !== undefined) data.status = body.status;
  else if (body.isPublished !== undefined) data.status = body.isPublished ? "published" : "draft";
  if (body.published_date !== undefined) data.published_date = body.published_date;
  else if (body.date !== undefined) data.published_date = body.date;
  if (body.thumbnail !== undefined) data.thumbnail = body.thumbnail;
  else if (body.img !== undefined) data.thumbnail = body.img;
  if (body.contentID !== undefined) data.contentID = body.contentID;
  else if (body.contentId !== undefined) data.contentID = body.contentId;
  if (body.contentEN !== undefined) data.contentEN = body.contentEN;
  else if (body.contentEn !== undefined) data.contentEN = body.contentEn;
  if (body.contentZN !== undefined) data.contentZN = body.contentZN;
  else if (body.contentZh !== undefined) data.contentZN = body.contentZh;
  // fallback content -> contentEN
  if (body.content !== undefined && !data.contentEN) data.contentEN = body.content;
  if (isCreate) {
    // ensure required fields
    if (!data.titleID) data.titleID = data.titleEN || "Untitled ID";
    if (!data.titleEN) data.titleEN = data.titleID || "Untitled EN";
    if (!data.titleZN) data.titleZN = data.titleEN || "Untitled ZH";
    if (!data.contentID) data.contentID = data.contentEN || "<p></p>";
    if (!data.contentEN) data.contentEN = data.contentID || "<p></p>";
    if (!data.contentZN) data.contentZN = data.contentEN || "<p></p>";
    if (!data.category) data.category = "General";
  }
  return data;
}

// GET /articles - public list with pagination, q, category, status, sort
publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.status) where.status = req.query.status;
    // contract also may send isPublished? map
    if (req.query.isPublished !== undefined) {
      const v = String(req.query.isPublished).toLowerCase();
      if (v === "true") where.status = "published";
      else if (v === "false") where.status = "draft";
    }
    if (req.query.q) {
      const like = `%${req.query.q}%`;
      where[Op.or] = [
        { slug: { [Op.like]: like } },
        { titleID: { [Op.like]: like } },
        { titleEN: { [Op.like]: like } },
        { titleZN: { [Op.like]: like } },
        { category: { [Op.like]: like } },
        { excerpt: { [Op.like]: like } },
      ];
      // if we set Op.or alongside other where, need to handle correctly: Sequelize where with Op.or at top level mixes with other fields => need Op.and
      // Simplest: if there is other where, wrap
      // But Op.or duplicate; we should move existing where fields into Op.and
      if (Object.keys(where).length > 1) {
        const or = where[Op.or];
        delete where[Op.or];
        const andWhere = { [Op.and]: [where, { [Op.or]: or }] };
        // replace where content
        Object.keys(where).forEach((k) => delete where[k]);
        Object.assign(where, andWhere);
      }
    }
    // handle sort param: backend.md default sort=date:desc or createdAt:desc -> map date to published_date
    let order = sort;
    if (req.query.sort) {
      const s = String(req.query.sort);
      if (s.startsWith("date")) {
        order = [[ "published_date", s.includes("asc") ? "ASC" : "DESC" ]];
      } else if (s.startsWith("createdAt")) {
        order = [[ "createdAt", s.includes("asc") ? "ASC" : "DESC" ]];
      }
    }
    const { count, rows } = await Article.findAndCountAll({ where, order, limit, offset });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:slug", async (req, res) => {
  try {
    const param = req.params.slug;
    // try by slug first, then by id
    let article = await Article.findOne({ where: { slug: param } });
    if (!article) {
      // fallback try PK if uuid
      try {
        article = await Article.findByPk(param);
      } catch { /* ignore */ }
    }
    if (!article) return sendError(res, { code: "NOT_FOUND", message: "Article not found", status: 404 });
    return sendSuccess(res, serialize(article));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// ADMIN
adminRouter.post("/", async (req, res) => {
  try {
    const data = mapContractToDb(req.body, true);
    if (!data.slug) return sendError(res, { code: "VALIDATION_ERROR", message: "slug is required", status: 422 });
    if (!data.titleEN) return sendError(res, { code: "VALIDATION_ERROR", message: "title is required", status: 422 });
    const article = await Article.create(data);
    return sendSuccess(res, serialize(article), null, 201);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.put("/:slug", async (req, res) => {
  try {
    const param = req.params.slug;
    let article = await Article.findOne({ where: { slug: param } });
    if (!article) article = await Article.findByPk(param);
    if (!article) return sendError(res, { code: "NOT_FOUND", message: "Article not found", status: 404 });
    const data = mapContractToDb(req.body, false);
    // handle slug change uniqueness
    if (data.slug && data.slug !== article.slug) {
      const exists = await Article.findOne({ where: { slug: data.slug } });
      if (exists) return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
    }
    Object.assign(article, data);
    await article.save();
    return sendSuccess(res, serialize(article));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "Slug already exists", status: 409 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.patch("/:slug/publish", async (req, res) => {
  try {
    const param = req.params.slug;
    let article = await Article.findOne({ where: { slug: param } });
    if (!article) article = await Article.findByPk(param);
    if (!article) return sendError(res, { code: "NOT_FOUND", message: "Article not found", status: 404 });
    const { isPublished, status } = req.body;
    if (isPublished !== undefined) article.status = isPublished ? "published" : "draft";
    else if (status !== undefined) article.status = status;
    else return sendError(res, { code: "VALIDATION_ERROR", message: "isPublished or status required", status: 422 });
    await article.save();
    return sendSuccess(res, serialize(article));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:slug", async (req, res) => {
  try {
    const param = req.params.slug;
    let deleted = await Article.destroy({ where: { slug: param } });
    if (!deleted) {
      // fallback by id
      deleted = await Article.destroy({ where: { id: param } });
    }
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Article not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
