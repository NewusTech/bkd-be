'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Survey_form_num extends Model {
    static associate(models) {
      Survey_form_num.belongsTo(models.Layanan, {
        foreignKey: 'layanan_id',
      });
      Survey_form_num.hasMany(models.Survey_form_input, {
        foreignKey: 'surveyformnum_id',
      });
      Survey_form_num.belongsTo(models.User_info, {
        foreignKey: 'userinfo_id',
      });
    }
  }
  Survey_form_num.init({
    no_skm: DataTypes.STRING,
    userinfo_id: DataTypes.INTEGER,
    layanan_id: DataTypes.INTEGER,
    date: DataTypes.STRING,
    feedback: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'Survey_form_num',
  });
  return Survey_form_num;
};