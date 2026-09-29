const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PromoBanner = sequelize.define(
  "PromoBanner",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { notEmpty: true },
    },
    description: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: { notEmpty: true },
    },
  },
  {
    tableName: "promo_banners",
    underscored: true,
    indexes: [{ fields: ["status"] }],
  }
);

module.exports = PromoBanner;
