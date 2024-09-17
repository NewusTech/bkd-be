'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Bkd_profile extends Model {
    static associate(models) {
    }
  }
  Bkd_profile.init({
    about_bkd: DataTypes.TEXT,
    visi: DataTypes.TEXT,
    misi: DataTypes.TEXT,
    kontak: DataTypes.STRING,
    long: DataTypes.STRING,
    lang: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Bkd_profile',
  });
  return Bkd_profile;
};