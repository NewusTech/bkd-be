'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'userspouse_id', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Users', 'userdescendant_id', {
      type: Sequelize.INTEGER
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'userspouse_id');
    await queryInterface.removeColumn('Users', 'userdescendant_id');
  }
};
