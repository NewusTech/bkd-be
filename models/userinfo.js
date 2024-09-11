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
    kecamatan_id: DataTypes.INTEGER,
    desa_id: DataTypes.INTEGER,
    alamat: DataTypes.STRING,
    agama: DataTypes.INTEGER,
    tempat_lahir: DataTypes.STRING,
    tgl_lahir: DataTypes.DATEONLY,
    status_kawin: DataTypes.SMALLINT,
    gender: DataTypes.SMALLINT,
    pekerjaan: DataTypes.STRING,
    goldar: DataTypes.SMALLINT,
    pendidikan: DataTypes.SMALLINT,
    pas_photo: DataTypes.STRING,
    sk_cpns: DataTypes.STRING,
    sk_pns: DataTypes.STRING,
    akta_kelahiran: DataTypes.STRING,
    file_ktp: DataTypes.STRING,
    file_kk: DataTypes.STRING,
    sk_konversi_nip: DataTypes.STRING,
    kartu_bpjs: DataTypes.STRING,
    kartu_npwp: DataTypes.STRING,
    deletedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User_info',
  });
  return User_info;
};