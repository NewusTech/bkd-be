'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Survey_form_input extends Model {
    static associate(models) {
      Survey_form_input.belongsTo(models.Survey_form, {
        foreignKey: 'surveyform_id',
      });
      Survey_form_input.belongsTo(models.Survey_form_num, {
        foreignKey: 'surveyformnum_id',
      });
    }
  }
  Survey_form_input.init({
    nilai: DataTypes.STRING,
    surveyform_id: DataTypes.INTEGER,
    surveyformnum_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Survey_form_input',
  });
  return Survey_form_input;
};