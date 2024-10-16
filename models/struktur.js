
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Struktur extends Model {
    static associate(models) {
    }
  }
  Struktur.init({
    title: DataTypes.STRING,
    file: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Struktur',
  });
  return Struktur;
};