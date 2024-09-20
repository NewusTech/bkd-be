"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Selected_struktur extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Selected_struktur.belongsTo(models.Bkd_struktur, {
        foreignKey: "bkdstruktur_id",
        as: 'struktur'
        
      });
    }
  }
  Selected_struktur.init(
    {
      bkdstruktur_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      deletedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Selected_struktur",
    }
  );
  return Selected_struktur;
};
