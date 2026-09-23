const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Education = sequelize.define(
  "Education",
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
    duration: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    level: {
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
    cta: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    link: {
      type: DataTypes.STRING(500),
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
    tableName: "educations",
    underscored: true,
    indexes: [{ fields: ["sort_index"] }],
  }
);

module.exports = Education;
