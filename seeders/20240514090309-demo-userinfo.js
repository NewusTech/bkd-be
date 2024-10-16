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
        image_profile: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Super Admin',
        nip: 'superadmin',
        slug: "superadmin-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Admin Verifikasi Mutasi',
        nip: 'adminverifikasimutasi',
        slug: "adminverifikasimutasi-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kepala Bidang Mutasi',
        nip: 'kepalabidangmutasi',
        slug: "kepalabidangmutasi-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Admin Verifikasi Diklat',
        nip: 'adminverifikasidiklat',
        slug: "adminverifikasidiklat-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kepala Bidang Diklat',
        nip: 'kepalabidangdiklat',
        slug: "kepalabidangdiklat-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Admin Verifikasi Pengadaan',
        nip: 'adminverifikasipengadaan',
        slug: "adminverifikasipengadaan-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kepala Bidang Pengadaan',
        nip: 'kepalabidangpengadaan',
        slug: "kepalabidangpengadaan-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Admin Verifikasi Pembinaan',
        nip: 'adminverifikasipembinaan',
        slug: "adminverifikasipembinaan-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kepala Bidang Pembinaan',
        nip: 'kepalabidangpembinaan',
        slug: "kepalabidangpembinaan-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sekretaris Dinas',
        nip: 'sekdin',
        slug: "sekretarisdinas-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kepala Dinas',
        nip: 'kadis',
        slug: "kepaladinas-20240620041615213",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sekretaris Daerah',
        nip: 'sekda',
        slug: "sekretarisdaerah-20240620041615213",
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
