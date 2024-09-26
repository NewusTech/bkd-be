const { response } = require('../helpers/response.formatter');

const { Pengaduan, Layanan, Bidang, User_info } = require('../models');
const Validator = require("fastest-validator");
const v = new Validator();
const { generatePagination } = require('../pagination/pagination');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const nodemailer = require('nodemailer');
const { format } = require('date-fns');
const { id } = require('date-fns/locale');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_NAME,
        pass: process.env.EMAIL_PW,
    }
});

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    useAccelerateEndpoint: true
});

module.exports = {
    createPengaduan: async (req, res) => {
        try {
            const schema = {
                judul_pengaduan: { type: "string", min: 3 },
                bidang_id: { type: "number" },
                layanan_id: { type: "number" },
                status: { type: "number" },
                isi_pengaduan: { type: "string", min: 3, optional: true },
                jawaban: { type: "string", optional: true },
                image: {
                    type: "string",
                    optional: true
                },
            }

            const userinfo_id = req.user.role === "User" ? req.user.userId : null;

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/pengaduan/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                imageKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object pengaduan
            let pengaduanCreateObj = {
                judul_pengaduan: req.body.judul_pengaduan,
                isi_pengaduan: req.body.isi_pengaduan,
                bidang_id: Number(req.body.bidang_id),
                layanan_id: Number(req.body.layanan_id),
                status: Number(req.body.status),
                jawaban: req.body.jawaban,
                userinfo_id: userinfo_id ?? null,
                image: req.file ? imageKey : undefined,
            }

            const validate = v.validate(pengaduanCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            let pengaduanCreate = await Pengaduan.create(pengaduanCreateObj)

            res.status(201).json(response(201, 'success create pengaduan', pengaduanCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //get semua data pengaduan
    getPengaduan: async (req, res) => {
        try {
            const userinfo_id = req.user.role === "User" ? req.user.userId : null;

            const bidang_id = req.query.bidang_id ?? null;
            const layanan_id = req.query.layanan_id ?? null;
            let { start_date, end_date, search, status } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let pengaduanGets;
            let totalCount;

            const whereCondition = {};

            if (bidang_id) {
                whereCondition.bidang_id = bidang_id;
            }

            if (layanan_id) {
                whereCondition.layanan_id = layanan_id;
            }

            if (req.user.role === 'Admin Instansi' || req.user.role === 'Admin Verifikasi' || req.user.role === 'Admin Layanan') {
                whereCondition.bidang_id = req.user.bidang_id;
            }

            if (req.user.role === 'Admin Layanan') {
                whereCondition.layanan_id = data.layanan_id;
            }

            if (search) {
                whereCondition[Op.or] = [
                    { isi: { [Op.iLike]: `%${search}%` } },
                    { judul_pengaduan: { [Op.iLike]: `%${search}%` } },
                    { '$Bidang.nama$': { [Op.iLike]: `%${search}%` } },
                    { '$Layanan.nama$': { [Op.iLike]: `%${search}%` } }
                ];
            }
            if (status) {
                whereCondition.status = status;
            }
            if (userinfo_id) {
                whereCondition.userinfo_id = userinfo_id;
            }
            if (start_date && end_date) {
                whereCondition.createdAt = {
                    [Op.between]: [moment(start_date).startOf('day').toDate(), moment(end_date).endOf('day').toDate()]
                };
            } else if (start_date) {
                whereCondition.createdAt = {
                    [Op.gte]: moment(start_date).startOf('day').toDate()
                };
            } else if (end_date) {
                whereCondition.createdAt = {
                    [Op.lte]: moment(end_date).endOf('day').toDate()
                };
            }

            [pengaduanGets, totalCount] = await Promise.all([
                Pengaduan.findAll({
                    where: whereCondition,
                    include: [
                        { model: Layanan, attributes: ['id', 'nama'] },
                        { model: Bidang, attributes: ['id', 'nama'] },
                        { model: User_info, attributes: ['id', 'name', 'nip'] },
                        // { model: User_info, as: 'Admin', attributes: ['id', 'name', 'nip'] },
                        // { model: User_info, as: 'Adminupdate', attributes: ['id', 'nama', 'nip'] }
                    ],
                    limit: limit,
                    offset: offset,
                    order: [['id', 'DESC']]
                }),
                Pengaduan.count({
                    where: whereCondition,
                    include: [
                        { model: Layanan },
                        { model: Bidang },
                        { model: User_info }
                    ],
                })
            ]);

            const pagination = generatePagination(totalCount, page, limit, '/api/user/pengaduan/get');

            res.status(200).json({
                status: 200,
                message: 'success get pengaduan',
                data: pengaduanGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //get data pengaduan berdasarkan id
    getPengaduanById: async (req, res) => {
        try {
            let pengaduanGet = await Pengaduan.findOne({
                where: {
                    id: req.params.id
                },
                include: [
                    { model: Layanan, attributes: ['id', 'nama'] },
                    { model: Bidang, attributes: ['id', 'nama'] },
                    { model: User_info, attributes: ['id', 'name', 'nip'] },
                    // { model: User_info, as: 'Admin', attributes: ['id', 'name', 'nip'] },
                    // { model: User_info, as: 'Adminupdate', attributes: ['id', 'name', 'nip'] }
                ],
            });
            if (!pengaduanGet) {
                res.status(404).json(response(404, 'pengaduan not found'));
                return;
            }

            res.status(200).json(response(200, 'success get pengaduan by id', pengaduanGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate pengaduan
    updatePengaduan: async (req, res) => {
        try {
            let pengaduanGet = await Pengaduan.findOne({
                where: {
                    id: req.params.id
                }, 
                include: [
                    {
                        model: User_info,
                        attributes: ['email', 'name'],
                    },
                    {
                        model: Layanan,
                        attributes: ['nama'],
                    },
                    {
                        model: Bidang,
                        attributes: ['nama'],
                    }
                ],
            })

            if (!pengaduanGet) {
                res.status(404).json(response(404, 'pengaduan not found'));
                return;
            }

            const schema = {
                status: { type: "number", optional: true },
                jawaban: { type: "string", optional: true }
            }

            //buat object pengaduan
            let pengaduanUpdateObj = {
                status: Number(req.body.status),
                jawaban: req.body.jawaban,
                // updated_by: data.userId
            }

            console.log(pengaduanUpdateObj)

            // const sendEmailNotification = (subject, text) => {
            //     const mailOptions = {
            //         to: pengaduanGet?.User_info?.email,
            //         from: process.env.EMAIL_NAME,
            //         subject,
            //         text
            //     };
            //     transporter.sendMail(mailOptions, (err) => {
            //         if (err) {
            //             console.error('There was an error: ', err);
            //             return res.status(500).json({ message: 'Error sending the email.' });
            //         }
            //         res.status(200).json({ message: 'An email has been sent with further instructions.' });
            //     });
            // };

            // if (pengaduanUpdateObj.status) {
            //     const formattedDate = format(new Date(pengaduanGet?.createdAt), "EEEE, dd MMMM yyyy (HH.mm 'WIB')", { locale: id });
            //     let subject, text;
            //     if (pengaduanUpdateObj.status) {
            //         subject = 'Pengaduan Direspon';
            //         text = `Yth. ${pengaduanGet?.User_info?.nama},\nKami ingin memberitahukan bahwa pengaduan anda telah direspon.\n\nDetail pengaduan anda adalah sebagai berikut:\n\t- Bidang = ${pengaduanGet?.Bidang?.nama}\n\t- Layanan = ${pengaduanGet?.Layanan?.nama}\n\t- Tanggal Pengaduan = ${formattedDate}\n\t- Judul pengaduan = ${pengaduanGet?.judul_pengaduan}\n\t- Detail pengaduan = ${pengaduanGet?.isi_pengaduan}\n\t- Respon / Jawaban = ${pengaduanUpdateObj?.jawaban}\n\n.Terima kasih atas kepercayaan Anda menggunakan layanan kami.\n\nSalam hormat Badan Kepegawaian Daerah Lampung Selatan`;
            //         pengaduanUpdateObj.tgl_selesai = Date.now();
            //     }

            //     if (pengaduanGet?.User_info?.email) {
            //         sendEmailNotification(subject, text);
            //     }
            // }
            const validate = v.validate(pengaduanUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            await Pengaduan.update(pengaduanUpdateObj, {
                where: {
                    id: req.params.id,
                }
            })

            let pengaduanAfterUpdate = await Pengaduan.findOne({
                where: {
                    id: req.params.id,
                }
            })

            res.status(200).json(response(200, 'success update pengaduan', pengaduanAfterUpdate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //menghapus pengaduan
    deletePengaduan: async (req, res) => {
        try {
            let pengaduanGet = await Pengaduan.findOne({
                where: {
                    id: req.params.id
                }
            })

            if (!pengaduanGet) {
                res.status(404).json(response(404, 'pengaduan not found'));
                return;
            }

            await Pengaduan.destroy({
                where: {
                    id: req.params.id,
                }
            })
            res.status(200).json(response(200, 'success delete pengaduan'));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    }
}