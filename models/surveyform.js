'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Survey_form extends Model {
    static associate(models) {
      Survey_form.belongsTo(models.Bidang, {
        foreignKey: 'bidang_id',
      });
      // Survey_form.hasMany(models.Survey_forminput, {
      //   foreignKey: 'layananform_id',
      // });
    }
  }
  Survey_form.init({
    field: DataTypes.STRING,
    desc: DataTypes.TEXT,
    bidang_id: DataTypes.INTEGER,
    status: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Survey_form',
  });
  return Survey_form;
};