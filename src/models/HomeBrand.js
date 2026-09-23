const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const HomeBrand = sequelize.define(
  "HomeBrand",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    desc: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    brandIds: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "brand_ids",
    },
    sortIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_index",
    },
  },
  {
    tableName: "home_brands",
    underscored: true,
    indexes: [{ fields: ["sort_index"] }],
  }
);

module.exports = HomeBrand;
