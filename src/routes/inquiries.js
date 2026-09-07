const express = require("express");
const Inquiry = require("../models/Inquiry");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");
const { parsePagination, buildMeta, buildSearchWhere } = require("../utils/pagination");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(authMiddleware);

function serialize(i) {
  const j = i.toJSON();
  return {
    id: j.id,
    name: j.name,
    city: j.city,
    whatsapp: j.whatsapp,
    interest: j.interest,
    email: j.email,
    message: j.message,
    source: j.source,
    createdAt: j.createdAt || j.created_at,
  };
}

// POST /inquiries - public create
publicRouter.post("/", async (req, res) => {
  try {
    const { name, city, whatsapp, interest, email, message, source } = req.body;
    if (!name) return sendError(res, { code: "VALIDATION_ERROR", message: "name is required", status: 422 });
    if (!city) return sendError(res, { code: "VALIDATION_ERROR", message: "city is required", status: 422 });
    if (!whatsapp) return sendError(res, { code: "VALIDATION_ERROR", message: "whatsapp is required", status: 422 });
    if (!interest) return sendError(res, { code: "VALIDATION_ERROR", message: "interest is required", status: 422 });
    const inquiry = await Inquiry.create({ name, city, whatsapp, interest, email, message, source });
    return sendSuccess(res, serialize(inquiry), null, 201);
  } catch (err) {
    if (err.name === "SequelizeValidationError") return sendError(res, { code: "VALIDATION_ERROR", message: err.message, status: 422 });
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// Admin list with filters
adminRouter.get("/", async (req, res) => {
  try {
    const { page, limit, offset, sort } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = {};
    if (req.query.interest) where.interest = req.query.interest;
    if (req.query.city) where.city = req.query.city;
    if (req.query.q) Object.assign(where, buildSearchWhere(req.query.q, ["name", "city", "whatsapp", "interest", "email"]));
    const effectiveSort = req.query.sort ? sort : [["createdAt", "DESC"]];
    const { count, rows } = await Inquiry.findAndCountAll({ where, order: effectiveSort, limit, offset });
    return sendSuccess(res, rows.map(serialize), buildMeta(page, limit, count));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.get("/export", async (req, res) => {
  try {
    const format = req.query.format || "csv";
    if (format !== "csv") return sendError(res, { code: "VALIDATION_ERROR", message: "Only csv supported", status: 422 });
    const inquiries = await Inquiry.findAll({ order: [["createdAt", "DESC"]] });
    const header = "id,name,city,whatsapp,interest,email,message,source,createdAt";
    const rows = inquiries.map((i) => {
      const j = i.toJSON();
      const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
      return [j.id, j.name, j.city, j.whatsapp, j.interest, j.email || "", j.message || "", j.source || "", j.createdAt || j.created_at].map(esc).join(",");
    });
    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"inquiries.csv\"");
    return res.send(csv);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await Inquiry.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Inquiry not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
