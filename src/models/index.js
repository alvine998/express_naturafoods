const sequelize = require("../config/database");
const User = require("./User");
const Role = require("./Role");
const UserRole = require("./UserRole");
const Article = require("./Article");
const Product = require("./Product");
const OfficialPartner = require("./OfficialPartner");
const Education = require("./Education");
const Innovation = require("./Innovation");
const Job = require("./Job");
const Inquiry = require("./Inquiry");
const SiteContent = require("./SiteContent");
const { AssistantConfig } = require("./AssistantConfig");
const TokenBlacklist = require("./TokenBlacklist");
const Otp = require("./Otp");
const LoginAttempt = require("./LoginAttempt");
const RefreshToken = require("./RefreshToken");

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  Article,
  Product,
  OfficialPartner,
  Education,
  Innovation,
  Job,
  Inquiry,
  SiteContent,
  AssistantConfig,
  TokenBlacklist,
  Otp,
  LoginAttempt,
  RefreshToken,
};
