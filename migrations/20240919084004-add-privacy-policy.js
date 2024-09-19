'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Term_conditions', 'privacy_policy', {
      type: Sequelize.TEXT
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Term_conditions', 'privacy_policy');
  },
};
