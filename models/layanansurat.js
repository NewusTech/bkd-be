'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Layanan_surat extends Model {
    static associate(models) {
      Layanan_surat.belongsTo(models.Layanan, {
        foreignKey: 'layanan_id',
      });
    }
  }
  Layanan_surat.init({
    layanan_id: DataTypes.INTEGER,
    header: DataTypes.TEXT,
    body: DataTypes.TEXT,
    footer: DataTypes.TEXT,
    nomor: DataTypes.STRING,
    perihal: DataTypes.TEXT,
    catatan: DataTypes.TEXT,
    tembusan: DataTypes.TEXT,
    nama_pj: DataTypes.TEXT,
    nip_pj: DataTypes.TEXT,
    jabatan_pj: DataTypes.TEXT,
    pangkat_pj: DataTypes.TEXT,
    unitkerja_pj: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'Layanan_surat',
  });
  return Layanan_surat;
};