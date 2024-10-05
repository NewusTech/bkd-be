'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Pengaduans', 'updated_by', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Pengaduans', 'admin_id', {
      type: Sequelize.INTEGER
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Pengaduans', 'updated_by');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Pengaduans', 'admin_id');
  }
};
