'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Bkd_profiles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      about_bkd: {
        type: Sequelize.TEXT
      },
      visi: {
        type: Sequelize.TEXT
      },
      misi: {
        type: Sequelize.TEXT
      },
      kontak: {
        type: Sequelize.STRING
      },
      long: {
        type: Sequelize.STRING
      },
      lang: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Bkd_profiles');
  }
};