module.exports = {
  up: async (queryInterface, Sequelize) => {
    const Manual_books = [
      {
        title: 'Manual Book Superadmin',
        dokumen: 'https://newus-bucket.s3.ap-southeast-2.amazonaws.com/newus_lokal/manualbook/1727853618297-Manual_Book_MPP-Superadmin.pdf',
        role_id: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    await queryInterface.bulkInsert('Manual_books', Manual_books, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Manual_books', null, {});
  }
};
