'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_info extends Model {
    static associate(models) {
      User_info.hasOne(models.User, {
        foreignKey: 'userinfo_id',
      });
      User_info.hasMany(models.Survey_form_num, {
        foreignKey: 'userinfo_id',
      });
      User_info.hasMany(models.Layanan_form_num, {
        foreignKey: 'userinfo_id',
      });
      User_info.belongsTo(models.Kecamatan, {
        foreignKey: 'kecamatan_id',
      });
      User_info.belongsTo(models.Desa, {
        foreignKey: 'desa_id',
      });
    }
  }
  User_info.init({
    name: DataTypes.STRING,
    nip: {
      type: DataTypes.STRING,
      unique: true,
    },
    nik: {
      type: DataTypes.STRING,
      unique: true,
    },
    slug: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      unique: true,
    },
    telepon: DataTypes.STRING,
    image_profile: DataTypes.STRING,
    kecamatan_id: DataTypes.INTEGER,
    desa_id: DataTypes.INTEGER,
    rt: DataTypes.STRING,
    rw: DataTypes.STRING,
    alamat: DataTypes.STRING,
    agama: DataTypes.INTEGER,
    tempat_lahir: DataTypes.STRING,
    tgl_lahir: DataTypes.DATEONLY,
    gender: DataTypes.SMALLINT,
    goldar: DataTypes.SMALLINT,
    user_id: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_info',
  });
  return User_info;
};