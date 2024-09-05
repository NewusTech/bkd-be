'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Term_condition extends Model {
    static associate(models) {
    }
  }
  Term_condition.init({
    desc: DataTypes.TEXT,
    desc_text: DataTypes.TEXT,
    privacy: DataTypes.STRING,
    privacy_text: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'Term_condition',
  });
  return Term_condition;
};