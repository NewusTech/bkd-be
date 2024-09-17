'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Beritas extends Model {
    static associate(models) {
    }
  }
  Beritas.init({
    title: DataTypes.STRING,
    slug: DataTypes.STRING,
    desc: DataTypes.TEXT,
    image: DataTypes.STRING,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Beritas',
  });
  return Beritas;
};