'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pangkat extends Model {
    static associate(models) {
      Pangkat.hasMany(models.User_kepangkatan, {
        foreignKey: 'pangkat_id',
      });
    }
  }
  Pangkat.init({
    nama: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Pangkat',
  });
  return Pangkat;
};