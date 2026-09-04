const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Otp = sequelize.define(
  "Otp",
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
    code_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("login", "password_reset"),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used_at: {
      type: DataTypes.DATE,
    },
  },
  {
    underscored: true,
    tableName: "otps",
    indexes: [{ fields: ["user_id", "type"] }],
  }
);

User.hasMany(Otp, { foreignKey: "user_id" });
Otp.belongsTo(User, { foreignKey: "user_id" });

module.exports = Otp;
