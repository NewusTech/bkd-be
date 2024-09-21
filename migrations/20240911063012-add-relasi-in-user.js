'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'bidang_id', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Users', 'layanan_id', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Users', 'userkepangkatan_id', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Users', 'userjabatan_id', {
      type: Sequelize.INTEGER
    });
    await queryInterface.addColumn('Users', 'userpendidikan_id', {
      type: Sequelize.INTEGER
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'bidang_id');
    await queryInterface.removeColumn('Users', 'layanan_id');
    await queryInterface.removeColumn('Users', 'userkepangkatan_id');
    await queryInterface.removeColumn('Users', 'userjabatan_id');
    await queryInterface.removeColumn('Users', 'userpendidikan_id');
  }
};
