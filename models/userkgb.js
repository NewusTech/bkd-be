'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_kgb extends Model {
    static associate(models) {
      User_kgb.hasOne(models.User, {
        foreignKey: 'userkgb_id',
      });
    }
  }
  User_kgb.init({
    user_id: DataTypes.INTEGER,
    uraian_berkala: DataTypes.STRING,
    tmt: DataTypes.DATE,
    no_sk_pangkat: DataTypes.STRING,
    tgl_sk_pangkat: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_kgb',
  });
  return User_kgb;
};