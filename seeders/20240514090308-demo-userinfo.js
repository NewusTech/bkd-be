'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const User_infos = [
      {
        name: 'Super Admin',
        nip: 'superadmin',
        slug: "superadmin-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
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
        status_kawin: 1,
        gender: 1,
        pekerjaan: "Hacker Akhirat",
        goldar: 1,
        pendidikan: 1,
        sk_cpns: null,
        sk_pns: null,
        akta_kelahiran: null,
        file_ktp: null,
        file_kk: null,
        sk_konversi_nip: null,
        kartu_bpjs: null,
        kartu_npwp: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    await queryInterface.bulkInsert('User_infos', User_infos, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('User_infos', null, {});
  }
};
