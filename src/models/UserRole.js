const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Role = require("./Role");

const UserRole = sequelize.define(
  "UserRole",
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
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Role, key: "id" },
    },
  },
  {
    underscored: true,
    tableName: "user_roles",
    indexes: [{ unique: true, fields: ["user_id", "role_id"] }],
  }
);

User.belongsToMany(Role, { through: UserRole, foreignKey: "user_id", otherKey: "role_id" });
Role.belongsToMany(User, { through: UserRole, foreignKey: "role_id", otherKey: "user_id" });

module.exports = UserRole;
