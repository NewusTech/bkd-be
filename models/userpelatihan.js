'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_pelatihan extends Model {
    static associate(models) {
      User_pelatihan.hasOne(models.User, {
        foreignKey: 'userpelatihan_id',
      });
    }
  }
  User_pelatihan.init({
    user_id: DataTypes.INTEGER,
    uraian_pelatihan: DataTypes.STRING,
    lama_pelatihan: DataTypes.STRING,
    no_surat_pelatihan: DataTypes.STRING,
    tanggal_pelatihan: DataTypes.DATE,
    tempat_pelatihan: DataTypes.STRING,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_pelatihan',
  });
  return User_pelatihan;
};