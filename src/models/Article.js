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
    // NOTE: explicit `field` mapping is required. With `underscored: true`
    // Sequelize would otherwise map excerptID -> `excerpt_i_d`
    // (and excerptEN -> `excerpt_e_n`), but the real columns created by
    // migrations/2026-10-12-add-localized-excerpt-and-career-banner.sql
    // and seed.js migrateArticleExcerpts() are `excerpt_id/en/zn`.
    // Missing mapping broke every articles query with:
    //   Unknown column 'excerpt_i_d' in 'field list'
    excerptID: {
      type: DataTypes.TEXT("medium"),
      field: "excerpt_id",
    },
    excerptEN: {
      type: DataTypes.TEXT("medium"),
      field: "excerpt_en",
    },
    excerptZN: {
      type: DataTypes.TEXT("medium"),
      field: "excerpt_zn",
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
    sortIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_index",
    },
  },
  {
    underscored: true,
    indexes: [{ fields: ["sort_index"] }],
  }
);

module.exports = Article;
