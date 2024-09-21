'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_spouse extends Model {
    static associate(models) {
      User_spouse.hasOne(models.User, {
        foreignKey: 'userspouse_id',
      });
    }
  }
  User_spouse.init({
    user_id: DataTypes.INTEGER,
    nama: DataTypes.STRING,
    tempat_lahir: DataTypes.STRING,
    tanggal_lahir: DataTypes.DATE,
    tanggal_pernikahan: DataTypes.STRING,
    pekerjaan: DataTypes.STRING,
    status: DataTypes.STRING,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_spouse',
  });
  return User_spouse;
};