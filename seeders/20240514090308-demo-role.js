'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const Roles = [
      {
        name: 'User',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Super Admin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Admin Verifikasi',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kepala Bidang',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sekretaris Dinas',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kepala Dinas',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sekretaris Daerah',
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    await queryInterface.bulkInsert('Roles', Roles, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Roles', null, {});
  }
};
