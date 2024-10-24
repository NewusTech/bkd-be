const { response } = require('../helpers/response.formatter');

const { Bidang, Layanan, Layanan_form_num, User_feedback, User_info, Bkd_struktur, Pengaduan } = require('../models');
const { generatePagination } = require('../pagination/pagination');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const { finished } = require('nodemailer/lib/xoauth2');

module.exports = {
    
    // get dashboard superadmin
    getDashboardSuperadmin: async (req, res) => {
        try {
            const { year, bidang_id, start_date, end_date, search, page, limit } = req.query;
    
            const currentYear = parseInt(year) || new Date().getFullYear();
            const pageNumber = parseInt(page) || 1;
            const pageSize = parseInt(limit) || 10;
            const offset = (pageNumber - 1) * pageSize;
    
            const getLastSixMonths = (year) => {
                const months = [];
                for (let i = 5; i >= 0; i--) {
                    const startDate = new Date(year, new Date().getMonth() - i, 1);
                    const endDate = new Date(year, new Date().getMonth() - i + 1, 0);
                    months.push({ startDate, endDate });
                }
                return months;
            };
    
            const lastSixMonths = getLastSixMonths(currentYear);
            const monthlyCounts = await Promise.all(lastSixMonths.map(async ({ startDate, endDate }) => {
                const monthName = startDate.toLocaleString('default', { month: 'long' });
                const permohonanCount = await Layanan_form_num.count({
                    where: {
                        createdAt: { [Op.between]: [startDate, endDate] }
                    }
                });
                return { month: monthName, permohonanCount };
            }));
    
            const countpegawaibyBidang = await Bidang.findAll({
                include: [{
                    model: Bkd_struktur,
                    as: 'Bkd_struktur',
                    attributes: ['id', 'nama'],
                }],
                where: {
                    deletedAt: null
                },
                attributes: ['id', 'nama'],
            });
            
            const formattedCountPegawaiByBidang = countpegawaibyBidang.map(bidang => ({
                id: bidang.id,
                name: bidang.nama,
                pegawai_count: bidang.Bkd_struktur ? bidang.Bkd_struktur.length : 0,
            }));
    
            // get count by Bidang
            const countbyBidang = await Bidang.findAll({
                include: [{
                    model: Layanan,
                    as: 'Layanans',
                    include: [{
                        model: Layanan_form_num,
                        attributes: ['id'],
                        where: {
                            createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                        }
                    }],
                    attributes: ['id', 'nama'],
                    // where: {
                    //     deletedAt: null // Pastikan Layanan yang diambil belum dihapus (soft delete)
                    // }
                }],
                where: {
                    deletedAt: null
                },
                attributes: ['id', 'nama'],
            });
    
            const formattedCountByBidang = countbyBidang.map(bidang => ({
                id: bidang.id,
                name: bidang.nama,
                permohonan_count: bidang.Layanans.reduce((total, layanan) => total + layanan.Layanan_form_nums.length, 0),
            }));
            
            const whereClause = {};
            if (search) {
                whereClause.name = { [Op.like]: `%${search}%` };
            }
            const whereClause2 = {};
            if (bidang_id) {
                whereClause.bidang_id = bidang_id;
            }
            if (start_date && end_date) {
                whereClause2.createdAt = { [Op.between]: [new Date(start_date), new Date(end_date)] };
            } else if (start_date) {
                whereClause2.createdAt = { [Op.gte]: new Date(start_date) };
            } else if (end_date) {
                whereClause2.createdAt = { [Op.lte]: new Date(end_date) };
            }
    
            const [permohonanCount, userFeedback, layananGets, totalCount] = await Promise.all([
                Layanan_form_num.count({
                    where: {
                        createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                    }
                }),
                User_feedback.count({
                    where: {
                        createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                    }
                }),
                Layanan.findAll({
                    attributes: ['id', 'nama', 'createdAt'],
                    where: {
                        ...whereClause,
                        deletedAt: null
                    },
                    include: [
                        { model: Bidang, attributes: ['id', 'nama'], where: {
                            ...whereClause,
                            deletedAt: null
                        }, },
                        { model: Layanan_form_num, attributes: ['id'] },
                        { model: User_feedback, attributes: ['id', 'question_1', 'question_2', 'question_3', 'question_4'] },
                        { model: Pengaduan, attributes: ['id'] }
                    ],
                    limit: pageSize,
                    offset: offset
                }),
                Layanan.count({
                    where: {
                        ...whereClause,
                        deletedAt: null
                    },
                    include: [
                        { model: Bidang, attributes: ['id', 'nama'], where: {
                            ...whereClause,
                            deletedAt: null
                        }, }
                    ],
                })
            ]);

            const calculateTotalNilai = (feedback) => {
                const nilaiPerUser =
                  feedback.question_1 * 25 +
                  feedback.question_2 * 25 +
                  feedback.question_3 * 25 +
                  feedback.question_4 * 25;
    
                return nilaiPerUser / 4;
            };
    
            const modifiedLayananGets = layananGets.map(layanan => {
                const { Bidang, User_feedback } = layanan.dataValues;
            
                // cek data feedback
                const totalNilaiFeedback = User_feedback && Array.isArray(User_feedback) 
                    ? User_feedback.reduce((total, feedback) => total + calculateTotalNilai(feedback), 0) 
                    : 0;
            
                const rataRataNilaiFeedback = User_feedback && User_feedback.length > 0 
                    ? totalNilaiFeedback / User_feedback.length 
                    : 0;
            
                return {
                    id: layanan.id,
                    layanan_name: layanan.nama,
                    layanan_createdAt: layanan.createdAt,
                    bidang_id: Bidang.id,
                    bidang_name: Bidang.nama,
                    permohonanCount: layanan.Layanan_form_nums.length,
                    pengaduanCount: layanan.Pengaduans ? layanan.Pengaduans.length : 0,
                    totalFeedback: User_feedback ? User_feedback.length : 0,
                    rataRataNilaiFeedback: rataRataNilaiFeedback.toFixed(2),
                };
            });
    
            // Generate pagination
            const pagination = generatePagination(totalCount, pageNumber, pageSize, '/api/dashboard/superadmin');
    
            // response object
            const data = {
                permohonanCount,
                monthlyCounts,
                countbyBidang: formattedCountByBidang,
                countbyLayanan: modifiedLayananGets,
                countPegawaibyBidang: formattedCountPegawaiByBidang,
                // countFeedbackbyLayanan: formattedCountFeedbackByLayanan,
                pagination
            };
    
            res.status(200).json(response(200, 'success get data dashboard', data));
    
        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },
    
    // get dashboard kepala bidang
    getDashboardKepalaBidang: async (req, res) => {
        try {
            // get parameter month dan year dari query
            const { month, year } = req.query;
            const today = new Date();
    
            // Jika tidak ada parameter, bulan dan tahun saat ini sebagai default
            const selectedYear = parseInt(year) || today.getFullYear();
            const selectedMonth = parseInt(month) || today.getMonth() + 1;
    
            let firstDay, lastDay;
            if (month) {
                firstDay = new Date(selectedYear, selectedMonth - 1, 1);
                lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
            } else {
                firstDay = new Date(selectedYear, 0, 1);
                lastDay = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
            }
    
            const dateRange = [firstDay, lastDay];
    
            const bidangWhere = { bidang_id: req.user.bidang_id };
    
            // Ambil data bidang berdasarkan user
            const databidang = await Bidang.findAll({
                where: { id: req.user.bidang_id },
                attributes: ['id', 'nama', 'desc'],
            });
    
            // Fungsi untuk mendapatkan layanan berdasarkan tanggal
            const getAllLayanan = async (range) => {
                const layanan = await Layanan.findAll({
                    where: bidangWhere,
                    include: {
                        model: Layanan_form_num,
                        attributes: ['id', 'status'],
                        required: false,
                        where: { createdAt: { [Op.between]: range } },
                    },
                });
    
                return layanan.map(l => ({
                    LayananId: l.id,
                    LayananName: l.nama,
                    LayananformnumCount: l.Layanan_form_nums ? l.Layanan_form_nums.length : 0
                }));
            };
    
            // untuk menghitung total permohonan berdasarkan status
            const getTotalPermohonanByStatus = async (status, range) => {
                return await Layanan_form_num.count({
                    where: {
                        status: status,
                        createdAt: { [Op.between]: range }
                    }
                });
            };
    
            const [totalMenungguVerifikasi, totalDisetujui, totalDitolak, totalDirevisi] = await Promise.all([
                getTotalPermohonanByStatus(2, dateRange),  // Status Menunggu Verifikasi
                getTotalPermohonanByStatus(9, dateRange),  // Status Disetujui
                getTotalPermohonanByStatus(10, dateRange),  // Status Ditolak
                getTotalPermohonanByStatus(3, dateRange)  // Status Direvisi
            ]);
    
            // Hitung total keseluruhan permohonan (semua status)
            const totalKeseluruhanPermohonan = await Layanan_form_num.count({
                where: {
                    createdAt: { [Op.between]: dateRange }
                }
            });
    
            // Ambil data layanan berdasarkan tanggal
            const allLayananMonth = await getAllLayanan(dateRange);
    
            res.status(200).json(response(200, 'success get data', {
                databidang,
                allLayananMonth,
                totalMenungguVerifikasi,
                totalDisetujui,
                totalDitolak,
                totalDirevisi,
                totalKeseluruhanPermohonan
            }));
        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },
    
    // get dashboard admin verifikasi
    getDashboardAdminVerifikasi: async (req, res) => {
        try {
            // get parameter month dan year dari query
            const { month, year } = req.query;
            const today = new Date();
    
            // Jika tidak ada parameter, bulan dan tahun saat ini sebagai default
            const selectedYear = parseInt(year) || today.getFullYear();
            const selectedMonth = parseInt(month) || today.getMonth() + 1;
    
            let firstDay, lastDay;
            if (month) {
                firstDay = new Date(selectedYear, selectedMonth - 1, 1);
                lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
            } else {
                firstDay = new Date(selectedYear, 0, 1);
                lastDay = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
            }
    
            const dateRange = [firstDay, lastDay];
    
            const bidangWhere = { bidang_id: req.user.bidang_id };
    
            // Ambil data bidang berdasarkan user
            const databidang = await Bidang.findAll({
                where: { id: req.user.bidang_id },
                attributes: ['id', 'nama', 'desc'],
            });
    
            // Fungsi untuk mendapatkan layanan berdasarkan tanggal
            const getAllLayanan = async (range) => {
                const layanan = await Layanan.findAll({
                    where: bidangWhere,
                    include: {
                        model: Layanan_form_num,
                        attributes: ['id', 'status'],
                        required: false,
                        where: { createdAt: { [Op.between]: range } },
                    },
                });
    
                return layanan.map(l => ({
                    LayananId: l.id,
                    LayananName: l.nama,
                    LayananformnumCount: l.Layanan_form_nums ? l.Layanan_form_nums.length : 0
                }));
            };
    
            // untuk menghitung total permohonan berdasarkan status
            const getTotalPermohonanByStatus = async (status, range) => {
                return await Layanan_form_num.count({
                    where: {
                        status: status,
                        createdAt: { [Op.between]: range }
                    }
                });
            };
    
            const [totalMenunggu, totalDisetujui, totalDitolak, totalDirevisi] = await Promise.all([
                getTotalPermohonanByStatus(1, dateRange),  // Status Menunggu
                getTotalPermohonanByStatus(9, dateRange),  // Status Disetujui
                getTotalPermohonanByStatus(10, dateRange),  // Status Ditolak
                getTotalPermohonanByStatus(3, dateRange)  // Status Direvisi
            ]);
    
            // Hitung total keseluruhan permohonan (semua status)
            const totalKeseluruhanPermohonan = await Layanan_form_num.count({
                where: {
                    createdAt: { [Op.between]: dateRange }
                }
            });
    
            // Ambil data layanan berdasarkan tanggal
            const allLayananMonth = await getAllLayanan(dateRange);
    
            res.status(200).json(response(200, 'success get data', {
                databidang,
                allLayananMonth,
                totalMenunggu,
                totalDisetujui,
                totalDitolak,
                totalDirevisi,
                totalKeseluruhanPermohonan
            }));
        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },
    
    // get dashboard kepala dinas
    getDashboardKepalaDinas: async (req, res) => {
        try {
            const { year, bidang_id, start_date, end_date, search, page, limit } = req.query;
        
            const currentYear = parseInt(year) || new Date().getFullYear();
            const pageNumber = parseInt(page) || 1;
            const pageSize = parseInt(limit) || 10;
            const offset = (pageNumber - 1) * pageSize;
    
            const getLastSixMonths = (year) => {
                const months = [];
                for (let i = 5; i >= 0; i--) {
                    const startDate = new Date(year, new Date().getMonth() - i, 1);
                    const endDate = new Date(year, new Date().getMonth() - i + 1, 0);
                    months.push({ startDate, endDate });
                }
                return months;
            };
    
            const lastSixMonths = getLastSixMonths(currentYear);
            const monthlyCounts = await Promise.all(lastSixMonths.map(async ({ startDate, endDate }) => {
                const monthName = startDate.toLocaleString('default', { month: 'long' });
                const permohonanCount = await Layanan_form_num.count({
                    include: [{
                        model: Layanan,
                        where: bidang_id ? { bidang_id } : {},  // Filter berdasarkan bidang_id
                    }],
                    where: {
                        createdAt: { [Op.between]: [startDate, endDate] }
                    }
                });
                return { month: monthName, permohonanCount };
            }));
    
            const countbyBidang = await Bidang.findAll({
                include: [{
                    model: Layanan,
                    as: 'Layanans',
                    include: [{
                        model: Layanan_form_num,
                        attributes: ['id'],
                        where: {
                            createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                        }
                    }],
                    attributes: ['id', 'nama'],
                }],
                where: {
                    deletedAt: null,
                    ...(bidang_id && { id: bidang_id })  // Jika bidang_id ada, tambahkan ke where clause
                },
                attributes: ['id', 'nama'],
            });
    
            const formattedCountByBidang = countbyBidang.map(bidang => ({
                id: bidang.id,
                name: bidang.nama,
                permohonan_count: bidang.Layanans.reduce((total, layanan) => total + layanan.Layanan_form_nums.length, 0),
            }));
    
            const whereClause = {};
            if (search) {
                whereClause.name = { [Op.like]: `%${search}%` };
            }
            const whereClause2 = {};
            if (bidang_id) {
                whereClause.bidang_id = bidang_id;
            }
            if (start_date && end_date) {
                whereClause2.createdAt = { [Op.between]: [new Date(start_date), new Date(end_date)] };
            } else if (start_date) {
                whereClause2.createdAt = { [Op.gte]: new Date(start_date) };
            } else if (end_date) {
                whereClause2.createdAt = { [Op.lte]: new Date(end_date) };
            }
    
            // Tambahkan pengambilan data layanan berdasarkan bidang_id
            let layananByBidang = [];
            if (bidang_id) {
                layananByBidang = await Layanan.findAll({
                    where: { bidang_id },
                    attributes: ['id', 'nama'],
                    include: [{
                        model: Layanan_form_num,
                        attributes: ['id'],
                        required: false, 
                        where: {
                            createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)]
                            } // Filter berdasarkan tahun saat ini
                        }
                    }]
                });
    
                // Format data layanan dengan total permohonan
                layananByBidang = layananByBidang.map(layanan => ({
                    id: layanan.id,
                    name: layanan.nama,
                    total_permohonan: layanan.Layanan_form_nums.length,
                }));
            }
    
            // Hitung total permohonan berdasarkan status dan bidang_id
            const getTotalPermohonanByStatus = async (status) => {
                return await Layanan_form_num.count({
                    include: [{
                        model: Layanan,
                        where: bidang_id ? { bidang_id } : {},  // Filter berdasarkan bidang_id
                    }],
                    where: { status }
                });
            };
    
            // Hitung jumlah permohonan untuk masing-masing status
            const [totalMenungguVerifikasi, totalDisetujui, totalDitolak, totalDirevisi] = await Promise.all([
                getTotalPermohonanByStatus(2),  // Status menunggu verifikasi
                getTotalPermohonanByStatus(9),  // Status disetujui
                getTotalPermohonanByStatus(10),  // Status ditolak
                getTotalPermohonanByStatus(3)  // Status direvisi
            ]);
    
            const [permohonanCount, layananGets, totalCount] = await Promise.all([
                Layanan_form_num.count({
                    include: [{
                        model: Layanan,
                        where: bidang_id ? { bidang_id } : {},
                    }],
                    where: {
                        createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                    }
                }),
                User_feedback.count({
                    where: {
                        createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                    }
                }),
                Layanan.findAll({
                    attributes: ['id', 'nama', 'createdAt'],
                    where: whereClause,
                    include: [
                        { model: Bidang, attributes: ['id', 'nama'], where: whereClause2 },
                        { model: Layanan_form_num, attributes: ['id'] },
                    ],
                    limit: pageSize,
                    offset: offset
                }),
                Layanan.count({
                    where: whereClause,
                    include: [
                        { model: Bidang, attributes: ['id', 'nama'], where: whereClause2 }
                    ],
                })
            ]);
    
            const pagination = generatePagination(pageNumber, pageSize, '/api/dashboard/kepala/dinas');
    
            const data = {
                permohonanCount,
                monthlyCounts,
                countbyBidang: formattedCountByBidang,
                layananByBidang,
                totalMenungguVerifikasi,
                totalDisetujui,
                totalDitolak,
                totalDirevisi,
                pagination
            };
    
            res.status(200).json(response(200, 'success get data dashboard', data));
        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },
    
    // get dashboard sekretaris dinas
    getDashboardSekretarisDinas: async (req, res) => {
        try {
            const { year, bidang_id, start_date, end_date, search, page, limit } = req.query;
        
            const currentYear = parseInt(year) || new Date().getFullYear();
            const pageNumber = parseInt(page) || 1;
            const pageSize = parseInt(limit) || 10;
            const offset = (pageNumber - 1) * pageSize;
    
            const getLastSixMonths = (year) => {
                const months = [];
                for (let i = 5; i >= 0; i--) {
                    const startDate = new Date(year, new Date().getMonth() - i, 1);
                    const endDate = new Date(year, new Date().getMonth() - i + 1, 0);
                    months.push({ startDate, endDate });
                }
                return months;
            };
    
            const lastSixMonths = getLastSixMonths(currentYear);
            const monthlyCounts = await Promise.all(lastSixMonths.map(async ({ startDate, endDate }) => {
                const monthName = startDate.toLocaleString('default', { month: 'long' });
                const permohonanCount = await Layanan_form_num.count({
                    include: [{
                        model: Layanan,
                        where: bidang_id ? { bidang_id } : {},  // Filter berdasarkan bidang_id
                    }],
                    where: {
                        createdAt: { [Op.between]: [startDate, endDate] }
                    }
                });
                return { month: monthName, permohonanCount };
            }));
    
            const countbyBidang = await Bidang.findAll({
                include: [{
                    model: Layanan,
                    as: 'Layanans',
                    include: [{
                        model: Layanan_form_num,
                        attributes: ['id'],
                        where: {
                            createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                        }
                    }],
                    attributes: ['id', 'nama'],
                }],
                where: {
                    deletedAt: null,
                    ...(bidang_id && { id: bidang_id })  // Jika bidang_id ada, tambahkan ke where clause
                },
                attributes: ['id', 'nama'],
            });
    
            const formattedCountByBidang = countbyBidang.map(bidang => ({
                id: bidang.id,
                name: bidang.nama,
                permohonan_count: bidang.Layanans.reduce((total, layanan) => total + layanan.Layanan_form_nums.length, 0),
            }));
    
            const whereClause = {};
            if (search) {
                whereClause.name = { [Op.like]: `%${search}%` };
            }
            const whereClause2 = {};
            if (bidang_id) {
                whereClause.bidang_id = bidang_id;
            }
            if (start_date && end_date) {
                whereClause2.createdAt = { [Op.between]: [new Date(start_date), new Date(end_date)] };
            } else if (start_date) {
                whereClause2.createdAt = { [Op.gte]: new Date(start_date) };
            } else if (end_date) {
                whereClause2.createdAt = { [Op.lte]: new Date(end_date) };
            }
    
            // Tambahkan pengambilan data layanan berdasarkan bidang_id
            let layananByBidang = [];
            if (bidang_id) {
                layananByBidang = await Layanan.findAll({
                    where: { bidang_id },
                    attributes: ['id', 'nama'],
                    include: [{
                        model: Layanan_form_num,
                        attributes: ['id'],
                        required: false, 
                        where: {
                            createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)]
                            } // Filter berdasarkan tahun saat ini
                        }
                    }]
                });
    
                // Format data layanan dengan total permohonan
                layananByBidang = layananByBidang.map(layanan => ({
                    id: layanan.id,
                    name: layanan.nama,
                    total_permohonan: layanan.Layanan_form_nums.length,
                }));
            }
    
            // Hitung total permohonan berdasarkan status dan bidang_id
            const getTotalPermohonanByStatus = async (status) => {
                return await Layanan_form_num.count({
                    include: [{
                        model: Layanan,
                        where: bidang_id ? { bidang_id } : {},  // Filter berdasarkan bidang_id
                    }],
                    where: { status }
                });
            };
    
            // Hitung jumlah permohonan untuk masing-masing status
            const [totalMenungguVerifikasi, totalDisetujui, totalDitolak, totalDirevisi] = await Promise.all([
                getTotalPermohonanByStatus(2),  // Status menunggu verifikasi
                getTotalPermohonanByStatus(9),  // Status disetujui
                getTotalPermohonanByStatus(10),  // Status ditolak
                getTotalPermohonanByStatus(3)  // Status direvisi
            ]);
    
            const [permohonanCount, layananGets, totalCount] = await Promise.all([
                Layanan_form_num.count({
                    include: [{
                        model: Layanan,
                        where: bidang_id ? { bidang_id } : {},
                    }],
                    where: {
                        createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                    }
                }),
                User_feedback.count({
                    where: {
                        createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                    }
                }),
                Layanan.findAll({
                    attributes: ['id', 'nama', 'createdAt'],
                    where: whereClause,
                    include: [
                        { model: Bidang, attributes: ['id', 'nama'], where: whereClause2 },
                        { model: Layanan_form_num, attributes: ['id'] },
                    ],
                    limit: pageSize,
                    offset: offset
                }),
                Layanan.count({
                    where: whereClause,
                    include: [
                        { model: Bidang, attributes: ['id', 'nama'], where: whereClause2 }
                    ],
                })
            ]);
    
            const pagination = generatePagination(pageNumber, pageSize, '/api/dashboard/kepala/dinas');
    
            const data = {
                permohonanCount,
                monthlyCounts,
                countbyBidang: formattedCountByBidang,
                layananByBidang,
                totalMenungguVerifikasi,
                totalDisetujui,
                totalDitolak,
                totalDirevisi,
                pagination
            };
    
            res.status(200).json(response(200, 'success get data dashboard', data));
        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },
    

}