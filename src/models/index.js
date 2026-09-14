const sequelize = require("../config/database");
const User = require("./User");
const Role = require("./Role");
const UserRole = require("./UserRole");
const Article = require("./Article");
const Product = require("./Product");
const Category = require("./Category");
const OfficialPartner = require("./OfficialPartner");
const Education = require("./Education");
const Innovation = require("./Innovation");
const Job = require("./Job");
const Sale = require("./Sale");
const Inquiry = require("./Inquiry");
const SiteContent = require("./SiteContent");
const { AssistantConfig } = require("./AssistantConfig");
const HomeBrand = require("./HomeBrand");
const TokenBlacklist = require("./TokenBlacklist");
const Otp = require("./Otp");
const LoginAttempt = require("./LoginAttempt");
const RefreshToken = require("./RefreshToken");

// Associations
Category.hasMany(Product, { foreignKey: "category_id", as: "products" });
Product.belongsTo(Category, { foreignKey: "category_id", as: "category" });

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  Article,
  Product,
  Category,
  OfficialPartner,
  Education,
  Innovation,
  Job,
  Sale,
  Inquiry,
  SiteContent,
  AssistantConfig,
  HomeBrand,
  TokenBlacklist,
  Otp,
  LoginAttempt,
  RefreshToken,
};
