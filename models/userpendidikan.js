'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_pendidikan extends Model {
    static associate(models) {
      User_pendidikan.hasOne(models.User, {
        foreignKey: 'userpendidikan_id',
      });
    }
  }
  User_pendidikan.init({
    tingkat_pendidikan: DataTypes.STRING,
    program_study: DataTypes.STRING,
    institut: DataTypes.STRING,
    no_ijazah: DataTypes.STRING,
    tgl_ijazah: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_pendidikan',
  });
  return User_pendidikan;
};