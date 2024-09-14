'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('User_dokumens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sk_80: {
        type: Sequelize.STRING
      },
      sk_100: {
        type: Sequelize.STRING
      },
      kartu_pegawai: {
        type: Sequelize.STRING
      },
      ktp: {
        type: Sequelize.STRING
      },
      kk: {
        type: Sequelize.STRING
      },
      npwp: {
        type: Sequelize.STRING
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
    await queryInterface.dropTable('User_dokumens');
  }
};