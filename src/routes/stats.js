const express = require("express");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");
const Product = require("../models/Product");
const OfficialPartner = require("../models/OfficialPartner");
const Article = require("../models/Article");
const Education = require("../models/Education");
const Innovation = require("../models/Innovation");
const Job = require("../models/Job");
const Inquiry = require("../models/Inquiry");
const User = require("../models/User");
const { AssistantConfig } = require("../models/AssistantConfig");
const SiteContent = require("../models/SiteContent");

const router = express.Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const [
      products,
      productsHighlighted,
      officialPartners,
      officialPartnersPublished,
      articles,
      education,
      innovation,
      jobs,
      inquiries,
      users,
      assistantCfg,
      siteContents,
    ] = await Promise.all([
      Product.count().catch(() => 0),
      Product.count({ where: { isHighlight: true } }).catch(() => 0),
      OfficialPartner.count().catch(() => 0),
      OfficialPartner.count({ where: { isPublished: true } }).catch(() => 0),
      Article.count().catch(() => 0),
      Education.count().catch(() => 0),
      Innovation.count().catch(() => 0),
      Job.count().catch(() => 0),
      Inquiry.count().catch(() => 0),
      User.count().catch(() => 0),
      AssistantConfig.findByPk("default").then((c) => (c ? (c.knowledge || []).length : 0)).catch(() => 0),
      SiteContent.count().catch(() => 0),
    ]);

    // For AdminShell counts array order compatibility: [products, officialPartners, articles, edu, innovation, jobs, inquiries, users, assistantEntries, contentOverrides]
    const counts = [products, officialPartners, articles, education, innovation, jobs, inquiries, users, assistantCfg, siteContents];

    return sendSuccess(res, {
      products,
      productsHighlighted,
      officialPartners,
      officialPartnersPublished,
      articles,
      education,
      innovation,
      jobs,
      inquiries,
      users,
      assistantEntries: assistantCfg,
      contentOverrides: siteContents,
      counts, // extra for frontend convenience
    });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = router;
