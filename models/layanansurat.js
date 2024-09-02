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
    header: DataTypes.STRING,
    body: DataTypes.STRING,
    footer: DataTypes.STRING,
    nomor: DataTypes.STRING,
    perihal: DataTypes.STRING,
    catatan: DataTypes.STRING,
    tembusan: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Layanan_surat',
  });
  return Layanan_surat;
};