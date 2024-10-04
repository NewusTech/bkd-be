'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Bkd_strukturs', 'bidang_id', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Bkd_strukturs', 'nip', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('Bkd_strukturs', 'golongan', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('Bkd_strukturs', 'status', {
      type: Sequelize.STRING
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Bkd_strukturs', 'bidang_id');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Bkd_strukturs', 'nip');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Bkd_strukturs', 'golongan');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Bkd_strukturs', 'status');
  },
};
