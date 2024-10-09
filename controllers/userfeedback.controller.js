const { response } = require('../helpers/response.formatter');

const { User_feedback, Layanan, User_info, sequelize, Bidang } = require('../models');
require('dotenv').config()
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const puppeteer = require('puppeteer');
const { generatePagination } = require('../pagination/pagination');


module.exports = {

    //input feedback user
    createFeedback: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const idlayanan = req.params.idlayanan;
            const iduser = req.user.userId;
    
            // Pastikan ID user ada
            if (!iduser) {
                throw new Error('User ID is required');
            }
    
            const { datainput } = req.body;
    
            // Cek apakah layanan ID valid dan mengambil bidang terkait
            let dataLayanan = await Layanan.findOne({
                where: {
                    id: idlayanan
                },
                include: [
                    {
                        model: Bidang,
                        attributes: ['id', 'nama']
                    },
                ],
                attributes: ['id'],
            });
    
            // Jika layanan tidak ditemukan
            if (!dataLayanan) {
                throw new Error('Layanan not found');
            }
    
            // Menghitung jumlah feedback yang sudah ada untuk layanan tersebut
            const count = await User_feedback.count({
                where: {
                    layanan_id: idlayanan
                }
            });
    
            // Ambil bidang_id dari data layanan
            const bidangId = dataLayanan.Bidang?.id;
    
            // Memasukkan nilai feedback dari pengguna, termasuk bidang_id
            let layananID = {
                userinfo_id: Number(iduser), // Get id user dari token
                layanan_id: Number(idlayanan),
                bidang_id: bidangId,         // Tambahkan bidang_id ke feedback
                question_1: req.body.question_1 ?? null,
                question_2: req.body.question_2 ?? null,
                question_3: req.body.question_3 ?? null,
                question_4: req.body.question_4 ?? null,
                feedback: req.body.feedback ?? null
            };
    
            // Membuat feedback baru
            const createdFeedback = await User_feedback.create(layananID, { transaction });
    
            // Commit transaksi jika semua berhasil
            await transaction.commit();
            res.status(201).json(response(201, 'Success create', createdFeedback));
        } catch (err) {
            // Rollback transaksi jika ada error
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.error(err);
        }
    },
    
    getHistoryByBidang: async (req, res) => {
        try {
            const bidang_id = Number(req.query.bidang_id);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const start_date = req.query.start_date;
            const end_date = req.query.end_date;
            let history;
            let totalCount;
    
            const WhereClause = {};
            if (bidang_id) {
                WhereClause.bidang_id = bidang_id;
            }
            if (start_date && end_date) {
                WhereClause.createdAt = {
                    [Op.between]: [moment(start_date).startOf('day').toDate(), moment(end_date).endOf('day').toDate()]
                };
            } else if (start_date) {
                WhereClause.createdAt = {
                    [Op.gte]: moment(start_date).startOf('day').toDate()
                };
            } else if (end_date) {
                WhereClause.createdAt = {
                    [Op.lte]: moment(end_date).endOf('day').toDate()
                };
            }
    
            // Query untuk mendapatkan layanan berdasarkan bidang dengan feedback dan bidang terkait
            [history, totalCount] = await Promise.all([
                Layanan.findAll({
                    include: [
                        {
                            model: User_feedback,
                            attributes: ['id', 'question_1', 'question_2', 'question_3', 'question_4'], // Ambil nilai untuk setiap pertanyaan
                        },
                        {
                            model: Bidang,  // Sertakan model Bidang untuk mendapatkan nama bidang
                            attributes: ['id', 'nama']  // Ambil ID dan nama Bidang
                        }
                    ],
                    where: WhereClause,
                    limit: limit,
                    offset: offset,
                    order: [['id', 'DESC']]
                }),
                Layanan.count({
                    where: WhereClause,
                })
            ]);
    
            // Fungsi untuk menghitung total nilai dari feedback dan mengonversi ke skala 100
            const calculateTotalFeedbackAndNilai = (feedbacks) => {
                const totalFeedback = feedbacks.length;
            
                const totalNilai = feedbacks.reduce((sum, feedback) => {
                    const nilaiTotal = 
                        (feedback.question_1 * 25) +
                        (feedback.question_2 * 25) +
                        (feedback.question_3 * 25) +
                        (feedback.question_4 * 25);
                    
                    return sum + nilaiTotal;
                }, 0);
            
                const nilaiRataRata = totalFeedback > 0 ? totalNilai / (totalFeedback * 4) : 0;  // Dibagi dengan 4 pertanyaan
                return {
                    totalFeedback,
                    nilaiRataRata
                };
            };            
    
            // Format data untuk setiap layanan yang didapatkan
            let formattedData = history.map(data => {
                const feedbackSummary = calculateTotalFeedbackAndNilai(data.User_feedbacks);
    
                return {
                    id: data.id,
                    layanan_id: data.id || null,
                    layanan_name: data.nama || null,
                    bidang_name: data.Bidang ? data.Bidang.nama : null,  // Ambil nama Bidang terkait
                    total_feedback: feedbackSummary.totalFeedback,
                    average_nilai: feedbackSummary.nilaiRataRata, // Nilai rata-rata di skala 100
                    created_at: data.createdAt
                };
            });
    
            // Generate pagination
            const pagination = generatePagination(totalCount, page, limit, `/api/user/history/feedback`);
    
            // Return hasil
            res.status(200).json({
                status: 200,
                message: 'Success get data',
                data: formattedData,
                pagination: pagination
            });
    
        } catch (err) {
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err
            });
            console.log(err);
        }
    },

    getHistoryByLayanan: async (req, res) => {
        try {
            const idlayanan = Number(req.params.idlayanan);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let layanan;
            let history;
            let totalCount;
            const start_date = req.query.start_date;
            const end_date = req.query.end_date;
    
            const WhereClause = {};
            if (idlayanan) {
                WhereClause.layanan_id = idlayanan;
            }
            if (start_date && end_date) {
                WhereClause.createdAt = {
                    [Op.between]: [moment(start_date).startOf('day').toDate(), moment(end_date).endOf('day').toDate()]
                };
            } else if (start_date) {
                WhereClause.createdAt = {
                    [Op.gte]: moment(start_date).startOf('day').toDate()
                };
            } else if (end_date) {
                WhereClause.createdAt = {
                    [Op.lte]: moment(end_date).endOf('day').toDate()
                };
            }
    
            [layanan, history, totalCount] = await Promise.all([
                Layanan.findOne({
                    where: {
                        id: idlayanan
                    },
                    attributes: ['id', 'nama'],
                }),
                User_feedback.findAll({
                    include: [
                        {
                            model: User_info,
                            attributes: ['id', 'name', 'nip', 'gender'],
                        },
                    ],
                    where: WhereClause,
                    limit: limit,
                    offset: offset
                }),
                User_feedback.count({
                    where: WhereClause,
                })
            ]);
    
            // Fungsi untuk menghitung nilai per user
            const calculateTotalNilai = (feedback) => {
                const nilaiPerUser = 
                    (feedback.question_1 * 25) + 
                    (feedback.question_2 * 25) +
                    (feedback.question_3 * 25) +
                    (feedback.question_4 * 25);
                    
                return nilaiPerUser / 4;
            };
    
            let formattedData = history.map(data => {
                const totalNilai = calculateTotalNilai(data);
    
                return {
                    id: data.id,
                    name: data.User_info ? data.User_info.name : null,
                    nip: data.User_info ? data.User_info.nip : null,
                    gender: data.User_info ? data.User_info.gender : null,
                    date: data.createdAt, 
                    kritiksaran: data.feedback,
                    nilai: totalNilai,
                };
            });
    
            // Menghitung nilai rata-rata keseluruhan untuk layanan tersebut
            const totalNilaiKeseluruhan = formattedData.reduce((sum, item) => sum + item.nilai, 0);
            const rataRataNilaiKeseluruhan = totalNilaiKeseluruhan / totalCount;
    
            const pagination = generatePagination(totalCount, page, limit, `/api/user/historysurvey/${idlayanan}`);
    
            res.status(200).json({
                status: 200,
                message: 'Success get data',
                data: formattedData,
                layanan: layanan,
                rataRataNilaiKeseluruhan: rataRataNilaiKeseluruhan,  // Rata-rata keseluruhan dari semua user
                pagination: pagination
            });
    
        } catch (err) {
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err
            });
            console.log(err);
        }
    },

    // user get inputan feedback nya
    getHistoryForUser: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let { start_date, end_date, search } = req.query;

            let history;
            let totalCount;

            const WhereClause = {};

            WhereClause.userinfo_id = req.user.userId

            if (search) {
                WhereClause[Op.or] = [
                    { '$Layanan.nama$': { [Op.like]: `%${search}%` } },
                    { '$Layanan.Bidang.nama$': { [Op.like]: `%${search}%` } }
                ];
            }

            if (start_date && end_date) {
                WhereClause.createdAt = {
                    [Op.between]: [moment(start_date).startOf('day').toDate(), moment(end_date).endOf('day').toDate()]
                };
            } else if (start_date) {
                WhereClause.createdAt = {
                    [Op.gte]: moment(start_date).startOf('day').toDate()
                };
            } else if (end_date) {
                WhereClause.createdAt = {
                    [Op.lte]: moment(end_date).endOf('day').toDate()
                };
            }

            [history, totalCount] = await Promise.all([
                User_feedback.findAll({
                    where: WhereClause,
                    limit: limit,
                    offset: offset,
                    order: [['id', 'DESC']],
                    include: [
                        {
                            model: Layanan,
                            attributes: ['nama'],
                            include: [
                                {
                                    model: Bidang,
                                    attributes: ['nama']
                                }
                            ],
                        }
                    ],
                }),
                User_feedback.count({
                    where: WhereClause,
                    include: [
                        {
                            model: Layanan,
                            attributes: ['nama'],
                            include: [
                                {
                                    model: Bidang,
                                    attributes: ['nama']
                                }
                            ],
                        }
                    ],
                })
            ]);

            const transformedHistory = history.map(item => ({
                id: item.id,
                // no_skm: item.no_skm,
                userinfo_id: item.userinfo_id,
                layanan_id: item.layanan_id,
                layanan_name: item?.Layanan?.nama,
                bidang_name: item?.Layanan?.Bidang?.nama,
                date: item.date,
                question_1: item.question_1,
                question_2: item.question_2,
                question_3: item.question_3,
                question_4: item.question_4,
                feedback: item.feedback,
                createdAt: item?.createdAt,
                updatedAt: item?.updatedAt,
            }));

            const pagination = generatePagination(totalCount, page, limit, `/api/user/get/history/feedback`);

            res.status(200).json({
                status: 200,
                message: 'success get',
                data: transformedHistory,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    // user get feedback by id nya
    getDetailHistoryFeedback: async (req, res) => {
        try {
            const idfeedback = req.params.idfeedback;
    
            // Cari feedback berdasarkan id
            const feedbackData = await User_feedback.findOne({
                where: {
                    id: idfeedback
                },
                include: [
                    {
                        model: Layanan,
                        attributes: ['id', 'nama'],
                        include: [
                            {
                                model: Bidang,
                                attributes: ['id', 'nama'],
                            },
                        ]
                    },
                ]
            });
    
            if (!feedbackData) {
                return res.status(404).json(response(404, 'Data not found'));
            }
    
            // Ambil detail feedback, layanan, dan bidang
            const question_1 = feedbackData.question_1;
            const question_2 = feedbackData.question_2;
            const question_3 = feedbackData.question_3;
            const question_4 = feedbackData.question_4;
            const feedback = feedbackData.feedback;
            const date = feedbackData.createdAt;
            const layanan_name = feedbackData.Layanan?.nama;
            const bidang_name = feedbackData.Layanan?.Bidang?.nama;
    
            // Jika diperlukan lebih dari satu data, modifikasi di sini
            const formatteddata = {
                id: feedbackData.id,
                question_1,
                question_2,
                question_3,
                question_4,
                feedback,
                date,
                // nilai: feedbackData.nilai,
                layanan_name: layanan_name || 'Unknown',
                bidang_name: bidang_name || 'Unknown',
                
            };
    
            res.status(200).json(response(200, 'Success get data', formatteddata));
        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'Internal server error', err));
        }
    },
    
    getPDFHistoryByBidang: async (req, res) => {
        try {
            // const instansi_id = 4
            const bidang_id = data?.bidang_id || req.query.bidang_id
            let history;

            const start_date = req.query.start_date;
            const end_date = req.query.end_date;

            const WhereClause = {};

            if (start_date && end_date) {
                WhereClause.createdAt = {
                    [Op.between]: [moment(start_date).startOf('day').toDate(), moment(end_date).endOf('day').toDate()]
                };
            } else if (start_date) {
                WhereClause.createdAt = {
                    [Op.gte]: moment(start_date).startOf('day').toDate()
                };
            } else if (end_date) {
                WhereClause.createdAt = {
                    [Op.lte]: moment(end_date).endOf('day').toDate()
                };
            }

            const WhereClause2 = {};
            if (bidang_id) {
                WhereClause2.id = bidang_id;
            }

            [history] = await Promise.all([
                Layanan.findAll({
                    include: [
                        {
                            model: User_feedback,
                            include: [
                                // {
                                //     model: Surveyforminput,
                                // },
                                {
                                    model: User_info,
                                    attributes: ['id', 'name', 'nip', 'gender'],
                                },
                            ],
                            where: WhereClause
                        },
                        {
                            model: Bidang,
                            attributes: ['nama'],
                            where: WhereClause2,
                            include: [
                                {
                                    model: Surveyform,
                                    attributes: ['field'],
                                }
                            ]
                        },
                    ],
                })
            ]);

            let nilaiPerSurveyFormId = {};
            // Objek untuk menghitung jumlah surveyformnum per surveyform_id
            let countsurvey;

            const templatePath = path.resolve(__dirname, '../views/surveybyinstansi.html');
            const templatePath2 = path.resolve(__dirname, '../views/surveybyinstansi2.html');

            let htmlContent = fs.readFileSync(templatePath, 'utf8');
            let htmlContent2 = fs.readFileSync(templatePath2, 'utf8');

            history?.forEach(data => {
                data?.Instansi?.Surveyforms?.forEach((surveyform, index) => {
                    htmlContent2 = htmlContent2.replace(`{{field${index + 1}}}`, surveyform.field ?? '-');
                });
                
                countsurvey = data.Surveyformnums.length
                data.Surveyformnums.forEach(surveyformnum => {
                    surveyformnum.Surveyforminputs.forEach(input => {
                        // Jika surveyform_id belum ada dalam objek, inisialisasi dengan 0
                        if (!nilaiPerSurveyFormId[input.surveyform_id]) {
                            nilaiPerSurveyFormId[input.surveyform_id] = 0;
                        }
                        // Tambahkan nilai ke surveyform_id yang sesuai
                        nilaiPerSurveyFormId[input.surveyform_id] += input.nilai;
                        // Hitung jumlah surveyformnum untuk surveyform_id yang sesuai
                    });
                });
            });

            let totalSigmaUnsur = 0
            for (let id in nilaiPerSurveyFormId) {
                totalSigmaUnsur += nilaiPerSurveyFormId[id];
            }

            // Hitung rata-rata nilai per surveyform_id
            let rataRataNilaiPerSurveyFormId = {};
            for (let id in nilaiPerSurveyFormId) {
                rataRataNilaiPerSurveyFormId[id] = nilaiPerSurveyFormId[id] / countsurvey;
            }

            let totalNRRU = 0
            for (let id in rataRataNilaiPerSurveyFormId) {
                totalNRRU += rataRataNilaiPerSurveyFormId[id];
            }

            // Hitung nilai rata-rata dikalikan 0.11
            let hasilPerSurveyFormId = {};
            for (let id in rataRataNilaiPerSurveyFormId) {
                hasilPerSurveyFormId[id] = rataRataNilaiPerSurveyFormId[id] * 0.11;
            }

            // Totalkan hasilPerSurveyFormId
            let totalHasil = 0;
            for (let id in hasilPerSurveyFormId) {
                totalHasil += hasilPerSurveyFormId[id];
            }

            let hasilfix = totalHasil * 25;

            const calculateforHistory = (surveyforminputs) => {
                let nilaiPerSurveyform = {};

                surveyforminputs.forEach(input => {
                    if (!nilaiPerSurveyform[input.surveyform_id]) {
                        nilaiPerSurveyform[input.surveyform_id] = 0;
                    }
                    nilaiPerSurveyform[input.surveyform_id] += input.nilai || 0;
                });

                for (let surveyform_id in nilaiPerSurveyform) {
                    nilaiPerSurveyform[surveyform_id] = (nilaiPerSurveyform[surveyform_id]);
                }

                return nilaiPerSurveyform;

            };

            let formattedData = history.map(service => {
                return service.Surveyformnums?.map(data => {
                    const surveyforminputsNilai = data?.Surveyforminputs ? calculateforHistory(data?.Surveyforminputs) : {};

                    // Urutkan nilai berdasarkan ID terkecil hingga terbesar
                    const sortedKeys = Object.keys(surveyforminputsNilai).sort((a, b) => a - b);
                    const sortedNilai = sortedKeys.map(key => surveyforminputsNilai[key]);

                    // Masukkan nilai ke U1 - U9 sesuai urutan
                    const result = {
                        id: data?.id,
                        layanan: service?.name,
                        U1: sortedNilai[0] || 0,
                        U2: sortedNilai[1] || 0,
                        U3: sortedNilai[2] || 0,
                        U4: sortedNilai[3] || 0,
                        U5: sortedNilai[4] || 0,
                        U6: sortedNilai[5] || 0,
                        U7: sortedNilai[6] || 0,
                        U8: sortedNilai[7] || 0,
                        U9: sortedNilai[8] || 0,
                        nilai: sortedNilai.reduce((sum, nilai) => sum + nilai, 0), // Hitung total nilai
                        name: data?.Userinfo?.name || data?.name
                    };

                    return result;
                });
            }).flat();

            let reportTableRows;
            if (formattedData?.length > 0) {
                reportTableRows = formattedData?.map(survey => `
                    <tr>
                        <td>${survey?.name}</td>
                        <td class="center">${survey?.layanan}</td>
                        <td class="center">${survey?.U1}</td>
                        <td class="center">${survey?.U2}</td>
                        <td class="center">${survey?.U3}</td>
                        <td class="center">${survey?.U4}</td>
                        <td class="center">${survey?.U5}</td>
                        <td class="center">${survey?.U6}</td>
                        <td class="center">${survey?.U7}</td>
                        <td class="center">${survey?.U8}</td>
                        <td class="center">${survey?.U9}</td>
                        <td class="center">${survey?.nilai}</td>
                    </tr>
                `).join('');
            } else {
                reportTableRows = `
                    <tr>
                        <td class="center" colspan="12" style="color: red;"><strong>DATA KOSONG</strong></td>
                    </tr>
                `
            }

            const instansiInfo = history[0]?.Instansi?.name ? `<p>Instansi : ${history[0]?.Instansi?.name}</p>` : '';
            htmlContent = htmlContent.replace('{{reportTableRows}}', reportTableRows ? reportTableRows : '');

            if (nilaiPerSurveyFormId && Object.keys(nilaiPerSurveyFormId).length > 0) {
                sortedKeys = Object.keys(nilaiPerSurveyFormId).sort((a, b) => a - b).slice(0, 9);

                sortedKeys.forEach((key, index) => {
                    htmlContent = htmlContent.replace(`{{Su${index + 1}}}`, nilaiPerSurveyFormId[key] ?? 0);
                });
            } else {
                // Jika nilaiPerSurveyFormId kosong, isi Su1-Su9 dengan 0
                for (let index = 0; index < 9; index++) {
                    htmlContent = htmlContent.replace(`{{Su${index + 1}}}`, 0);
                }
            }

            // Untuk rataRataNilaiPerSurveyFormId
            if (rataRataNilaiPerSurveyFormId && Object.keys(rataRataNilaiPerSurveyFormId).length > 0) {
                sortedKeys = Object.keys(rataRataNilaiPerSurveyFormId).sort((a, b) => a - b).slice(0, 9);

                // Masukkan nilai dari NRRU1 hingga NRRU9 berdasarkan urutan key
                sortedKeys.forEach((key, index) => {
                    htmlContent = htmlContent.replace(`{{NRRU${index + 1}}}`, rataRataNilaiPerSurveyFormId[key]?.toFixed(2) || 0);
                    htmlContent2 = htmlContent2.replace(`{{NRRU${index + 1}}}`, rataRataNilaiPerSurveyFormId[key]?.toFixed(2) || 0);
                });
            } else {
                // Jika rataRataNilaiPerSurveyFormId kosong, isi NRRU1-NRRU9 dengan 0
                for (let i = 1; i <= 9; i++) {
                    htmlContent = htmlContent.replace(`{{NRRU${i}}}`, 0);
                    htmlContent2 = htmlContent2.replace(`{{NRRU${i}}}`, 0);
                }
            }

            // Untuk hasilPerSurveyFormId
            if (hasilPerSurveyFormId && Object.keys(hasilPerSurveyFormId).length > 0) {
                sortedKeys = Object.keys(hasilPerSurveyFormId).sort((a, b) => a - b).slice(0, 9);

                // Masukkan nilai dari NRRUT1 hingga NRRUT9 berdasarkan urutan key
                sortedKeys.forEach((key, index) => {
                    htmlContent = htmlContent.replace(`{{NRRUT${index + 1}}}`, hasilPerSurveyFormId[key]?.toFixed(2) || 0);
                });
            } else {
                // Jika hasilPerSurveyFormId kosong, isi NRRUT1-NRRUT9 dengan 0
                for (let i = 1; i <= 9; i++) {
                    htmlContent = htmlContent.replace(`{{NRRUT${i}}}`, 0);
                }
            }

            htmlContent = htmlContent.replace('{{instansiInfo}}', instansiInfo);
            htmlContent = htmlContent.replace('{{totalSigmaUnsur}}', totalSigmaUnsur);
            htmlContent = htmlContent.replace('{{totalNRRU}}', totalNRRU?.toFixed(2));
            htmlContent = htmlContent.replace('{{totalNRRUT}}', totalHasil?.toFixed(2));
            htmlContent = htmlContent.replace('{{total_nilai}}', hasilfix?.toFixed(2));
            htmlContent2 = htmlContent2.replace('{{total_nilai}}', hasilfix?.toFixed(2));
            htmlContent2 = htmlContent2.replace('{{total_nilai2}}', hasilfix?.toFixed(2));

            if (hasilfix >= 88.31 && hasilfix <= 100) {
                htmlContent2 = htmlContent2.replace('{{predikat_nilai}}', 'A');
                htmlContent2 = htmlContent2.replace('{{predikat_detail}}', 'SANGAT BAIK');
            } else if (hasilfix >= 76.61 && hasilfix <= 88.30) {
                htmlContent2 = htmlContent2.replace('{{predikat_nilai}}', 'B');
                htmlContent2 = htmlContent2.replace('{{predikat_detail}}', 'BAIK');
            } else if (hasilfix >= 65.00 && hasilfix <= 76.60) {
                htmlContent2 = htmlContent2.replace('{{predikat_nilai}}', 'C');
                htmlContent2 = htmlContent2.replace('{{predikat_detail}}', 'KURANG BAIK');
            } else if (hasilfix >= 25.00 && hasilfix <= 64.99) {
                htmlContent2 = htmlContent2.replace('{{predikat_nilai}}', 'D');
                htmlContent2 = htmlContent2.replace('{{predikat_detail}}', 'TIDAK BAIK');
            } else if (hasilfix >= 0 && hasilfix <= 24.99) {
                htmlContent2 = htmlContent2.replace('{{predikat_nilai}}', 'E');
                htmlContent2 = htmlContent2.replace('{{predikat_detail}}', 'SANGAT TIDAK BAIK');
            }

            // // Launch Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // // Set HTML content
            let finalHtmlContent = htmlContent.replace('{{footerContent}}', htmlContent2);
            await page.setContent(finalHtmlContent, { waitUntil: 'networkidle0' });

            // // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'Legal',
                landscape: true,
                margin: {
                    top: '0.5in',
                    right: '0.5in',
                    bottom: '0.5in',
                    left: '0.5in'
                }
            });

            await browser.close();

            // // Generate filename
            const currentDate = new Date().toISOString().replace(/:/g, '-');
            const filename = `skm-${currentDate}.pdf`;

            // // Send PDF buffer
            res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
            res.setHeader('Content-type', 'application/pdf');
            res.send(pdfBuffer);
            // res.status(500).json(response(200, 'aaa'));
        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },


}