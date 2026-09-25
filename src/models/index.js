const sequelize = require("../config/database");
const User = require("./User");
const Role = require("./Role");
const UserRole = require("./UserRole");
const Article = require("./Article");
const Product = require("./Product");
const Category = require("./Category");
const Brand = require("./Brand");
const OfficialPartner = require("./OfficialPartner");
const Education = require("./Education");
const Innovation = require("./Innovation");
const Job = require("./Job");
const Sale = require("./Sale");
const Inquiry = require("./Inquiry");
const SiteContent = require("./SiteContent");
const { AssistantConfig } = require("./AssistantConfig");
const { CompanySetting } = require("./CompanySetting");
const HomeBrand = require("./HomeBrand");
const SocialMedia = require("./SocialMedia");
const TokenBlacklist = require("./TokenBlacklist");
const Otp = require("./Otp");
const LoginAttempt = require("./LoginAttempt");
const RefreshToken = require("./RefreshToken");

// Associations
Category.hasMany(Product, { foreignKey: "category_id", as: "products" });
Product.belongsTo(Category, { foreignKey: "category_id", as: "category" });

Brand.hasMany(Product, { foreignKey: "brand_id", as: "products" });
Product.belongsTo(Brand, { foreignKey: "brand_id", as: "brand", onDelete: "SET NULL" });

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  Article,
  Product,
  Category,
  Brand,
  OfficialPartner,
  Education,
  Innovation,
  Job,
  Sale,
  Inquiry,
  SiteContent,
  AssistantConfig,
  CompanySetting,
  HomeBrand,
  SocialMedia,
  TokenBlacklist,
  Otp,
  LoginAttempt,
  RefreshToken,
};
