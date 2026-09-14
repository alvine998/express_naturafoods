const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Category = sequelize.define(
  "Category",
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
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { len: [2, 120] },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "categories",
    underscored: true,
    indexes: [{ fields: ["slug"], unique: true }, { fields: ["is_active"] }],
  }
);

module.exports = Category;
