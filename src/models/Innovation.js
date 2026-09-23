const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Innovation = sequelize.define(
  "Innovation",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    desc: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    tag: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    img: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    eyebrow: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    cta: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_published",
    },
    sortIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_index",
    },
  },
  {
    tableName: "innovations",
    underscored: true,
    indexes: [{ fields: ["sort_index"] }],
  }
);

module.exports = Innovation;
