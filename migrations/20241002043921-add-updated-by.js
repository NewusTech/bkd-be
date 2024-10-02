'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Layanan_form_nums', 'updated_by', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Layanan_form_nums', 'no_request', {
      type: Sequelize.INTEGER
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Layanan_form_nums', 'updated_by');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Layanan_form_nums', 'no_request');
  }
};
