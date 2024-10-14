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
        nama: 'Bidang Diklat',
        slug: 'bidang-diklat',
        desc: "Mengembangkan kompetensi ASN melalui program pendidikan dan pelatihan.",
        pj: "Siti Rahma",
        nip_pj: "8765432187654321",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Bidang Formasi Pengadaan',
        slug: 'bidang-formasi-pengadaan',
        desc: "Merencanakan dan mengelola kebutuhan formasi pegawai serta proses rekrutmen ASN.",
        pj: "Dedi Sunandar",
        nip_pj: "1234987654321098",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Bidang Pembinaan',
        slug: 'bidang-pembinaan',
        desc: "Melakukan pembinaan dan pengawasan untuk meningkatkan disiplin dan kinerja ASN.",
        pj: "Sri Handayani",
        nip_pj: "0987654321098765",
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
