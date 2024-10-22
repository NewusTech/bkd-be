'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Manual_book extends Model {
    static associate(models) {
      Manual_book.belongsTo(models.Role, {
        foreignKey: 'role_id'
      });
    }
  }
  Manual_book.init({
    title: DataTypes.STRING,
    dokumen: DataTypes.STRING,
    video_tutorial: DataTypes.STRING,
    role_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Manual_book',
  });
  return Manual_book;
};