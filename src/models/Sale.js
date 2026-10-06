const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Sale = sequelize.define(
  "Sale",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM("m", "f"),
      allowNull: false,
      defaultValue: "m",
    },
    position_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    position_en: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    position_zn: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    whatsapp: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: { isEmail: true },
    },
    photo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    location_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    location_en: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    location_zn: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
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
    tableName: "sales",
    underscored: true,
    indexes: [{ fields: ["is_published"] }, { fields: ["sort_index"] }],
  }
);

module.exports = Sale;
