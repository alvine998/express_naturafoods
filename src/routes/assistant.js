const express = require("express");
const { AssistantConfig, DEFAULT_ASSISTANT } = require("../models/AssistantConfig");
const authMiddleware = require("../middleware/auth");
const { sendSuccess, sendError } = require("../utils/envelope");

const publicRouter = express.Router();
const adminRouter = express.Router();
adminRouter.use(authMiddleware);

function serialize(cfg) {
  const j = cfg.toJSON();
  return {
    id: j.id,
    waLink: j.waLink || j.wa_link,
    persona: j.persona,
    tuning: j.tuning,
    copy: j.copy,
    knowledge: j.knowledge,
    updatedAt: j.updatedAt || j.updated_at,
  };
}

async function getOrCreateDefault() {
  let cfg = await AssistantConfig.findByPk("default");
  if (!cfg) {
    cfg = await AssistantConfig.create({
      id: "default",
      waLink: DEFAULT_ASSISTANT.waLink,
      persona: DEFAULT_ASSISTANT.persona,
      tuning: DEFAULT_ASSISTANT.tuning,
      copy: DEFAULT_ASSISTANT.copy,
      knowledge: DEFAULT_ASSISTANT.knowledge,
    });
  }
  return cfg;
}

// GET /assistant/config - public + admin cached 5min (header)
publicRouter.get("/config", async (req, res) => {
  try {
    const cfg = await getOrCreateDefault();
    res.setHeader("Cache-Control", "public, max-age=300");
    return sendSuccess(res, serialize(cfg));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.put("/config", async (req, res) => {
  try {
    const { waLink, persona, tuning, copy, knowledge } = req.body;
    let cfg = await AssistantConfig.findByPk("default");
    if (!cfg) cfg = await getOrCreateDefault();
    if (waLink !== undefined) cfg.waLink = waLink;
    if (persona !== undefined) cfg.persona = persona;
    if (tuning !== undefined) cfg.tuning = tuning;
    if (copy !== undefined) cfg.copy = copy;
    if (knowledge !== undefined) cfg.knowledge = knowledge;
    await cfg.save();
    return sendSuccess(res, serialize(cfg));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

adminRouter.post("/config/reset", async (req, res) => {
  try {
    let cfg = await AssistantConfig.findByPk("default");
    if (!cfg) cfg = await getOrCreateDefault();
    await cfg.update({
      waLink: DEFAULT_ASSISTANT.waLink,
      persona: DEFAULT_ASSISTANT.persona,
      tuning: DEFAULT_ASSISTANT.tuning,
      copy: DEFAULT_ASSISTANT.copy,
      knowledge: DEFAULT_ASSISTANT.knowledge,
    });
    return sendSuccess(res, serialize(cfg));
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

// Optional chat proxy: POST /assistant/chat
publicRouter.post("/chat", async (req, res) => {
  try {
    const { message, locale } = req.body;
    if (!message) return sendError(res, { code: "VALIDATION_ERROR", message: "message is required", status: 422 });
    const lc = locale && ["id", "en", "zh"].includes(locale) ? locale : "id";
    const cfg = await getOrCreateDefault();
    const data = cfg.toJSON();
    // simple resolveReply logic server-side: keyword match
    const q = String(message).toLowerCase();
    let matched = null;
    let reply = null;
    const knowledge = data.knowledge || [];
    for (const entry of knowledge) {
      const keywords = entry.keywords || [];
      if (keywords.some((k) => q.includes(String(k).toLowerCase()))) {
        matched = entry;
        reply = entry.reply[lc] || entry.reply["id"] || entry.reply["en"];
        break;
      }
    }
    if (!reply) {
      const copy = data.copy[lc] || data.copy["id"];
      reply = copy?.fallback || DEFAULT_ASSISTANT.copy[lc].fallback;
    }
    return sendSuccess(res, { reply, matchedEntryId: matched?.id || null });
  } catch (err) {
    return sendError(res, { code: "INTERNAL_ERROR", message: err.message, status: 500 });
  }
});

module.exports = { publicRouter, adminRouter };
