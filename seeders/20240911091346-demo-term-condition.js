'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const Term_conditions = [
      {
        desc: "<h2>Syarat dan Ketentuan Badan Kepegawaian Daerah (BKD)</h2> <h3>1. Pendahuluan</h3> <p>Selamat datang di Badan Kepegawaian Daerah (BKD). Dengan mengakses dan menggunakan layanan kami, Anda setuju untuk mematuhi dan terikat oleh Syarat dan Ketentuan yang ditetapkan di bawah ini. Mohon baca dengan seksama sebelum menggunakan layanan kami.</p>",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    await queryInterface.bulkInsert('Term_conditions', Term_conditions, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Term_conditions', null, {});
  }
};
