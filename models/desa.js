'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Desa extends Model {
    static associate(models) {
      Desa.hasMany(models.User_info, {
        foreignKey: 'desa_id',
      });
    }
  }
  Desa.init({
    nama: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Desa',
  });
  return Desa;
};