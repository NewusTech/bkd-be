'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('User_infos', 'kecamatan_id', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('User_infos', 'desa_id', {
      type: Sequelize.TEXT
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('User_infos', 'kecamatan_id');
    await queryInterface.removeColumn('User_infos', 'desa_id');
  }
};
