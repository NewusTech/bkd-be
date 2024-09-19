'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'userkgb_id', {
      type: Sequelize.TEXT
    });
    await queryInterface.addColumn('Users', 'userpenghargaan_id', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('Users', 'userpelatihan_id', {
      type: Sequelize.TEXT
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'userkgb_id');
    await queryInterface.removeColumn('Users', 'userpenghargaan_id');
    await queryInterface.removeColumn('Users', 'userpelatihan_id');
  }
};
