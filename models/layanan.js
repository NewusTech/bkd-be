'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Layanan extends Model {
    static associate(models) {
      Layanan.hasMany(models.User, {
        foreignKey: 'layanan_id',
      });
      Layanan.belongsTo(models.Bidang, {
        foreignKey: 'bidang_id',
      });
    }
  }
  Layanan.init({
    nama: DataTypes.STRING,
    slug: DataTypes.STRING,
    desc: DataTypes.TEXT,
    syarat: DataTypes.TEXT,
    bidang_id: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Layanan',
  });
  return Layanan;
};