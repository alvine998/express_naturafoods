const express = require("express");
const { Op } = require("sequelize");
const Article = require("../models/Article");

const router = express.Router();

function normalizeKeywords(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  let normalized;
  if (Array.isArray(value)) {
    normalized = value.map((v) => String(v).trim()).filter(Boolean).join(", ");
  } else if (typeof value === "string") {
    normalized = value.trim();
  } else {
    const err = new Error("keywords must be a string or an array of strings");
    err.status = 400;
    throw err;
  }
  if (normalized.length > 255) {
    const err = new Error("keywords must be at most 255 characters");
    err.status = 400;
    throw err;
  }
  return normalized;
}

// GET /api/articles - list all articles
router.get("/", async (req, res) => {
  try {
    const { status, category, keywords, q } = req.query;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (keywords) where.keywords = { [Op.like]: `%${keywords}%` };
    if (q) {
      const like = `%${q}%`;
      where[Op.or] = [
        { slug: { [Op.like]: like } },
        { titleID: { [Op.like]: like } },
        { titleEN: { [Op.like]: like } },
        { titleZN: { [Op.like]: like } },
        { category: { [Op.like]: like } },
        { excerpt: { [Op.like]: like } },
        { keywords: { [Op.like]: like } },
      ];
    }

    const articles = await Article.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/articles/:id - get one article
router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found" });
    res.json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/articles - create article
router.post("/", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.keywords !== undefined) payload.keywords = normalizeKeywords(payload.keywords);
    const article = await Article.create(payload);
    res.status(201).json(article);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Slug already exists" });
    }
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/articles/:id - update article
router.put("/:id", async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const fields = [
      "slug",
      "thumbnail",
      "titleID",
      "titleEN",
      "titleZN",
      "category",
      "excerpt",
      "keywords",
      "status",
      "published_date",
      "contentID",
      "contentEN",
      "contentZN",
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        article[field] = field === "keywords" ? normalizeKeywords(req.body[field]) : req.body[field];
      }
    });
    await article.save();

    res.json(article);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Slug already exists" });
    }
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/articles/:id - delete article
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Article.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Article not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
