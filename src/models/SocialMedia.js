const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SocialMedia = sequelize.define(
  "SocialMedia",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    image: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    instagram: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    facebook: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    tiktok: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    sortIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_index",
    },
  },
  {
    tableName: "social_media",
    underscored: true,
    indexes: [{ fields: ["sort_index"] }],
  }
);

module.exports = SocialMedia;
