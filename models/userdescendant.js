'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_descendant extends Model {
    static associate(models) {
      User_descendant.hasOne(models.User, {
        foreignKey: 'userdescendant_id',
      });
    }
  }
  User_descendant.init({
    user_id: DataTypes.INTEGER,
    nama: DataTypes.STRING,
    tempat_lahir: DataTypes.STRING,
    tanggal_lahir: DataTypes.DATE,
    jenis_kelamin: DataTypes.STRING,
    pekerjaan: DataTypes.STRING,
    status: DataTypes.STRING,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_descendant',
  });
  return User_descendant;
};