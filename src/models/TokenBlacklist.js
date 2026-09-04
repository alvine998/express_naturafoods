const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TokenBlacklist = sequelize.define(
  "TokenBlacklist",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    jti: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    underscored: true,
    tableName: "token_blacklist",
  }
);

module.exports = TokenBlacklist;
