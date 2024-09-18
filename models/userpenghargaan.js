'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_penghargaan extends Model {
    static associate(models) {
      User_penghargaan.hasOne(models.User, {
        foreignKey: 'userpenghargaan_id',
      });
    }
  }
  User_penghargaan.init({
    user_id: DataTypes.INTEGER,
    uraian_penghargaan: DataTypes.STRING,
    tanggal_penghargaan: DataTypes.DATE,
    instansi_penghargaan: DataTypes.STRING,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_penghargaan',
  });
  return User_penghargaan;
};