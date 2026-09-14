const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Inquiry = sequelize.define(
  "Inquiry",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    whatsapp: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    interest: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: { isEmail: true },
    },
    message: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "inquiries",
    underscored: true,
    indexes: [{ fields: ["interest"] }, { fields: ["city"] }, { fields: ["created_at"] }],
  }
);

module.exports = Inquiry;
