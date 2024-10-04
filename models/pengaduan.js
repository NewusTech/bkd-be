'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pengaduan extends Model {
    static associate(models) {
      Pengaduan.belongsTo(models.Bidang, {
        foreignKey: 'bidang_id',
      });
      Pengaduan.belongsTo(models.Layanan, {
        foreignKey: 'layanan_id',
      });
      Pengaduan.belongsTo(models.User_info, {
        foreignKey: 'userinfo_id',
      });
      Pengaduan.belongsTo(models.User_info, {
        foreignKey: 'admin_id',
        as: 'Admin'
      });
      Pengaduan.belongsTo(models.User_info, {
        foreignKey: 'updated_by',
        as: 'Adminupdate'
      });
    }
  }
  Pengaduan.init({
    bidang_id: DataTypes.INTEGER,
    layanan_id: DataTypes.INTEGER,
    userinfo_id: DataTypes.INTEGER,
    status: DataTypes.SMALLINT,
    isi_pengaduan: DataTypes.STRING,
    judul_pengaduan: DataTypes.STRING,
    jawaban: DataTypes.STRING,
    image: DataTypes.STRING,
    updated_by: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Pengaduan',
  });
  return Pengaduan;
};