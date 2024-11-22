'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Provinsi extends Model {
    static associate(models) {
      Provinsi.hasMany(models.User_info, {
        foreignKey: 'provinsi_id',
      });
    }
  }
  Provinsi.init({
    nama: DataTypes.STRING,
}, {
    sequelize,
    modelName: 'Provinsi',
  });
  return Provinsi;
};