'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_dokumen extends Model {
    static associate(models) {
    }
  }
  User_dokumen.init({
    sk_80: DataTypes.STRING,
    sk_100: DataTypes.STRING,
    kartu_pegawai: DataTypes.STRING,
    ktp: DataTypes.STRING,
    kk: DataTypes.STRING,
    npwp: DataTypes.STRING,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_dokumen',
  });
  return User_dokumen;
};