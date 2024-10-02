'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Layanan_form_num extends Model {
    static associate(models) {
      Layanan_form_num.belongsTo(models.Layanan, {
        foreignKey: 'layanan_id',
      });
      Layanan_form_num.hasMany(models.Layanan_form_input, {
        foreignKey: 'layananformnum_id',
      });
      Layanan_form_num.belongsTo(models.User_info, {
        foreignKey: 'userinfo_id',
      });
      Layanan_form_num.belongsTo(models.User_info, {
        foreignKey: 'updated_by',
        as: 'Adminupdate'
      });
    }
  }
  Layanan_form_num.init({
    userinfo_id: DataTypes.INTEGER,
    no_request: DataTypes.STRING,
    layanan_id: DataTypes.INTEGER,
    fileoutput: DataTypes.STRING,
    pesan: DataTypes.STRING,
    tgl_selesai: DataTypes.DATEONLY,
    isonline: DataTypes.INTEGER,
    status: DataTypes.SMALLINT,
    updated_by: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Layanan_form_num',
  });
  return Layanan_form_num;
};