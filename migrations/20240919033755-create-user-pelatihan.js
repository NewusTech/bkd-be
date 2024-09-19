'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('User_pelatihans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
      },
      uraian_pelatihan: {
        type: Sequelize.STRING
      },
      lama_pelatihan: {
        type: Sequelize.STRING
      },
      no_surat_pelatihan: {
        type: Sequelize.STRING
      },
      tanggal_pelatihan: {
        type: Sequelize.DATE,
      },
      tempat_pelatihan: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });

  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('User_pelatihans');
  }
};