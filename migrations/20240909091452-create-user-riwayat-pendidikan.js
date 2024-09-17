'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('User_pendidikans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
      },
      tingkat_pendidikan: {
        type: Sequelize.STRING
      },
      program_study: {
        type: Sequelize.STRING,
      },
      institut: {
        type: Sequelize.STRING,
      },
      no_ijazah: {
        type: Sequelize.STRING,
      },
      tgl_ijazah: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable('User_pendidikans');
  }
};