const express = require("express");
const SiteContent = require("../models/SiteContent");
const publicGetAuth = require("../middleware/publicGetAuth");
const { sendSuccess, sendError } = require("../utils/envelope");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(publicGetAuth);

// GET /site-content -> all locales as Record<Locale, Record<string, unknown>>
publicRouter.get("/", async (req, res) => {
  try {
    const rows = await SiteContent.findAll();
    const result = {};
    rows.forEach((r) => {
      const j = r.toJSON();
      result[j.locale] = j.overrides;
    });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

publicRouter.get("/:locale", async (req, res) => {
  try {
    const { locale } = req.params;
    if (!["id", "en", "zh"].includes(locale)) return sendError(res, { code: "VALIDATION_ERROR", message: "locale must be id|en|zh", status: 422 });
    const row = await SiteContent.findByPk(locale);
    if (!row) return sendSuccess(res, {}); // empty overrides
    return sendSuccess(res, row.overrides);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// Admin: PUT /admin/site-content/:locale - upsert
adminRouter.put("/:locale", async (req, res) => {
  try {
    const { locale } = req.params;
    if (!["id", "en", "zh"].includes(locale)) return sendError(res, { code: "VALIDATION_ERROR", message: "locale must be id|en|zh", status: 422 });
    const overrides = req.body;
    if (typeof overrides !== "object" || Array.isArray(overrides) || overrides === null) {
      return sendError(res, { code: "VALIDATION_ERROR", message: "Body must be object", status: 422 });
    }
    const [row, created] = await SiteContent.findOrCreate({
      where: { locale },
      defaults: { locale, overrides },
    });
    if (!created) {
      await row.update({ overrides });
    }
    return sendSuccess(res, row.overrides);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/:locale", async (req, res) => {
  try {
    const { locale } = req.params;
    if (!["id", "en", "zh"].includes(locale)) return sendError(res, { code: "VALIDATION_ERROR", message: "locale must be id|en|zh", status: 422 });
    const deleted = await SiteContent.destroy({ where: { locale } });
    if (!deleted) return sendError(res, { code: "NOT_FOUND", message: "Locale not found", status: 404 });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.delete("/", async (req, res) => {
  try {
    await SiteContent.destroy({ where: {} });
    return res.status(204).end();
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.patch("/:locale", async (req, res) => {
  try {
    const { locale } = req.params;
    const { path, value } = req.body;
    if (!Array.isArray(path)) return sendError(res, { code: "VALIDATION_ERROR", message: "path must be array", status: 422 });
    const row = await SiteContent.findByPk(locale);
    const current = row ? row.overrides : {};
    let cursor = current;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof cursor[path[i]] !== "object" || cursor[path[i]] === null) cursor[path[i]] = {};
      cursor = cursor[path[i]];
    }
    cursor[path[path.length - 1]] = value;
    if (row) await row.update({ overrides: current });
    else await SiteContent.create({ locale, overrides: current });
    return sendSuccess(res, current);
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
