'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Kecamatan extends Model {
    static associate(models) {
      Kecamatan.hasMany(models.User_info, {
        foreignKey: 'kecamatan_id',
      });
    }
  }
  Kecamatan.init({
    nama: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Kecamatan',
  });
  return Kecamatan;
};