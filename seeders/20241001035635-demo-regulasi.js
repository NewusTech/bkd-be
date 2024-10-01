module.exports = {
  up: async (queryInterface, Sequelize) => {
    const Regulasis = [
      {
        title: 'Regulasi BKD',
        file: 'https://newus-bucket.s3.ap-southeast-2.amazonaws.com/newus_lokal/regulasi/1727755295222-PERBUP SOTK 08 TH 2021.pdf',
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    await queryInterface.bulkInsert('Regulasis', Regulasis, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Regulasis', null, {});
  }
};
