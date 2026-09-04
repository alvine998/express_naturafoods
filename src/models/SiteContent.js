const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SiteContent = sequelize.define(
  "SiteContent",
  {
    locale: {
      type: DataTypes.STRING(5),
      primaryKey: true,
      validate: { isIn: [["id", "en", "zh"]] },
    },
    overrides: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "site_contents",
    underscored: true,
    timestamps: true,
    updatedAt: "updated_at",
    createdAt: "created_at",
  }
);

module.exports = SiteContent;
