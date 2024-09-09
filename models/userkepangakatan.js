'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_kepangkatan extends Model {
    static associate(models) {
      User_kepangkatan.hasOne(models.User, {
        foreignKey: 'userinfo_id',
      });
    }
  }
  User_kepangkatan.init({
    jenjang_kepangkatan: DataTypes.STRING,
    tmt: DataTypes.DATE,
    no_sk_pangkat: DataTypes.STRING,
    tgl_sk_pangkat: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_kepangkatan',
  });
  return User_kepangkatan;
};