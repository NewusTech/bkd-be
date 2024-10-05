const { response } = require('../helpers/response.formatter');

const { Bidang, Layanan, Layanan_form_num, User_feedback, User_info } = require('../models');
const { generatePagination } = require('../pagination/pagination');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const { finished } = require('nodemailer/lib/xoauth2');

module.exports = {


    // get dashboard user
    getDashboardSuperadmin: async (req, res) => {
        try {
            const { year, bidang_id, start_date, end_date, search, page, limit } = req.query;

            // Default values or parsing parameters
            const currentYear = parseInt(year) || new Date().getFullYear();
            const pageNumber = parseInt(page) || 1;
            const pageSize = parseInt(limit) || 10;
            const offset = (pageNumber - 1) * pageSize;

            // Function to get last six months
            const getLastSixMonths = (year) => {
                const months = [];
                for (let i = 5; i >= 0; i--) {
                    const startDate = new Date(year, new Date().getMonth() - i, 1);
                    const endDate = new Date(year, new Date().getMonth() - i + 1, 0);
                    months.push({ startDate, endDate });
                }
                return months;
            };

            // Fetch monthly counts for permohonan and skm for the last six months
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

            // Fetch counts by Bidang
            const countbyBidang = await Bidang.findAll({
                include: [{
                    model: Layanan,
                    as: 'Layanans',
                    include: [{
                        model: Layanan_form_num,
                        // as: 'Layananformnums',
                        attributes: ['id'],
                        where: {
                            createdAt: { [Op.between]: [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31, 23, 59, 59)] }
                        }
                    }],
                    attributes: ['id', 'nama'],
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

            // Fetch Layanan data with optional filters for bidang_id, start_date, end_date, and search
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
                    where: whereClause,
                    include: [
                        { model: Bidang, attributes: ['id', 'nama'], where: whereClause2 },
                        { model: Layanan_form_num, attributes: ['id'] },
                        { model: User_feedback, attributes: ['id'] },
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

            // const modifiedLayananGets = layananGets.map(layanan => {
            //     const { Bidang } = layanan.dataValues;
            //     return {
            //         id: layanan.id,
            //         layanan_name: layanan.nama,
            //         layanan_createdAt: layanan.createdAt,
            //         bidang_id: Bidang.id,
            //         bidang_name: Bidang.nama,
            //         permohonanCount: layanan.Layanan_form_nums.length,
            //     };
            // });

            // Generate pagination
            const pagination = generatePagination(totalCount, pageNumber, pageSize, '/api/dashboard/superadmin');

            // Construct final response object
            const data = {
                permohonanCount,
                monthlyCounts,
                countbyBidang: formattedCountByBidang,
                // layananData: modifiedLayananGets,
                pagination
            };

            res.status(200).json(response(200, 'success get data', data));

        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },

    getDashboardKepalaBidang: async (req, res) => {
        try {
            const today = new Date();

            const firstDaythisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDaythisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

            const dateRangethisMonth = [firstDaythisMonth, lastDaythisMonth];

            const bidangWhere = { bidang_id: req.user.bidang_id };

            const databidang = await Bidang.findAll({
                where: { id: req.user.bidang_id },
                attributes: ['id', 'nama', 'desc'],
            });

            const getTopLayanan = async (range) => {
                const layanan = await Layanan.findAll({
                    where: bidangWhere,
                    include: {
                        model: Layanan_form_num,
                        attributes: ['id'],
                        required: false,
                        where: { createdAt: { [Op.between]: range } },
                    },
                });

                return layanan
                    .map(l => ({ LayananId: l.id, LayananName: l.name, LayananformnumCount: l.Layananformnums.length }))
                    .sort((a, b) => b.LayananformnumCount - a.LayananformnumCount)
                    .slice(0, 3);
            };

            const getLast7Days = () => {
                const dates = [];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    date.setHours(0, 0, 0, 0);
                    const endDate = new Date(date);
                    endDate.setHours(23, 59, 59, 999);
                    dates.push({ start: date, end: endDate });
                }
                return dates;
            };

            const totalLayananPerDay = await Promise.all(
                getLast7Days().map(async ({ start, end }) => {
                    const range = [start, end];
                    const layanan = await getTopLayanan(range);

                    return {
                        date: start.toISOString(),
                        top3: layanan,
                    };
                })
            );

            const calculateTotal7Days = (totalLayananPerDay) => {
                const totalLayanan7Days = {};
                totalLayananPerDay.forEach(day => {
                    day.top3.forEach(layanan => {
                        if (!totalLayanan7Days[layanan.LayananId]) {
                            totalLayanan7Days[layanan.LayananId] = {
                                LayananName: layanan.LayananName,
                                LayananformnumCount: 0,
                            };
                        }
                        totalLayanan7Days[layanan.LayananId].LayananformnumCount += layanan.LayananformnumCount;
                    });
                });
                return Object.entries(totalLayanan7Days).map(([LayananId, { LayananName, LayananformnumCount }]) => ({
                    LayananId: parseInt(LayananId),
                    LayananName,
                    LayananformnumCount,
                }));
            };

            const [top3LayananMonth, totalLayanan7Days] = await Promise.all([
                getTopLayanan(dateRangethisMonth),
                calculateTotal7Days(totalLayananPerDay),
            ]);

            res.status(200).json(response(200, 'success get data', {
                databidang,
                top3LayananMonth,
                totalLayananPerDay,
                totalLayanan7Days,
            }));

        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },

    web_admin_survey: async (req, res) => {
        try {

            const { year, month } = req.query;

            const datainstansi = await Instansi.findAll({
                where: { id: data.instansi_id },
                attributes: ['id', 'name', 'desc', 'image'],
            })

            const WhereClause = {};
            WhereClause.instansi_id = data?.instansi_id;

            const WhereClause2 = {};

            if (year) {
                const startDate = new Date(year, month ? month - 1 : 0, 1);
                const endDate = month
                    ? new Date(year, month, 0, 23, 59, 59, 999)
                    : new Date(year, 11, 31, 23, 59, 59, 999);

                WhereClause2.createdAt = {
                    [Op.between]: [startDate, endDate]
                };
            }

            [history, totalCount] = await Promise.all([
                Layanan.findAll({
                    include: [{
                        model: Surveyformnum,
                        required: false,
                        include: [{
                            model: Surveyforminput,
                        }],
                        where: WhereClause2,
                    }],
                    where: WhereClause,
                })
            ]);

            const calculateNilai = (surveyformnums) => {
                let nilaiPerSurveyform = {};
                let totalSurveyformnum = surveyformnums.length;

                surveyformnums.forEach(surveyformnum => {
                    surveyformnum.Surveyforminputs.forEach(input => {
                        if (!nilaiPerSurveyform[input.surveyform_id]) {
                            nilaiPerSurveyform[input.surveyform_id] = 0;
                        }
                        nilaiPerSurveyform[input.surveyform_id] += input.nilai || 0;
                    });
                });

                for (let surveyform_id in nilaiPerSurveyform) {
                    nilaiPerSurveyform[surveyform_id] = (nilaiPerSurveyform[surveyform_id] / totalSurveyformnum) * 0.11;
                }

                return nilaiPerSurveyform;
            };

            let nilaiSKM_perlayanan = history.map(data => {
                const surveyformnumsNilai = data.Surveyformnums ? calculateNilai(data.Surveyformnums) : {};

                // Sum up all nilaiPerSurveyform for the current layanan
                let totalNilaiPerLayanan = Object.values(surveyformnumsNilai).reduce((sum, nilai) => sum + nilai, 0);

                return {
                    id: data.id,
                    layanan_name: data.name || null,
                    totalNilaiPerLayanan: totalNilaiPerLayanan * 25
                };
            });

            const validNilaiSKM = nilaiSKM_perlayanan.filter(layanan => layanan.totalNilaiPerLayanan > 0);
            const totalNilaiSKM = validNilaiSKM.reduce((sum, layanan) => sum + layanan.totalNilaiPerLayanan, 0);
            const rataRataNilaiSKM = validNilaiSKM.length > 0 ? totalNilaiSKM / validNilaiSKM.length : 0;

            const surveyformnumPerBulan = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                total: 0
            }));

            history.forEach(data => {
                data.Surveyformnums.forEach(surveyformnum => {
                    const bulan = new Date(surveyformnum.createdAt).getMonth();
                    surveyformnumPerBulan[bulan].total++;
                });
            });

            res.status(200).json(response(200, 'success get data', {
                datainstansi,
                nilaiSKM_perlayanan,
                rataRataNilaiSKM,
                surveyformnumPerBulan
            }));

        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },

    web_admin_antrian: async (req, res) => {
        try {
            const iddinas = data.instansi_id;
            const yearParam = req.query.year;
            const currentYear = yearParam ? parseInt(yearParam) : moment().year();

            const createCountPromises = (month) => {
                const startOfMonth = moment().year(currentYear).month(month).startOf('month').toDate();
                const endOfMonth = moment().year(currentYear).month(month).endOf('month').toDate();
                return Antrian.count({
                    where: {
                        createdAt: { [Op.between]: [startOfMonth, endOfMonth] },
                        instansi_id: iddinas
                    }
                });
            };

            const createPermohonanPromises = (month) => {
                const startOfMonth = moment().year(currentYear).month(month).startOf('month').toDate();
                const endOfMonth = moment().year(currentYear).month(month).endOf('month').toDate();
                return Layananformnum.count({
                    include: [{
                        model: Layanan,
                        attributes: { exclude: ['name'] },
                        where: { instansi_id: iddinas }
                    }],
                    where: {
                        createdAt: { [Op.between]: [startOfMonth, endOfMonth] },
                    }
                });
            };

            const months = Array.from({ length: 12 }, (_, month) => month);

            const [AntrianmonthlyCounts, PermohonanmonthlyCounts] = await Promise.all([
                Promise.all(months.map(createCountPromises)),
                Promise.all(months.map(createPermohonanPromises))
            ]);

            const formatMonthlyData = (counts) =>
                months.reduce((acc, month, idx) => {
                    acc[moment().month(month).format('MMMM')] = counts[idx];
                    return acc;
                }, {});

            res.status(200).json({
                status: 200,
                message: 'success get',
                data: {
                    antrianperBulan: formatMonthlyData(AntrianmonthlyCounts),
                    permohonanperBulan: formatMonthlyData(PermohonanmonthlyCounts)
                }
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ status: 500, message: 'internal server error', error: err });
        }
    },

    web_admantrian: async (req, res) => {
        try {

            const idlayanan = data.layanan_id
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const { status, code, range, start_date, end_date } = req.query;

            const startOfToday = moment().startOf('day').toDate();
            const endOfToday = moment().endOf('day').toDate();

            let startOfToday2;
            let endOfToday2;

            if (range == 'today') {
                startOfToday2 = moment().startOf('day').toDate();
                endOfToday2 = moment().endOf('day').toDate();
            } else {
                if (start_date && end_date) {
                    startOfToday2 = moment(start_date).startOf('day').toDate();
                    endOfToday2 = moment(end_date).endOf('day').toDate();
                } else if (start_date) {
                    startOfToday2 = moment(start_date).startOf('day').toDate();
                    endOfToday2 = moment('2080-01-01').endOf('day').toDate();
                } else if (end_date) {
                    startOfToday2 = moment('2010-01-01').startOf('day').toDate();
                    endOfToday2 = moment(end_date).endOf('day').toDate();
                } else {
                    startOfToday2 = moment('2010-01-01').startOf('day').toDate();
                    endOfToday2 = moment('2080-01-01').endOf('day').toDate();
                }
            }

            const [AntrianCount, AntrianSelesaiCount, AntrianSebelumnya, AntrianProses, AntrianNext, riwayatAntrian, riwayatCount] = await Promise.all([
                Antrian.count({
                    where: {
                        createdAt: { [Op.between]: [startOfToday, endOfToday] },
                        layanan_id: idlayanan
                    },
                }),
                Antrian.count({
                    where: {
                        createdAt: { [Op.between]: [startOfToday, endOfToday] },
                        layanan_id: idlayanan,
                        status: true,
                        finishedAt: { [Op.ne]: null }
                    },
                }),
                Antrian.findOne({
                    where: {
                        createdAt: { [Op.between]: [startOfToday, endOfToday] },
                        status: true,
                        layanan_id: idlayanan,
                        finishedAt: { [Op.ne]: null }
                    },
                    order: [['id', 'DESC']]
                }),
                Antrian.findOne({
                    where: {
                        createdAt: { [Op.between]: [startOfToday, endOfToday] },
                        status: true,
                        layanan_id: idlayanan,
                        finishedAt: { [Op.is]: null }
                    },
                    order: [['id', 'DESC']]
                }),
                Antrian.findOne({
                    where: {
                        createdAt: { [Op.between]: [startOfToday, endOfToday] },
                        status: false,
                        layanan_id: idlayanan,
                    },
                    order: [['id', 'ASC']]
                }),
                Antrian.findAll({
                    where: {
                        createdAt: {
                            [Op.between]: [startOfToday2, endOfToday2],
                        },
                        ...(status && { status: status }),
                        ...(code && { code: { [Op.like]: `%${code}%` } }),
                    },
                    include: [{
                        model: Layanan,
                        attributes: ['name', 'code'],
                        where: {
                            id: idlayanan,
                        },
                    }],
                    order: [['id', 'ASC']],
                    limit: limit,
                    offset: offset
                }),
                Antrian.count(
                    {
                        where: {
                            createdAt: {
                                [Op.between]: [startOfToday2, endOfToday2],
                            },
                            ...(status && { status: status }),
                            ...(code && { code: { [Op.like]: `%${code}%` } }),
                        },
                        include: [{
                            model: Layanan,
                            where: {
                                id: idlayanan,
                            },
                        }]
                    }
                )
            ]);

            // Add timeprocess field
            const processedRiwayatAntrian = riwayatAntrian.map(item => {
                let timeprocess = null;
                if (item.finishedAt && item.updatedAt) {
                    const finishedAt = moment(item.finishedAt);
                    const updatedAt = moment(item.updatedAt);
                    const duration = moment.duration(finishedAt.diff(updatedAt));
                    timeprocess = `${duration.minutes()} menit`;
                }
                return {
                    ...item.toJSON(),
                    timeprocess
                };
            });

            const pagination = generatePagination(riwayatCount, page, limit, `/api/dashboard/adminlayanan`);

            const dataget = {
                AntrianCount,
                AntrianSelesaiCount,
                AntrianSebelumnya: AntrianSebelumnya?.code ?? '-',
                AntrianProses: AntrianProses?.code ?? '-',
                AntrianNext: AntrianNext?.code ?? '-',
                riwayatAntrian: processedRiwayatAntrian,
                pagination: pagination
            };

            res.status(200).json({
                status: 200,
                message: 'success get',
                data: dataget
            });

        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },

    web_admlayanan_survey: async (req, res) => {
        try {

            const { year, month } = req.query;

            const WhereClause = {};
            WhereClause.id = data?.layanan_id;

            const WhereClause2 = {};

            if (year && month) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59, 999);
                WhereClause2.createdAt = {
                    [Op.between]: [startDate, endDate]
                };
            } else if (year) {
                const startDate = new Date(year, 0, 1);
                const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
                WhereClause2.createdAt = {
                    [Op.between]: [startDate, endDate]
                };
            } else if (month) {
                const currentYear = new Date().getFullYear();
                const startDate = new Date(currentYear, month - 1, 1);
                const endDate = new Date(currentYear, month, 0, 23, 59, 59, 999);
                WhereClause2.createdAt = {
                    [Op.between]: [startDate, endDate]
                };
            }

            [history, totalCount] = await Promise.all([
                Layanan.findAll({
                    include: [{
                        model: Surveyformnum,
                        required: false,
                        include: [{
                            model: Surveyforminput,
                        }],
                        where: WhereClause2,
                    }],
                    where: WhereClause,
                })
            ]);

            const calculateNilai = (surveyformnums) => {
                let nilaiPerSurveyform = {};
                let totalSurveyformnum = surveyformnums.length;

                surveyformnums.forEach(surveyformnum => {
                    surveyformnum.Surveyforminputs.forEach(input => {
                        if (!nilaiPerSurveyform[input.surveyform_id]) {
                            nilaiPerSurveyform[input.surveyform_id] = 0;
                        }
                        nilaiPerSurveyform[input.surveyform_id] += input.nilai || 0;
                    });
                });

                for (let surveyform_id in nilaiPerSurveyform) {
                    nilaiPerSurveyform[surveyform_id] = (nilaiPerSurveyform[surveyform_id] / totalSurveyformnum) * 0.11;
                }

                return nilaiPerSurveyform;
            };

            let nilaiSKM_perlayanan = history.map(data => {
                const surveyformnumsNilai = data.Surveyformnums ? calculateNilai(data.Surveyformnums) : {};

                // Sum up all nilaiPerSurveyform for the current layanan
                let totalNilaiPerLayanan = Object.values(surveyformnumsNilai).reduce((sum, nilai) => sum + nilai, 0);

                return {
                    id: data.id,
                    layanan_name: data.name || null,
                    totalNilaiPerLayanan: totalNilaiPerLayanan * 25
                };
            });

            const validNilaiSKM = nilaiSKM_perlayanan.filter(layanan => layanan.totalNilaiPerLayanan > 0);
            const totalNilaiSKM = validNilaiSKM.reduce((sum, layanan) => sum + layanan.totalNilaiPerLayanan, 0);
            const rataRataNilaiSKM = validNilaiSKM.length > 0 ? totalNilaiSKM / validNilaiSKM.length : 0;

            const surveyformnumPerBulan = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                total: 0
            }));

            history.forEach(data => {
                data.Surveyformnums.forEach(surveyformnum => {
                    const bulan = new Date(surveyformnum.createdAt).getMonth();
                    surveyformnumPerBulan[bulan].total++;
                });
            });

            res.status(200).json(response(200, 'success get data', {
                rataRataNilaiSKM,
                surveyformnumPerBulan
            }));

        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },

    web_admlayanan_layanan: async (req, res) => {
        try {

            const { month, year } = req.query;
            const today = new Date();
            const queryMonth = month ? parseInt(month, 10) - 1 : today.getMonth();
            const queryYear = year ? year : today.getFullYear();
            const firstDayOfMonth = new Date(queryYear, queryMonth, 1);
            const lastDayOfMonth = new Date(queryYear, queryMonth + 1, 0, 23, 59, 59, 999);
            const dateRangeMonth = [firstDayOfMonth, lastDayOfMonth];

            const dateRangeToday = [new Date().setHours(0, 0, 0, 0), new Date().setHours(23, 59, 59, 999)];

            const counts = await Promise.all([
                Layananformnum.count({
                    where: {
                        createdAt: { [Op.between]: dateRangeToday },
                        status: 3,
                        layanan_id: data.layanan_id
                    },
                }),
                Layananformnum.count({
                    where: {
                        createdAt: { [Op.between]: dateRangeToday },
                        status: 4,
                        layanan_id: data.layanan_id
                    },
                }),
                Layananformnum.count({
                    where: {
                        createdAt: { [Op.between]: dateRangeMonth },
                        layanan_id: data.layanan_id,
                        status: 3,
                    },
                }),
                Layananformnum.count({
                    where: {
                        createdAt: { [Op.between]: dateRangeMonth },
                        status: 4,
                        layanan_id: data.layanan_id
                    },
                }),
            ]);

            res.status(200).json(response(200, 'success get data', {
                permohonanCountToday: counts[0],
                permohonanGagalToday: counts[1],
                permohonanCountMonth: counts[2],
                permohonanGagalMonth: counts[3]
            }));

        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },

}