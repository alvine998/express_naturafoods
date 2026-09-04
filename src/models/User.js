const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    username: {
      type: DataTypes.STRING(32),
      allowNull: true,
      unique: true,
      validate: {
        is: /^[a-zA-Z0-9._-]+$/,
        len: [3, 32],
      },
    },
    role: {
      type: DataTypes.ENUM("admin", "super_admin"),
      allowNull: false,
      defaultValue: "admin",
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (!user.username && user.email) {
          const base = user.email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 32);
          user.username = base || `user_${Date.now()}`;
        }
        if (user.username) user.username = String(user.username).toLowerCase();
        user.password = await bcrypt.hash(user.password, 10);
      },
      beforeUpdate: async (user) => {
        if (user.changed("username") && user.username) {
          user.username = String(user.username).toLowerCase();
        }
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

module.exports = User;
