'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const Kecamatans = [
      { nama: 'Metro Kibang', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Batanghari', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Sekampung', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Margatiga', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Sekampung Udik', createdAt: new Date(), updatedAt: new Date() },

      { nama: 'Jabung', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Pasir Sakti', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Waway Karya', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Marga Sekampung', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Labuhan Maringgai', createdAt: new Date(), updatedAt: new Date() },

      { nama: 'Mataram Baru', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Bandar Sribawono', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Melinting', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Gunung Pelindung', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Way Jepara', createdAt: new Date(), updatedAt: new Date() },

      { nama: 'Braja Slebah', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Labuhan Ratu', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Sukadana', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Bumi Agung', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Batanghari Nuban', createdAt: new Date(), updatedAt: new Date() },
      
      { nama: 'Pekalongan', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Raman Utara', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Purbolinggo', createdAt: new Date(), updatedAt: new Date() },
      { nama: 'Way Bungur', createdAt: new Date(), updatedAt: new Date() },

    ];

    await queryInterface.bulkInsert('Kecamatans', Kecamatans, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Kecamatans', null, {});
  }
};
