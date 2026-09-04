const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    jti: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "refresh_tokens",
    underscored: true,
    indexes: [{ fields: ["user_id"] }, { fields: ["jti"] }],
  }
);

User.hasMany(RefreshToken, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });

module.exports = RefreshToken;
