'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Layanan_surats', 'nama_pj', {
      type: Sequelize.TEXT
    });
    await queryInterface.addColumn('Layanan_surats', 'nip_pj', {
      type: Sequelize.TEXT
    });
    await queryInterface.addColumn('Layanan_surats', 'pangkat_pj', {
      type: Sequelize.TEXT
    });
    await queryInterface.addColumn('Layanan_surats', 'jabatan_pj', {
      type: Sequelize.TEXT
    });
    await queryInterface.addColumn('Layanan_surats', 'unitkerja_pj', {
      type: Sequelize.TEXT
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Layanan_surats', 'nama_pj');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Layanan_surats', 'nip_pj');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Layanan_surats', 'pangkat_pj');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Layanan_surats', 'jabatan_pj');
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Layanan_surats', 'unitkerja_pj');
  },
};
