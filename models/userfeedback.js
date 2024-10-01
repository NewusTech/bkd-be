'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User_feedback extends Model {
    static associate(models) {
      User_feedback.belongsTo(models.Layanan, {
        foreignKey: 'layanan_id',
      });
      User_feedback.belongsTo(models.User_info, {
        foreignKey: 'userinfo_id',
      });
      User_feedback.belongsTo(models.Bidang, {
        foreignKey: 'bidang_id',
      });
    }
  }
  User_feedback.init({
    // no_skm: DataTypes.STRING,
    userinfo_id: DataTypes.INTEGER,
    layanan_id: DataTypes.INTEGER,
    bidang_id: DataTypes.INTEGER,
    question_1: DataTypes.INTEGER,
    question_2: DataTypes.INTEGER,
    question_3: DataTypes.INTEGER,
    question_4: DataTypes.INTEGER,
    feedback: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'User_feedback',
  });
  return User_feedback;
};