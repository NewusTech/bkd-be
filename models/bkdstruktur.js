'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Bkd_struktur extends Model {
    static associate(models) {
    }
  }
  Bkd_struktur.init({
    nama: DataTypes.STRING,
    slug: DataTypes.STRING,
    jabatan: DataTypes.STRING,
    image: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Bkd_struktur',
  });
  return Bkd_struktur;
};