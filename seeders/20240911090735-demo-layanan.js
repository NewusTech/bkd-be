module.exports = {
  up: async (queryInterface, Sequelize) => {
    const Layanans = [
      {
        nama: 'Layanan Kenaikan Pangkat',
        desc: 'Layanan ini ditujukan bagi pegawai negeri sipil (PNS) yang memenuhi syarat untuk kenaikan pangkat sesuai dengan aturan yang berlaku.',
        syarat: '1. SK pangkat terakhir, 2. SKP 2 tahun terakhir, 3. Surat keterangan tidak pernah dijatuhi hukuman disiplin, 4. Penilaian prestasi kerja.',
        penanggung_jawab: 'Sub Bagian Kenaikan Pangkat BKD',
        ketentuan: 'Pengajuan kenaikan pangkat dilakukan setiap 4 tahun sekali sesuai dengan peraturan perundang-undangan yang berlaku.',
        langkah: '1. Persiapkan berkas sesuai syarat, 2. Ajukan berkas ke BKD, 3. Tunggu proses verifikasi, 4. Terima SK kenaikan pangkat.',
        bidang_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Layanan Pensiun',
        desc: 'Layanan ini melayani pengurusan administrasi pensiun bagi PNS yang sudah memasuki masa pensiun sesuai dengan ketentuan yang berlaku.',
        syarat: '1. SK CPNS dan PNS, 2. SK Pangkat terakhir, 3. Surat keterangan pemberhentian dari instansi, 4. Kartu identitas PNS.',
        penanggung_jawab: 'Sub Bagian Pensiun BKD',
        ketentuan: 'Pensiun otomatis berlaku bagi PNS yang sudah mencapai usia pensiun, atau dapat diajukan lebih awal berdasarkan permohonan.',
        langkah: '1. Ajukan berkas pensiun ke BKD, 2. Tunggu proses verifikasi, 3. Penerbitan SK pensiun, 4. Terima hak pensiun.',
        bidang_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Layanan Mutasi PNS',
        desc: 'Layanan ini digunakan untuk mengajukan mutasi antar daerah, antar instansi, atau mutasi jabatan bagi PNS.',
        syarat: '1. Surat persetujuan atasan, 2. SK Pangkat terakhir, 3. Penilaian prestasi kerja, 4. SKP 2 tahun terakhir.',
        penanggung_jawab: 'Sub Bagian Mutasi BKD',
        ketentuan: 'Pengajuan mutasi dapat dilakukan jika ada kebutuhan organisasi dan disetujui oleh kedua instansi terkait.',
        langkah: '1. Ajukan permohonan mutasi, 2. Tunggu verifikasi dan persetujuan, 3. Terima surat keputusan mutasi, 4. Proses serah terima tugas.',
        bidang_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Layanan Cuti PNS',
        desc: 'Layanan ini memfasilitasi PNS untuk mengajukan berbagai jenis cuti, seperti cuti tahunan, cuti sakit, dan cuti besar.',
        syarat: '1. Surat permohonan cuti, 2. SK Pangkat terakhir, 3. SKP 1 tahun terakhir.',
        penanggung_jawab: 'Sub Bagian Cuti BKD',
        ketentuan: 'Cuti diberikan sesuai dengan ketentuan peraturan perundang-undangan dan kebijakan instansi.',
        langkah: '1. Ajukan permohonan cuti ke BKD, 2. Tunggu proses persetujuan, 3. Terima surat cuti, 4. Jalankan cuti sesuai waktu yang disetujui.',
        bidang_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nama: 'Layanan Pengembangan Karier',
        desc: 'Layanan ini membantu pengembangan karier PNS melalui pendidikan dan pelatihan (diklat), serta pengembangan kompetensi teknis dan manajerial.',
        syarat: '1. SK Pangkat terakhir, 2. SKP 2 tahun terakhir, 3. Surat rekomendasi dari atasan.',
        penanggung_jawab: 'Sub Bagian Diklat BKD',
        ketentuan: 'Pengembangan karier dilakukan berdasarkan kebutuhan organisasi dan potensi PNS yang bersangkutan.',
        langkah: '1. Ajukan permohonan pengembangan karier, 2. Ikuti diklat yang direkomendasikan, 3. Terima sertifikat pelatihan, 4. Terapkan hasil pelatihan dalam tugas.',
        bidang_id: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('Layanans', Layanans, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Layanan', null, {});
  }
};
