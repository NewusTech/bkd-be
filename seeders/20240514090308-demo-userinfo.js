'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const User_infos = [
      {
        name: 'Newus',
        nip: '1234567812345678',
        nik: '8765432187654321',
        slug: "Newus-20240620041615213",
        email: 'newus@gmail.com',
        telepon: '086969696969',
        alamat: 'Bandar Lampung',
        agama: 1,
        tempat_lahir: 'Bandar Lampung',
        tgl_lahir: '1999-08-07',
        gender: 1,
        goldar: 1,
        pendidikan: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Super Admin',
        nip: 'superadmin',
        slug: "superadmin-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('User_infos', User_infos, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('User_infos', null, {});
  }
};
