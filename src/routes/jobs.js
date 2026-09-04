const express = require("express");
const Job = require("../models/Job");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(authMiddleware);

function serialize(j) {
  const d = j.toJSON();
  return {
    id: d.id,
    title: d.title,
    dept: d.dept,
    loc: d.loc,
    type: d.type,
    desc: d.desc,
    isPublished: d.isPublished ?? d.is_published ?? true,
    createdAt: d.createdAt || d.created_at,
    updatedAt: d.updatedAt || d.updated_at,
  };
}

publicRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.dept) where.dept = req.query.dept;
    if (req.query.loc) where.loc = req.query.loc;
    if (req.query.type) where.type = req.query.type;
    if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["title", "dept", "loc", "type"]));
    const { count, rows } = await Job.findAndCountAll({ where, order: sort, limit, offset });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:id", async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return sendError(res, { code: "NOT_FOUND", message: "Job not found", status: 404 });
    return sendSuccess(res, serialize(job));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.post("/", async (req, res) => {
  try {
    const { id, title, dept, loc, type, desc, isPublished } = req.body;
    if (!id) return sendError(res, { code: "VALIDATION_ERROR", message: "id is required", status: 422 });
    if (!title) return sendError(res, { code: "VALIDATION_ERROR", message: "title is required", status: 422 });
    const job = await Job.create({ id, title, dept, loc, type, desc, isPublished });
    return sendSuccess(res, serialize(job), null, 201);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.put("/:id", async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return sendError(res, { code: "NOT_FOUND", message: "Job not found", status: 404 });
    if (req.body.id && req.body.id !== job.id) {
      const exists = await Job.findByPk(req.body.id);
      if (exists) return sendError(res, { code: "CONFLICT", message: "id already exists", status: 409 });
      job.id = req.body.id;
    }
    ["title", "dept", "loc", "type", "desc", "isPublished"].forEach((f) => {
      if (req.body[f] !== undefined) job[f] = req.body[f];
    });
    await job.save();
    return sendSuccess(res, serialize(job));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await Job.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Job not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
