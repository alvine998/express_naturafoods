const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DEFAULT_ASSISTANT = {
  waLink: "https://wa.me/6281234567890",
  persona: "You are NaturaFoods assistant, helpful for baking and HORECA ingredients.",
  tuning: { tone: "friendly", length: "medium", strict: false },
  copy: {
    id: { title: "Asisten NaturaFoods", sub: "Tanya tentang produk & resep", placeholder: "Tulis pesan...", send: "Kirim", quick: ["Produk", "Harga", "Kontak"], greet: "Halo! Ada yang bisa dibantu?", fallback: "Maaf, saya tidak mengerti.", wa: "Chat WhatsApp", contact: "Hubungi Kami" },
    en: { title: "NaturaFoods Assistant", sub: "Ask about products & recipes", placeholder: "Type a message...", send: "Send", quick: ["Products", "Price", "Contact"], greet: "Hello! How can I help?", fallback: "Sorry, I didn't understand.", wa: "Chat WhatsApp", contact: "Contact Us" },
    zh: { title: "NaturaFoods 助手", sub: "询问产品与配方", placeholder: "输入消息...", send: "发送", quick: ["产品", "价格", "联系"], greet: "你好！需要帮助吗？", fallback: "抱歉，我没理解。", wa: "WhatsApp 聊天", contact: "联系我们" },
  },
  knowledge: [],
};

const AssistantConfig = sequelize.define(
  "AssistantConfig",
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: "default",
    },
    waLink: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "wa_link",
    },
    persona: {
      type: DataTypes.TEXT("medium"),
      allowNull: false,
    },
    tuning: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { tone: "friendly", length: "medium", strict: false },
    },
    copy: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: DEFAULT_ASSISTANT.copy,
    },
    knowledge: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    tableName: "assistant_configs",
    underscored: true,
  }
);

module.exports = { AssistantConfig, DEFAULT_ASSISTANT };
