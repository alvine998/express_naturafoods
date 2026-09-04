const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/,
        len: [3, 64],
      },
    },
    cat: {
      type: DataTypes.ENUM("choco", "matcha"),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("home-brand", "small-pack", "general"),
      allowNull: false,
      defaultValue: "general",
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { len: [2, 120] },
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tag: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    img: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    desc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isHighlight: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_highlight",
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_published",
    },
  },
  {
    tableName: "products",
    underscored: true,
    indexes: [{ fields: ["is_highlight"] }, { fields: ["type"] }, { fields: ["cat"] }],
  }
);

module.exports = Product;
