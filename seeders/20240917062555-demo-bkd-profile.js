module.exports = {
  up: async (queryInterface, Sequelize) => {
    const Bkd_profiles = [
      {
        about_bkd: 'Badan Kepegawaian Daerah (BKD) bertugas dalam pengelolaan kepegawaian, termasuk pengangkatan, pemberhentian, serta pengembangan kompetensi Aparatur Sipil Negara (ASN).',
        visi: 'Mewujudkan tata kelola kepegawaian yang profesional, berintegritas, dan transparan.',
        misi: "1. Meningkatkan kualitas pelayanan administrasi kepegawaian.\n2. Mengoptimalkan pengembangan kompetensi pegawai.\n3. Membangun sistem informasi kepegawaian yang terintegrasi.\n4. Mewujudkan kepegawaian yang responsif dan adaptif terhadap perubahan.\n5. Mendorong terciptanya ASN yang profesional dan berdaya saing tinggi.",
        kontak: "082112345673",
        long: "106.827183", // Koordinat lokasi
        lang: "-6.175394",  // Koordinat lokasi
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    await queryInterface.bulkInsert('Bkd_profiles', Bkd_profiles, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Bkd_profiles', null, {});
  }
};
