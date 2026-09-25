const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DEFAULT_COMPANY_SETTING = {
  name: "PT Natura Inti Sukses",
  logo: null,
  description: null,
  visi: null,
  misi: null,
  tagline: null,
  email: null,
  phone: null,
  whatsapp: null,
  address: null,
  website: null,
  instagram: null,
  facebook: null,
  tiktok: null,
  youtube: null,
  mapsUrl: null,
};

const CompanySetting = sequelize.define(
  "CompanySetting",
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: "default",
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    logo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    visi: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    misi: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    tagline: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    whatsapp: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
    },
    website: {
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
    youtube: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    mapsUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "maps_url",
    },
  },
  {
    tableName: "company_settings",
    underscored: true,
  }
);

module.exports = { CompanySetting, DEFAULT_COMPANY_SETTING };
