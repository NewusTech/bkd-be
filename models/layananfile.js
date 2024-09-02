'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Layanan_file extends Model {
    static associate(models) {
      Layanan_file.belongsTo(models.Layanan, {
        foreignKey: 'layanan_id',
      });
    }
  }
  Layanan_file.init({
    layanan_id: DataTypes.INTEGER,
    nama: DataTypes.STRING,
    file: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Layanan_file',
  });
  return Layanan_file;
};