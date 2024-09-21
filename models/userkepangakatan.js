'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_kepangkatan extends Model {
    static associate(models) {
      User_kepangkatan.hasOne(models.User, {
        foreignKey: 'userkepangkatan_id',
      });
      User_kepangkatan.belongsTo(models.Pangkat, {
        foreignKey: 'pangkat_id',
      });
    }
  }
  User_kepangkatan.init({
    user_id: DataTypes.INTEGER,
    pangkat_id: DataTypes.INTEGER,
    // jenjang_kepangkatan: DataTypes.STRING,
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