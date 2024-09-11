'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'kecamatan_id', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('Users', 'desa_id', {
      type: Sequelize.TEXT
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'kecamatan_id');
    await queryInterface.removeColumn('Users', 'desa_id');
  }
};
