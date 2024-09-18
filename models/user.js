'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Role, {
        foreignKey: 'role_id',
      });

      User.belongsTo(models.User_info, {
        foreignKey: 'userinfo_id',
      });

      User.belongsTo(models.Bidang, {
        foreignKey: 'bidang_id',
      });

      User.belongsTo(models.Layanan, {
        foreignKey: 'layanan_id',
      });

      User.belongsTo(models.User_kepangkatan, {
        foreignKey: 'userkepangkatan_id',
      });

      User.belongsTo(models.User_jabatan, {
        foreignKey: 'userjabatan_id',
      });

      User.belongsTo(models.User_pendidikan, {
        foreignKey: 'userpendidikan_id',
      });

      User.belongsTo(models.User_KGB, {
        foreignKey: 'userkgb_id',
      });
      // User.belongsTo(models.User_dokumen, {
      //   foreignKey: 'userdokumen_id',
      // });
      User.belongsToMany(models.Permission, {
        through: 'User_permissions',
        as: 'permissions',
        foreignKey: 'user_id'
      });
    }
  }
  User.init({
    password: DataTypes.STRING,
    slug: DataTypes.STRING,
    role_id: DataTypes.INTEGER,
    userinfo_id: DataTypes.INTEGER,
    bidang_id: DataTypes.INTEGER,
    layanan_id: DataTypes.INTEGER,
    userkepangkatan_id: DataTypes.INTEGER,
    userpendidikan_id: DataTypes.INTEGER,
    userjabatan_id: DataTypes.INTEGER,
    userkgb_id: DataTypes.INTEGER,
    // userdokumen_id: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    resetpasswordtoken: DataTypes.STRING,
    resetpasswordexpires: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};