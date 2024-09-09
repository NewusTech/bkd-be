'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Galeri extends Model {
    static associate(models) {
    }
  }
  Galeri.init({
    title: DataTypes.STRING,
    slug: DataTypes.STRING,
    image: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Galeri',
  });
  return Galeri;
};