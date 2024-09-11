module.exports = {
  up: async (queryInterface, Sequelize) => {
    const Bidangs = [
      {
        nama: 'Bidang Mutasi',
        slug: 'bidang-mutasi',
        desc: "Mengurus perpindahan pegawai antar instansi.",
        pj: "Bambang",
        nip_pj: "1234567812345678",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Bidang Pengadaan',
        slug: 'bidang-pengadaan',
        desc: "Bertanggung jawab atas proses pengadaan pegawai baru.",
        pj: "Siti Rahma",
        nip_pj: "8765432187654321",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Bidang Pengembangan Karir',
        slug: 'bidang-pengembangan-karir',
        desc: "Mengelola pengembangan karir dan kenaikan pangkat pegawai.",
        pj: "Dedi Sunandar",
        nip_pj: "1234987654321098",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Bidang Kesejahteraan Pegawai',
        slug: 'bidang-kesejahteraan-pegawai',
        desc: "Bertugas dalam pengelolaan kesejahteraan dan tunjangan pegawai.",
        pj: "Sri Handayani",
        nip_pj: "0987654321098765",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Bidang Disiplin',
        slug: 'bidang-disiplin',
        desc: "Mengatur kepatuhan dan disiplin pegawai negeri sipil.",
        pj: "Agus Pranoto",
        nip_pj: "9876543210987654",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Bidang Pelatihan dan Pengembangan SDM',
        slug: 'bidang-pelatihan-pengembangan-sdm',
        desc: "Mengelola program pelatihan dan pengembangan kompetensi pegawai.",
        pj: "Rina Wijayanti",
        nip_pj: "4567891234567890",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('Bidangs', Bidangs, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Bidangs', null, {});
  }
};
