'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Regulasi extends Model {
    static associate(models) {
    }
  }
  Regulasi.init({
    title: DataTypes.STRING,
    file: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Regulasi',
  });
  return Regulasi;
};