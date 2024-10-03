'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Pangkats', [
      { nama: 'PNS', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'CPNS', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'I/a - Juru Muda', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'I/b - Juru Muda Tingkat I', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'I/c - Juru', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'I/d - Juru Tingkat I', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'II/a - Pengatur Muda', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'II/b - Pengatur Muda Tingkat I', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'II/c - Pengatur', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'II/d - Pengatur Tingkat I', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'III/a - Penata Muda', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'III/b - Penata Muda Tingkat I', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'III/c - Penata', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'III/d - Penata Tingkat I', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'IV/a - Pembina', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'IV/b - Pembina Tingkat I', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'IV/c - Pembina Utama Muda', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'IV/d - Pembina Utama Madya', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'IV/e - Pembina Utama', createdAt: new Date(), updatedAt: new Date() },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Pangkats', null, {});
  }
};
