const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const LoginAttempt = sequelize.define(
  "LoginAttempt",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: User, key: "id" },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    ip_address: {
      type: DataTypes.STRING(45),
    },
    user_agent: {
      type: DataTypes.STRING(255),
    },
    status: {
      type: DataTypes.ENUM("success", "failed"),
      allowNull: false,
    },
    failure_reason: {
      type: DataTypes.STRING(255),
    },
  },
  {
    underscored: true,
    tableName: "login_attempts",
    indexes: [{ fields: ["user_id"] }, { fields: ["email"] }],
  }
);

User.hasMany(LoginAttempt, { foreignKey: "user_id" });
LoginAttempt.belongsTo(User, { foreignKey: "user_id" });

module.exports = LoginAttempt;
