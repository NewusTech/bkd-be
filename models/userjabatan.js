'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_jabatan extends Model {
    static associate(models) {
      User_jabatan.hasOne(models.User, {
        foreignKey: 'userjabatan_id',
      });
    }
  }
  User_jabatan.init({
    user_id: DataTypes.INTEGER,
    nama_jabatan: DataTypes.STRING,
    tmt: DataTypes.DATE,
    no_sk_pangkat: DataTypes.STRING,
    tgl_sk_pangkat: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_jabatan',
  });
  return User_jabatan;
};