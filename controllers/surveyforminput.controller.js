const { response } = require('../helpers/response.formatter');

const { Surveyforminput, Surveyformnum, Surveyform, Layanan, Userinfo, sequelize, Instansi } = require('../models');
require('dotenv').config()
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const puppeteer = require('puppeteer');
const { generatePagination } = require('../pagination/pagination');

const pendidikanList = [
    { id: 1, key: 'Tidak Sekolah' },
    { id: 2, key: 'SD' },
    { id: 3, key: 'SMP' },
    { id: 4, key: 'SMA' },
    { id: 5, key: 'D1' },
    { id: 6, key: 'D2' },
    { id: 7, key: 'D3' },
    { id: 8, key: 'S1' },
    { id: 9, key: 'S2' },
    { id: 10, key: 'S3' }
];

const getPendidikanKey = (id) => {
    const found = pendidikanList.find(p => p.id === id);
    return found ? found.key : 'Unknown';
};

const getGenderKey = (id) => {
    return id === 1 ? 'Laki-Laki' : id === 2 ? 'Perempuan' : 'Unknown';
};

module.exports = {

    //input survey user
    inputsurvey: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {

            const idlayanan = req.params.idlayanan;
            const iduser = data.userId;

            if (!iduser) {
                throw new Error('User ID is required');
            }

            const { datainput } = req.body;

            let dataLayanan = await Layanan.findOne({
                where: {
                    id: idlayanan
                },
                include: [
                    {
                        model: Instansi,
                        attributes: ['name', 'code']
                    },
                ],
                attributes: ['id', 'code'],
            });

            const count = await Surveyformnum.count({
                where: {
                    layanan_id: idlayanan
                }
            });

            const urut = String(count + 1).padStart(1, '0');
            const no_skm = `SKM${dataLayanan?.Instansi?.code}-${dataLayanan?.code}${urut}`;

            let layananID = {
                no_skm: no_skm,
                userinfo_id: Number(iduser),
                layanan_id: Number(idlayanan),
                date: req.body.date ?? null,
                kritiksaran: req.body.kritiksaran ?? null
            };

            const createdSurveyformnum = await Surveyformnum.create(layananID, { transaction });

            const updatedDatainput = datainput.map(item => ({
                ...item,
                surveyformnum_id: createdSurveyformnum.id
            }));

            const createdSurveyforminput = await Surveyforminput.bulkCreate(updatedDatainput, { transaction });

            await transaction.commit();
            res.status(201).json(response(201, 'Success create', createdSurveyforminput));
        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.error(err);
        }
    },

    //get survey form user
    getdetailsurveyform: async (req, res) => {
        try {
            const idsurveynum = req.params.idsurveynum;

            let inputsurveyData = await Surveyforminput.findAll({
                where: {
                    surveyformnum_id: idsurveynum
                },
                include: [
                    {
                        model: Surveyform,
                        attributes: { exclude: ['createdAt', 'updatedAt'] },
                    },
                    {
                        model: Surveyformnum,
                        attributes: ['kritiksaran', 'no_skm', 'date'],
                        include: [
                            {
                                model: Layanan,
                                attributes: ['id', 'name'],
                                include: [
                                    {
                                        model: Instansi,
                                        attributes: ['id', 'name'],
                                    },
                                ]
                            },
                        ]
                    }
                ]
            });

            if (!inputsurveyData || inputsurveyData?.length < 1) {
                res.status(404).json(response(404, 'data not found'));
                return;
            }

            // Assuming all records will have the same 'kritiksaran' since they share 'surveyformnum_id'
            const kritiksaran = inputsurveyData[0]?.Surveyformnum?.kritiksaran;
            const no_skm = inputsurveyData[0]?.Surveyformnum?.no_skm;
            const date = inputsurveyData[0]?.Surveyformnum?.date;
            const layanan_name = inputsurveyData[0]?.Surveyformnum?.Layanan?.name;
            const instansi_name = inputsurveyData[0]?.Surveyformnum?.Layanan?.Instansi?.name;

            let formatteddata = inputsurveyData.map(datafilter => {
                return {
                    id: datafilter?.id,
                    nilai: datafilter?.nilai,
                    surveyform_id: datafilter?.surveyform_id,
                    surveyformnum_id: datafilter?.surveyformnum_id,
                    surveyform_name: datafilter?.Surveyform?.field,
                };
            });

            res.status(200).json(response(200, 'success get data', { instansi_name, layanan_name, kritiksaran, no_skm, date, formatteddata }));
        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    //get history input survey user
    gethistorybyinstansi: async (req, res) => {
        try {
            const instansi_id = Number(req.query.instansi_id);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const start_date = req.query.start_date;
            const end_date = req.query.end_date;
            let history;
            let totalCount;

            const WhereClause = {};
            if (instansi_id) {
                WhereClause.instansi_id = instansi_id;
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
                Layanan.findAll({
                    include: [{
                        model: Surveyformnum,
                        include: [{
                            model: Surveyforminput,
                        }],
                    }],
                    where: WhereClause,
                    limit: limit,
                    offset: offset,
                    // order: [['id', 'DESC']]
                }),
                Layanan.count({
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

            let formattedData = history.map(data => {
                const surveyformnumsCount = data.Surveyformnums ? data.Surveyformnums.length : 0;
                const surveyformnumsNilai = data.Surveyformnums ? calculateNilai(data.Surveyformnums) : 0;

                let totalNilaiPerLayanan = Object.values(surveyformnumsNilai).reduce((sum, nilai) => sum + nilai, 0);

                return {
                    id: data.id,
                    layanan_name: data.name || null,
                    Surveyformnums_count: surveyformnumsCount,
                    Surveyformnums_nilai: totalNilaiPerLayanan * 25,
                    created_at: data.createdAt
                };
            });

            const pagination = generatePagination(totalCount, page, limit, `/api/user/historysurvey`);

            res.status(200).json({
                status: 200,
                message: 'success get',
                data: formattedData,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    gethistoryforuser: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let { start_date, end_date, search } = req.query;

            let history;
            let totalCount;

            const WhereClause = {};

            WhereClause.userinfo_id = data.userId

            if (search) {
                WhereClause[Op.or] = [
                    { '$Layanan.name$': { [Op.iLike]: `%${search}%` } },
                    { '$Layanan.Instansi.name$': { [Op.iLike]: `%${search}%` } }
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
                Surveyformnum.findAll({
                    where: WhereClause,
                    limit: limit,
                    offset: offset,
                    order: [['id', 'DESC']],
                    include: [
                        {
                            model: Layanan,
                            attributes: ['name'],
                            include: [
                                {
                                    model: Instansi,
                                    attributes: ['name']
                                }
                            ],
                        }
                    ],
                }),
                Surveyformnum.count({
                    where: WhereClause,
                    include: [
                        {
                            model: Layanan,
                            attributes: ['name'],
                            include: [
                                {
                                    model: Instansi,
                                    attributes: ['name']
                                }
                            ],
                        }
                    ],
                })
            ]);

            const transformedHistory = history.map(item => ({
                id: item.id,
                no_skm: item.no_skm,
                userinfo_id: item.userinfo_id,
                layanan_id: item.layanan_id,
                date: item.date,
                kritiksaran: item.kritiksaran,
                createdAt: item?.createdAt,
                updatedAt: item?.updatedAt,
                layanan_name: item?.Layanan?.name,
                instansi_name: item?.Layanan?.Instansi?.name
            }));

            const pagination = generatePagination(totalCount, page, limit, `/api/user/userhistorysurvey`);

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

    // getPDFhistorysurveyuser: async (req, res) => {
    //     try {
    //         const instansi_id = Number(req.query.instansi_id);
    //         let history;
    //         let totalCount;
    //         const start_date = req.query.start_date;
    //         const end_date = req.query.end_date;

    //         const WhereClause = {};
    //         if (instansi_id) {
    //             WhereClause.instansi_id = instansi_id;
    //         }
    //         if (start_date && end_date) {
    //             WhereClause.createdAt = {
    //                 [Op.between]: [moment(start_date).startOf('day').toDate(), moment(end_date).endOf('day').toDate()]
    //             };
    //         } else if (start_date) {
    //             WhereClause.createdAt = {
    //                 [Op.gte]: moment(start_date).startOf('day').toDate()
    //             };
    //         } else if (end_date) {
    //             WhereClause.createdAt = {
    //                 [Op.lte]: moment(end_date).endOf('day').toDate()
    //             };
    //         }

    //         [history, totalCount] = await Promise.all([
    //             Layanan.findAll({
    //                 include: [{
    //                     model: Surveyformnum,
    //                     include: [{
    //                         model: Surveyforminput,
    //                     }],
    //                 }],
    //                 where: WhereClause
    //             }),
    //             Layanan.count({
    //                 where: WhereClause,
    //             })
    //         ]);

    //         const calculateNilai = (surveyformnums) => {
    //             let nilaiPerSurveyform = {};
    //             let totalSurveyformnum = surveyformnums.length;

    //             surveyformnums.forEach(surveyformnum => {
    //                 surveyformnum.Surveyforminputs.forEach(input => {
    //                     if (!nilaiPerSurveyform[input.surveyform_id]) {
    //                         nilaiPerSurveyform[input.surveyform_id] = 0;
    //                     }
    //                     nilaiPerSurveyform[input.surveyform_id] += input.nilai || 0;
    //                 });
    //             });

    //             console.log(nilaiPerSurveyform)

    //             for (let surveyform_id in nilaiPerSurveyform) {
    //                 nilaiPerSurveyform[surveyform_id] = (nilaiPerSurveyform[surveyform_id] / totalSurveyformnum) * 0.11;
    //             }
    //             // console.log(nilaiPerSurveyform)
    //             return nilaiPerSurveyform;
    //         };

    //         let formattedData = history.map(data => {
    //             const surveyformnumsCount = data.Surveyformnums ? data.Surveyformnums.length : 0;
    //             const surveyformnumsNilai = data.Surveyformnums ? calculateNilai(data.Surveyformnums) : 0;

    //             let totalNilaiPerLayanan = Object.values(surveyformnumsNilai).reduce((sum, nilai) => sum + nilai, 0);

    //             return {
    //                 id: data.id,
    //                 layanan_name: data.name || null,
    //                 Surveyformnums_count: surveyformnumsCount,
    //                 Surveyformnums_nilai: totalNilaiPerLayanan * 25
    //             };
    //         });

    //         // Generate HTML content for PDF
    //         const templatePath = path.resolve(__dirname, '../views/surveybyinstansi.html');
    //         let htmlContent = fs.readFileSync(templatePath, 'utf8');
    //         let instansiGet;

    //         if (instansi_id) {
    //             instansiGet = await Instansi.findOne({
    //                 where: {
    //                     id: instansi_id
    //                 }
    //             });
    //         }

    //         const instansiInfo = instansiGet?.name ? `<p>Instansi : ${instansiGet?.name}</p>` : '';

    //         const reportTableRows = formattedData.map(survey => `
    //             <tr>
    //                 <td>${survey.layanan_name}</td>
    //                 <td class="center">${survey.Surveyformnums_count}</td>
    //                 <td class="center">${survey.Surveyformnums_nilai.toFixed(2)}</td>
    //             </tr>
    //         `).join('');

    //         htmlContent = htmlContent.replace('{{instansiInfo}}', instansiInfo);
    //         htmlContent = htmlContent.replace('{{reportTableRows}}', reportTableRows);

    //         // Launch Puppeteer
    //         const browser = await puppeteer.launch({
    //             headless: true,
    //             args: ['--no-sandbox', '--disable-setuid-sandbox']
    //         });
    //         const page = await browser.newPage();

    //         // Set HTML content
    //         await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    //         // Generate PDF
    //         const pdfBuffer = await page.pdf({
    //             format: 'A4',
    //             margin: {
    //                 top: '1.16in',
    //                 right: '1.16in',
    //                 bottom: '1.16in',
    //                 left: '1.16in'
    //             }
    //         });

    //         await browser.close();

    //         // Generate filename
    //         const currentDate = new Date().toISOString().replace(/:/g, '-');
    //         const filename = `laporan-${currentDate}.pdf`;

    //         // Send PDF buffer
    //         res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    //         res.setHeader('Content-type', 'application/pdf');
    //         res.send(pdfBuffer);

    //     } catch (err) {
    //         res.status(500).json(response(500, 'Internal server error', err));
    //         console.log(err);
    //     }
    // },

    //get history survey by layanan

    getPDFhistoryALL: async (req, res) => {
        try {

            let history;

            const WhereClause = {};

            [history] = await Promise.all([
                Layanan.findAll({
                    include: [
                        {
                            model: Surveyformnum,
                            include: [
                                {
                                    model: Surveyforminput,
                                    order: [['id', 'ASC']]
                                },
                                {
                                    model: Userinfo,
                                    attributes: ['id', 'name', 'pendidikan', 'gender'],
                                },
                            ],
                            where: WhereClause
                        },
                        {
                            model: Instansi,
                            attributes: ['id', 'name']
                        }
                    ],
                })
            ]);

            let instansiSurveyMap = {}; // Menyimpan total nilai per instansi dan surveyform_id asli
            let mappedSurveyPerInstansi = {}; // Menyimpan peta surveyform_id jadi rentang 1-9 per instansi
            let nilaiPerSurveyFormId = {}; // Menyimpan hasil akhir setelah perhitungan    
            let countsurvey = 0;

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
                        instansi: service?.Instansi.name,
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

            history?.forEach(data => {
                countsurvey += data.Surveyformnums.length
                const instansiId = data.Instansi.id;

                if (!instansiSurveyMap[instansiId]) {
                    instansiSurveyMap[instansiId] = {};
                }

                data.Surveyformnums.forEach(surveyformnum => {
                    surveyformnum.Surveyforminputs.forEach(input => {
                        if (!instansiSurveyMap[instansiId][input.surveyform_id]) {
                            instansiSurveyMap[instansiId][input.surveyform_id] = 0;
                        }
                        instansiSurveyMap[instansiId][input.surveyform_id] += input.nilai;
                    });
                });
            });

            // Menerapkan mapping surveyform_id ke 1-9
            Object.keys(instansiSurveyMap).forEach(instansiId => {
                const surveyFormIds = Object.keys(instansiSurveyMap[instansiId]); // Ambil semua surveyform_id
                mappedSurveyPerInstansi[instansiId] = {}; // Buat peta baru

                surveyFormIds.forEach((formId, index) => {
                    mappedSurveyPerInstansi[instansiId][formId] = index + 1; // Map ke rentang 1-9
                });
            });

            // Menghitung nilai berdasarkan mapped survey per instansi
            for (const instansiId in mappedSurveyPerInstansi) {
                for (const originalFormId in mappedSurveyPerInstansi[instansiId]) {
                    const mappedId = mappedSurveyPerInstansi[instansiId][originalFormId]; // Ambil mapped ID

                    if (!nilaiPerSurveyFormId[mappedId]) {
                        nilaiPerSurveyFormId[mappedId] = 0; // Inisialisasi nilai
                    }

                    // Tambahkan nilai dari instansiSurveyMap ke nilaiPerSurveyFormId
                    nilaiPerSurveyFormId[mappedId] += instansiSurveyMap[instansiId][originalFormId];
                }
            }

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

            const templatePath = path.resolve(__dirname, '../views/surveyall.html');
            let htmlContent = fs.readFileSync(templatePath, 'utf8');

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
                });
            } else {
                // Jika rataRataNilaiPerSurveyFormId kosong, isi NRRU1-NRRU9 dengan 0
                for (let i = 1; i <= 9; i++) {
                    htmlContent = htmlContent.replace(`{{NRRU${i}}}`, 0);
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

            let reportTableRows;
            if (formattedData?.length > 0) {
                reportTableRows = formattedData?.map(survey => `
                    <tr>
                        <td>${survey?.name}</td>
                        <td class="center">${survey?.instansi}</td>
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
                        <td class="center" colspan="13" style="color: red;"><strong>DATA KOSONG</strong></td>
                    </tr>
                `
            }

            htmlContent = htmlContent.replace('{{reportTableRows}}', reportTableRows ? reportTableRows : '');
            htmlContent = htmlContent.replace('{{totalSigmaUnsur}}', totalSigmaUnsur);
            htmlContent = htmlContent.replace('{{totalNRRU}}', totalNRRU?.toFixed(2));
            htmlContent = htmlContent.replace('{{totalNRRUT}}', totalHasil?.toFixed(2));
            htmlContent = htmlContent.replace('{{total_nilai}}', hasilfix?.toFixed(2));

            // // Launch Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // // Set HTML content
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

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

    getPDFhistorybyinstansi: async (req, res) => {
        try {
            // const instansi_id = 4
            const instansi_id = data?.instansi_id || req.query.instansi_id
            let history;

            const WhereClause = {};
            const WhereClause2 = {};
            if (instansi_id) {
                WhereClause2.id = instansi_id;
            }

            [history] = await Promise.all([
                Layanan.findAll({
                    include: [
                        {
                            model: Surveyformnum,
                            include: [
                                {
                                    model: Surveyforminput,
                                },
                                {
                                    model: Userinfo,
                                    attributes: ['id', 'name', 'pendidikan', 'gender'],
                                },
                            ],
                            where: WhereClause
                        },
                        {
                            model: Instansi,
                            attributes: ['name'],
                            where: WhereClause2
                        },
                    ],
                })
            ]);

            let nilaiPerSurveyFormId = {};
            // Objek untuk menghitung jumlah surveyformnum per surveyform_id
            let countsurvey;

            history?.forEach(data => {
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

            const templatePath = path.resolve(__dirname, '../views/surveybyinstansi.html');
            let htmlContent = fs.readFileSync(templatePath, 'utf8');

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
                });
            } else {
                // Jika rataRataNilaiPerSurveyFormId kosong, isi NRRU1-NRRU9 dengan 0
                for (let i = 1; i <= 9; i++) {
                    htmlContent = htmlContent.replace(`{{NRRU${i}}}`, 0);
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

            // // Launch Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // // Set HTML content
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

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

    getsurveybylayanan: async (req, res) => {
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
                    attributes: ['id', 'name'],
                }),
                Surveyformnum.findAll({
                    include: [
                        {
                            model: Surveyforminput,
                        },
                        {
                            model: Userinfo,
                            attributes: ['id', 'name', 'pendidikan', 'gender'],
                        },
                    ],
                    where: WhereClause,
                    limit: limit,
                    offset: offset
                }),
                Surveyformnum.count({
                    where: WhereClause,
                })
            ]);

            const calculateNilai = (surveyforminputs) => {
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

            let formattedData = history.map(data => {
                const surveyforminputsNilai = data.Surveyforminputs ? calculateNilai(data.Surveyforminputs) : 0;

                let totalNilaiPerLayanan = Object.values(surveyforminputsNilai).reduce((sum, nilai) => sum + nilai, 0);

                return {
                    id: data.id,
                    date: data.date,
                    kritiksaran: data.kritiksaran,
                    nilai: totalNilaiPerLayanan,
                    name: data.Userinfo ? data.Userinfo.name : null,
                    pendidikan: data.Userinfo ? data.Userinfo.pendidikan : null,
                    gender: data.Userinfo ? data.Userinfo.gender : null
                };
            });

            const pagination = generatePagination(totalCount, page, limit, `/api/user/historysurvey/${idlayanan}`);

            res.status(200).json({
                status: 200,
                message: 'success get',
                data: formattedData,
                layanan: layanan,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    getPDFsurveybylayanan: async (req, res) => {
        try {
            const idlayanan = Number(req.params.idlayanan);
            let history;
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

            [history, totalCount] = await Promise.all([
                Layanan.findAll({
                    include: [
                        {
                            model: Surveyformnum,
                            include: [
                                {
                                    model: Surveyforminput,
                                },
                                {
                                    model: Userinfo,
                                    attributes: ['id', 'name', 'pendidikan', 'gender'],
                                },
                            ],
                            where: WhereClause
                        },
                        {
                            model: Instansi,
                            attributes: ['name']
                        },
                    ],
                    where: {
                        id: idlayanan
                    },
                }),
                Surveyformnum.count({
                    where: WhereClause,
                })
            ]);

            let sigmaunsur;
            let NRRU;
            let NRRUT;

            const calculateNilai = (surveyformnums) => {
                let nilaiPerSurveyform = {};
                let nilaiPerSurveyform2 = {};
                let nilaiPerSurveyform3 = {};
                let totalSurveyformnum = surveyformnums.length;

                surveyformnums.forEach(surveyformnum => {
                    surveyformnum.Surveyforminputs.forEach(input => {
                        if (!nilaiPerSurveyform[input.surveyform_id]) {
                            nilaiPerSurveyform[input.surveyform_id] = 0;
                            nilaiPerSurveyform2[input.surveyform_id] = 0;
                            nilaiPerSurveyform3[input.surveyform_id] = 0;
                        }
                        nilaiPerSurveyform[input.surveyform_id] += input.nilai || 0;
                        nilaiPerSurveyform2[input.surveyform_id] += input.nilai || 0;
                        nilaiPerSurveyform3[input.surveyform_id] += input.nilai || 0;
                    });
                });

                sigmaunsur = nilaiPerSurveyform2

                for (let surveyform_id in nilaiPerSurveyform) {
                    nilaiPerSurveyform[surveyform_id] = (nilaiPerSurveyform[surveyform_id] / totalSurveyformnum);

                    nilaiPerSurveyform3[surveyform_id] = (nilaiPerSurveyform3[surveyform_id] / totalSurveyformnum);

                    NRRU = nilaiPerSurveyform3

                    nilaiPerSurveyform[surveyform_id] = nilaiPerSurveyform[surveyform_id] * 0.11; // Pengalian dengan 0.11
                }

                NRRUT = nilaiPerSurveyform

                return nilaiPerSurveyform;
            };

            const calculateNilai2 = (surveyforminputs) => {
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

            let calculateData = history?.map(data => {
                const surveyformnumsCount = data.Surveyformnums ? data.Surveyformnums.length : 0;
                const surveyformnumsNilai = data.Surveyformnums ? calculateNilai(data.Surveyformnums) : 0;

                let totalNilaiPerId = Object.values(surveyformnumsNilai).reduce((sum, nilai) => sum + nilai, 0);

                return {
                    id: data.id,
                    layanan_name: data.name || null,
                    Surveyformnums_count: surveyformnumsCount,
                    Surveyformnums_nilai: totalNilaiPerId * 25
                };
            });

            let formattedData = history[0]?.Surveyformnums?.map(data => {
                const surveyforminputsNilai = data?.Surveyforminputs ? calculateNilai2(data?.Surveyforminputs) : {};

                // Urutkan nilai berdasarkan ID terkecil hingga terbesar
                const sortedKeys = Object.keys(surveyforminputsNilai).sort((a, b) => a - b);
                const sortedNilai = sortedKeys.map(key => surveyforminputsNilai[key]);

                // Masukkan nilai ke U1 - U9 sesuai urutan
                const result = {
                    id: data?.id,
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
                    name: data?.Userinfo ? data?.Userinfo?.name : null,
                };

                return result;
            });

            // // Generate HTML content for PDF
            const templatePath = path.resolve(__dirname, '../views/surveybylayanan.html');
            let htmlContent = fs.readFileSync(templatePath, 'utf8');

            const instansiInfo = history[0]?.Instansi?.name ? `<p>Instansi : ${history[0]?.Instansi?.name}</p>` : '';
            const layananInfo = history[0]?.name ? `<p>Layanan : ${history[0]?.name}</p>` : '';

            const reportTableRows = formattedData?.map(survey => `
                <tr>
                    <td>${survey?.name}</td>
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

            htmlContent = htmlContent.replace('{{layananInfo}}', layananInfo);
            htmlContent = htmlContent.replace('{{instansiInfo}}', instansiInfo);
            htmlContent = htmlContent.replace('{{reportTableRows}}', reportTableRows ? reportTableRows : '');
            htmlContent = htmlContent.replace('{{total_nilai}}', calculateData[0]?.Surveyformnums_nilai ? calculateData[0]?.Surveyformnums_nilai.toFixed(2) : 0);

            let sortedKeys
            let totalSigmaUnsur = 0
            let totalNRRUT = 0
            let totalNRRU = 0

            if (sigmaunsur) {
                totalSigmaUnsur = Object.values(sigmaunsur).reduce((total, nilai) => total + nilai, 0);

                sortedKeys = Object.keys(sigmaunsur).sort((a, b) => a - b).slice(0, 9);

                // Masukkan nilai dari sigmaunsur ke Su1 hingga Su9 berdasarkan urutan key
                sortedKeys.forEach((key, index) => {
                    htmlContent = htmlContent.replace(`{{Su${index + 1}}}`, sigmaunsur[key] ?? 0);
                });
            } else {
                for (let i = 1; i < 10; i += 1) {
                    htmlContent = htmlContent.replace(`{{Su${i}}}`, 0);
                }
            }

            if (NRRUT) {
                totalNRRUT = Object.values(NRRUT).reduce((total, nilai) => total + nilai, 0);

                sortedKeys = Object.keys(NRRUT).sort((a, b) => a - b).slice(0, 9);

                // Masukkan nilai dari NRRUT ke NRRUT1 hingga NRRUT9 berdasarkan urutan key
                sortedKeys.forEach((key, index) => {
                    htmlContent = htmlContent.replace(`{{NRRUT${index + 1}}}`, NRRUT[key].toFixed(2) || 0);
                });
            } else {
                for (let i = 1; i < 10; i += 1) {
                    htmlContent = htmlContent.replace(`{{NRRUT${i}}}`, 0);
                }
            }

            if (NRRU) {
                totalNRRU = Object.values(NRRU).reduce((total, nilai) => total + nilai, 0);

                sortedKeys = Object.keys(NRRU).sort((a, b) => a - b).slice(0, 9);

                // Masukkan nilai dari NRRU ke NRRU1 hingga NRRU9 berdasarkan urutan key
                sortedKeys.forEach((key, index) => {
                    htmlContent = htmlContent.replace(`{{NRRU${index + 1}}}`, NRRU[key]?.toFixed(2) || 0);
                });
            } else {
                for (let i = 1; i < 10; i += 1) {
                    htmlContent = htmlContent.replace(`{{NRRU${i}}}`, 0);
                }
            }

            htmlContent = htmlContent.replace('{{totalSigmaUnsur}}', totalSigmaUnsur);
            htmlContent = htmlContent.replace('{{totalNRRUT}}', totalNRRUT?.toFixed(2));
            htmlContent = htmlContent.replace('{{totalNRRU}}', totalNRRU?.toFixed(2));

            for (let i = sortedKeys?.length; i < 9; i++) {
                htmlContent = htmlContent.replace(`{{Su${i + 1}}}`, 0);
            }

            // // Launch Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // // Set HTML content
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

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

    getCheckUserSKM: async (req, res) => {
        const { id_layanan } = req.params;
        const id_user = data?.user_akun_id;

        if (!id_user || !id_layanan) {
            return res.status(400).json({ message: 'Bad Request: Missing required parameters' });
        }

        try {
            const survey = await Surveyformnum.findOne({
                where: {
                    userinfo_id: id_user,
                    layanan_id: id_layanan,
                },
                attributes: ['id']
            });

            if (survey) {
                res.status(444).json({
                    status: 444,
                    message: 'Sudah pernah input survey pada layanan ini',
                });
            } else {
                res.status(200).json({
                    status: 200,
                    message: 'Sukses',
                });
            }
        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    statistikSKM_foruser: async (req, res) => {
        try {

            const WhereClause = {};
            const { instansi_id } = req.query;

            if (instansi_id) {
                WhereClause.instansi_id = instansi_id;
            }

            const countByCriteria = (whereClause) => Surveyformnum.count({
                include: [{ model: Userinfo, where: whereClause }],
            });

            [history, countSKM, jmlSKMbyPria, jmlSKMbyWanita, jmlSKMTdkSklh, jmlSKMbySD, jmlSKMbySMP, jmlSKMbySMA, jmlSKMbyD1, jmlSKMbyD2, jmlSKMbyD3, jmlSKMbyS1, jmlSKMbyS2, jmlSKMbyS3, history2] = await Promise.all([
                Layanan.findAll({
                    include: [{
                        model: Surveyformnum,
                        required: false,
                        include: [{
                            model: Surveyforminput,
                        }],
                    }],
                }),
                Surveyformnum.count({
                    where: {
                        userinfo_id: {
                            [Op.ne]: null,
                        },
                    },
                }),
                countByCriteria({ gender: 1 }),
                countByCriteria({ gender: 2 }),
                countByCriteria({ pendidikan: 1 }),
                countByCriteria({ pendidikan: 2 }),
                countByCriteria({ pendidikan: 3 }),
                countByCriteria({ pendidikan: 4 }),
                countByCriteria({ pendidikan: 5 }),
                countByCriteria({ pendidikan: 6 }),
                countByCriteria({ pendidikan: 7 }),
                countByCriteria({ pendidikan: 8 }),
                countByCriteria({ pendidikan: 9 }),
                countByCriteria({ pendidikan: 10 }),
                Layanan.findAll({
                    include: [
                        {
                            model: Surveyformnum,
                            required: false,
                            include: [
                                {
                                    model: Surveyforminput,
                                }
                            ],
                        }
                    ],
                    order: [['id', 'ASC']],
                    limit: 10,
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

            let nilaiSKM_perlayanan = history2.map(data => {
                const surveyformnumsNilai = data.Surveyformnums ? calculateNilai(data.Surveyformnums) : {};

                // Sum up all nilaiPerSurveyform for the current layanan
                let totalNilaiPerLayanan = Object.values(surveyformnumsNilai).reduce((sum, nilai) => sum + nilai, 0);

                return {
                    id: data.id,
                    layanan_name: data.name || null,
                    totalNilaiPerLayanan: totalNilaiPerLayanan * 25
                };
            });

            // Calculate average SKM value
            const validNilaiSKM = nilaiSKM_perlayanan.filter(layanan => layanan.totalNilaiPerLayanan > 0);
            const totalNilaiSKM = validNilaiSKM.reduce((sum, layanan) => sum + layanan.totalNilaiPerLayanan, 0);
            const rataRataNilaiSKM = validNilaiSKM.length > 0 ? totalNilaiSKM / validNilaiSKM.length : 0;

            res.status(200).json({
                status: 200,
                message: 'success get',
                data: {
                    rataRataNilaiSKM,
                    jmlSKMbyGender: {
                        countSKM,
                        jmlSKMbyPria,
                        jmlSKMbyWanita
                    },
                    jmlSKMbyEdu: {
                        countSKM,
                        jmlSKMTdkSklh,
                        jmlSKMbySD,
                        jmlSKMbySMP,
                        jmlSKMbySMA,
                        jmlSKMbyD1,
                        jmlSKMbyD2,
                        jmlSKMbyD3,
                        jmlSKMbyS1,
                        jmlSKMbyS2,
                        jmlSKMbyS3
                    },
                    nilaiSKM_perlayanan,
                },
            });

        } catch (err) {
            console.error(err);
            res.status(500).json(response(500, 'internal server error', err));
        }
    },

}