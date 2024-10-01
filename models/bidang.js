'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Bidang extends Model {
    static associate(models) {
      Bidang.hasMany(models.User, {
        foreignKey: 'bidang_id',
      });
      Bidang.hasMany(models.Layanan, {
        foreignKey: 'bidang_id',
      });
      Bidang.hasMany(models.User_feedback, {
        foreignKey: 'bidang_id',
      });
    }
  }
  Bidang.init({
    nama: DataTypes.STRING,
    slug: DataTypes.STRING,
    pj: DataTypes.STRING,
    nip_pj: DataTypes.STRING,
    desc: DataTypes.TEXT,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Bidang',
  });
  return Bidang;
};