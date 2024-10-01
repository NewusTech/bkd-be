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
      Layanan.hasMany(models.Layanan_form, {
        foreignKey: 'layanan_id',
      });
      Layanan.hasMany(models.Layanan_file, {
        foreignKey: 'layanan_id',
      });
      Layanan.hasOne(models.Layanan_surat, {
        foreignKey: 'layanan_id',
      });
      Layanan.hasMany(models.User_feedback, {
        foreignKey: 'layanan_id',
      });
    }
  }
  Layanan.init({
    nama: DataTypes.STRING,
    slug: DataTypes.STRING,
    desc: DataTypes.TEXT,
    penanggung_jawab: DataTypes.STRING,
    syarat: DataTypes.TEXT,
    ketentuan: DataTypes.TEXT,
    langkah: DataTypes.TEXT,
    bidang_id: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Layanan',
  });
  return Layanan;
};