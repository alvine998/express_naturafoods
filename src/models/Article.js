const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Article = sequelize.define(
  "Article",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    thumbnail: {
      type: DataTypes.STRING(255),
    },
    titleID: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    titleEN: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    titleZN: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    excerpt: {
      type: DataTypes.TEXT("medium"),
    },
    keywords: {
      type: DataTypes.STRING(255),
    },
    status: {
      type: DataTypes.ENUM("draft", "published"),
      defaultValue: "draft",
      allowNull: false,
    },
    published_date: {
      type: DataTypes.DATEONLY,
    },
    contentID: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    contentEN: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    contentZN: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
  },
  {
    underscored: true,
  }
);

module.exports = Article;
