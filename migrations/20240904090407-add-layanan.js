'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Layanans', 'penanggung_jawab', {
      type: Sequelize.STRING
    });
    await queryInterface.addColumn('Layanans', 'ketentuan', {
      type: Sequelize.TEXT
    });
    await queryInterface.addColumn('Layanans', 'langkah', {
      type: Sequelize.TEXT
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Layanans', 'penanggung_jawab');
    await queryInterface.removeColumn('Layanans', 'ketentuan');
    await queryInterface.removeColumn('Layanans', 'langkah');
  }
};
