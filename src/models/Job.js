const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Job = sequelize.define(
  "Job",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    dept: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    loc: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    desc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_published",
    },
  },
  {
    tableName: "jobs",
    underscored: true,
  }
);

module.exports = Job;
