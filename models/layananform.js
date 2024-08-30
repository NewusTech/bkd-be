'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Layanan_form extends Model {
    static associate(models) {
      Layanan_form.belongsTo(models.Layanan, {
        foreignKey: 'layanan_id',
      });
      Layanan_form.hasMany(models.Layanan_form_input, {
        foreignKey: 'layananform_id',
      });
    }
  }
  Layanan_form.init({
    field: DataTypes.STRING,
    tipedata: DataTypes.STRING,
    datajson: DataTypes.JSON,
    maxinput: DataTypes.INTEGER,
    mininput: DataTypes.INTEGER,
    layanan_id: DataTypes.INTEGER,
    isrequired: DataTypes.INTEGER,
    status: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Layanan_form',
  });
  return Layanan_form;
};