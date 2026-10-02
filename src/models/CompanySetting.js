const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DEFAULT_COMPANY_SETTING = {
  name: "PT Natura Inti Sukses",
  logo: null,
  description: null,
  visi: null,
  misi: null,
  visiBackground: null,
  visiPersonPhoto: null,
  visiPersonName: null,
  visiPersonPosition: null,
  misiBackground: null,
  misiPersonPhoto: null,
  misiPersonName: null,
  misiPersonPosition: null,
  careerBanner: null,
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
    visiBackground: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "visi_background",
    },
    visiPersonPhoto: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "visi_person_photo",
    },
    visiPersonName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "visi_person_name",
    },
    visiPersonPosition: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "visi_person_position",
    },
    misiBackground: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "misi_background",
    },
    misiPersonPhoto: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "misi_person_photo",
    },
    misiPersonName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "misi_person_name",
    },
    misiPersonPosition: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "misi_person_position",
    },
    careerBanner: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "career_banner",
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
