const express = require("express");
const Article = require("../models/Article");

const router = express.Router();

// GET /api/articles - list all articles
router.get("/", async (req, res) => {
  try {
    const { status, category } = req.query;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;

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
    const article = await Article.create(req.body);
    res.status(201).json(article);
  } catch (err) {
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
      if (req.body[field] !== undefined) article[field] = req.body[field];
    });
    await article.save();

    res.json(article);
  } catch (err) {
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
