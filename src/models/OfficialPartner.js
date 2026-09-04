const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OfficialPartner = sequelize.define(
  "OfficialPartner",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      validate: { is: /^[a-z0-9-_]+$/i, len: [2, 64] },
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    background: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_published",
    },
    link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "official_partners",
    underscored: true,
    indexes: [{ fields: ["is_published"] }, { fields: ["order"] }],
  }
);

module.exports = OfficialPartner;
