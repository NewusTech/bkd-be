'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BkdProfile extends Model {
    static associate(models) {
    }
  }
  BkdProfile.init({
    about_bkd: DataTypes.TEXT,
    kontak: DataTypes.STRING,
    long: DataTypes.STRING,
    lang: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'BkdProfile',
  });
  return BkdProfile;
};