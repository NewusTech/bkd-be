'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Banner extends Model {
    static associate(models) {
    }
  }
  Banner.init({
    image: DataTypes.STRING,
    image_potrait: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Banner',
  });
  return Banner;
};