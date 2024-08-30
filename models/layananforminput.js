'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Layanan_form_input extends Model {
    static associate(models) {
      Layanan_form_input.belongsTo(models.Layanan_form, {
        foreignKey: 'layananform_id',
      });
      Layanan_form_input.belongsTo(models.Layanan_form_num, {
        foreignKey: 'layananformnum_id',
      });
    }
  }
  Layanan_form_input.init({
    data: DataTypes.STRING,
    layananform_id: DataTypes.INTEGER,
    layananformnum_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Layanan_form_input',
  });
  return Layanan_form_input;
};