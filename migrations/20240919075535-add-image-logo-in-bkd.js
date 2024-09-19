'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Bkd_profiles', 'logo', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('Bkd_profiles', 'image_bkd', {
      type: Sequelize.STRING
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Bkd_profiles', 'logo');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Bkd_profiles', 'image_bkd');
  }
};
