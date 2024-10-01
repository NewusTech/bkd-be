const { response } = require('../helpers/response.formatter');

const { Layanan_form_input, Layanan_form_num, Layanan_form, Layanan, Bidang, User_info, Surveyformnum, Desa, Kecamatan, sequelize } = require('../models');
require('dotenv').config()

const Validator = require("fastest-validator");
const v = new Validator();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { generatePagination } = require('../pagination/pagination');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const nodemailer = require('nodemailer');
const { format } = require('date-fns');
const { id } = require('date-fns/locale');

// const Redis = require("ioredis");
// const redisClient = new Redis({
//     host: process.env.REDIS_HOST,
//     port: process.env.REDIS_PORT,
//     password: process.env.REDIS_PASSWORD,
// });

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_NAME,
        pass: process.env.EMAIL_PW,
    }
});

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    useAccelerateEndpoint: true
});

module.exports = {

    //input form user
    inputForm: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const folderPaths = {
                fileinput: "dir_mpp/file_pemohon",
            };

            const idlayanan = req.params.idlayanan;
            const iduser = req.user.role === "User" ? req.user.userId : req.body.userId;
            // const isonline = req.body.isonline ?? 'true';
            const statusinput = req.user.role === "User" ? 0 : 1;

            if (!iduser) {
                throw new Error('User ID is required');
            }

            const { datainput } = req.body;
            let { datafile } = req.body;

            let dataLayanan = await Layanan.findOne({
                where: {
                    id: idlayanan
                },
                attributes: ['id', 'code'],
            });

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // Format YYYY-MM-DD

            const countToday = await Layanan_form_num.count({
                where: {
                    createdAt: {
                        [Op.gte]: new Date(todayStr + 'T00:00:00Z'),
                        [Op.lte]: new Date(todayStr + 'T23:59:59Z')
                    },
                    layanan_id: idlayanan
                }
            });

            const urut = String(countToday + 1).padStart(4, '0'); // Menambah 1 pada count dan pad dengan '0' hingga 4 digit
            const tanggalFormat = today.toISOString().slice(2, 10).replace(/-/g, ''); // Format YYMMDD
            const noRequest = `${dataLayanan.code}-${tanggalFormat}-${urut}`;

            let layananID = {
                userinfo_id: Number(iduser),
                no_request: noRequest,
                layanan_id: Number(idlayanan),
                isonline: isonline,
                status: Number(statusinput)
            };

            const createdLayananformnum = await Layanan_form_num.create(layananID, { transaction });

            const updatedDatainput = datainput.map(item => ({
                ...item,
                layananformnum_id: createdLayananformnum.id
            }));

            const files = req.files;
            let redisUploadPromises = files.map(async (file) => {
                const { fieldname, mimetype, buffer, originalname } = file;

                const now = new Date();
                const timestamp = now.toISOString().replace(/[-:.]/g, '');
                const uniqueFilename = `${originalname.split('.')[0]}_${timestamp}`;

                const redisKey = `upload:${iduser}:${fieldname}`;
                await redisClient.set(redisKey, JSON.stringify({
                    buffer,
                    mimetype,
                    originalname,
                    uniqueFilename,
                    folderPath: folderPaths.fileinput
                }), 'EX', 60 * 60); // Expire in 1 hour

                const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${folderPaths.fileinput}/${uniqueFilename}`;

                // Extract index from fieldname (e.g., 'datafile[0][data]' -> 0)
                const index = parseInt(fieldname.match(/\d+/)[0], 10);
                datafile[index].data = fileUrl;
            });

            await Promise.all(redisUploadPromises);

            // Update datafile with layananformnum_id
            if (datafile) {
                datafile = datafile.map(item => ({
                    ...item,
                    layananformnum_id: createdLayananformnum.id
                }));
            }

            const createdLayananforminput = await Layanan_form_input.bulkCreate(updatedDatainput, { transaction });
            let createdLayananformfile;
            if (datafile) {
                createdLayananformfile = await Layanan_form_input.bulkCreate(datafile, { transaction });
            }

            await transaction.commit();

            // Mulai proses background untuk mengunggah ke S3
            setTimeout(async () => {
                for (const file of files) {
                    const { fieldname } = file;
                    const redisKey = `upload:${iduser}:${fieldname}`;
                    const fileData = await redisClient.get(redisKey);

                    if (fileData) {
                        const { buffer, mimetype, originalname, uniqueFilename, folderPath } = JSON.parse(fileData);
                        const uploadParams = {
                            Bucket: process.env.AWS_S3_BUCKET,
                            Key: `${folderPath}/${uniqueFilename}`,
                            Body: Buffer.from(buffer),
                            ACL: 'public-read',
                            ContentType: mimetype
                        };
                        const command = new PutObjectCommand(uploadParams);
                        await s3Client.send(command);
                        await redisClient.del(redisKey); // Hapus dari Redis setelah berhasil diunggah
                    }
                }
            }, 0); // Jalankan segera dalam background

            res.status(201).json(response(201, 'Success create layananforminput', { input: createdLayananforminput, file: createdLayananformfile }));
        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.error(err);
        }
    },

    //get input form user
    getDetailInputForm: async (req, res) => {
        try {
            const idlayanannum = req.params.idlayanannum;

            // Fetch Layananformnum details
            let layananformnumData = await Layanan_form_num.findOne({
                where: {
                    id: idlayanannum
                },
                include: [
                    {
                        model: Layanan_form_input,
                        include: [{
                            model: Layanan_form,
                            attributes: { exclude: ['createdAt', 'updatedAt', "status"] },
                        }]
                    },
                    {
                        model: User_info,
                        include: [
                            {
                                model: Desa,
                                attributes: { exclude: ['createdAt', 'updatedAt'] },
                            },
                            {
                                model: Kecamatan,
                                attributes: { exclude: ['createdAt', 'updatedAt'] },
                            }
                        ]
                    },
                    { model: User_info, as: 'Adminupdate', attributes: ['id', 'name', 'nik'] },
                    {
                        model: Layanan,
                        attributes: ['id', 'nama', 'desc'],
                        include: [{
                            model: Bidang,
                            attributes: ['id', 'nama', 'desc'],
                        }]
                    }
                ]
            });

            if (!layananformnumData) {
                res.status(404).json(response(404, 'data not found'));
                return;
            }

            // Format the Layananforminput data
            let formattedInputData = layananformnumData?.Layananforminputs?.map(datafilter => {
                let data_key = null;

                if (datafilter?.Layananform?.tipedata === 'radio' && datafilter?.Layananform?.datajson) {
                    const selectedOption = datafilter?.Layananform?.datajson.find(option => option?.id == datafilter?.data);
                    if (selectedOption) {
                        data_key = selectedOption?.key;
                    }
                }

                if (datafilter?.Layananform?.tipedata === 'checkbox' && datafilter?.Layananform?.datajson) {
                    const selectedOptions = JSON.parse(datafilter?.data);
                    data_key = selectedOptions.map(selectedId => {
                        const option = datafilter?.Layananform?.datajson.find(option => option?.id == selectedId);
                        return option ? option.key : null;
                    }).filter(key => key !== null);
                }

                return {
                    id: datafilter?.id,
                    data: datafilter?.data,
                    layananform_id: datafilter?.layananform_id,
                    layananformnum_id: datafilter?.layananformnum_id,
                    layananform_name: datafilter?.Layananform?.field,
                    layananform_datajson: datafilter?.Layananform?.datajson,
                    layananform_tipedata: datafilter?.Layananform?.tipedata,
                    data_key: data_key ?? null
                };
            });

            // Embed the formatted Layananforminput data into the Layananformnum data
            let result = {
                id: layananformnumData?.id,
                no_request: layananformnumData?.no_request,
                layanan_id: layananformnumData?.layanan_id,
                layanan: layananformnumData?.Layanan,
                tgl_selesai: layananformnumData?.tgl_selesai,
                userinfo_id: layananformnumData?.userinfo_id,
                userinfo: layananformnumData?.Userinfo,
                admin_updated: layananformnumData?.Adminupdate,
                createdAt: layananformnumData?.createdAt,
                updatedAt: layananformnumData?.updatedAt,
                Layananforminputs: formattedInputData ?? null,
                status: layananformnumData?.status,
                fileoutput: layananformnumData?.fileoutput,
                filesertif: layananformnumData?.filesertif
            };

            res.status(200).json(response(200, 'success get data', result));
        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    updateData: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { datainput, status } = req.body;
            const idlayanannum = req.params.idlayanannum;

            // Update data entries
            let updateDataPromises = [];
            if (datainput && Array.isArray(datainput)) {
                updateDataPromises = datainput.map(item =>
                    Layanan_form_input.update(
                        { data: item.data, layananform_id: item.layananform_id },
                        { where: { id: item.id, layananformnum_id: idlayanannum }, transaction }
                    ).catch(err => {
                        console.error('Error updating data:', err);
                        return null;
                    })
                );
            }

            const files = req.files;
            const folderPath = { fileinput: "dir_mpp/file_pemohon" };

            let redisUploadPromises = files.map(async (file) => {
                const { fieldname, mimetype, buffer, originalname } = file;
                const base64 = Buffer.from(buffer).toString('base64');
                const dataURI = `data:${mimetype};base64,${base64}`;

                const now = new Date();
                const timestamp = now.toISOString().replace(/[-:.]/g, '');
                const uniqueFilename = `${originalname.split('.')[0]}_${timestamp}`;

                const redisKey = `upload:${idlayanannum}:${fieldname}`;
                await redisClient.set(redisKey, JSON.stringify({
                    buffer,
                    mimetype,
                    originalname,
                    uniqueFilename,
                    folderPath: folderPath.fileinput
                }), 'EX', 60 * 60); // Expire in 1 hour

                const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${folderPath.fileinput}/${uniqueFilename}`;

                // Extract index from fieldname (e.g., 'datafile[0][data]' -> 0)
                const index = parseInt(fieldname.match(/\d+/)[0], 10);

                // Assuming datafile[index].id is available in req.body to identify the correct record
                await Layananforminput.update(
                    { data: fileUrl },
                    { where: { id: req.body.datafile[index].id, layananformnum_id: idlayanannum }, transaction }
                );
            });

            Layanan_form_num.update(
                { status: status },
                { where: { id: idlayanannum }, transaction }
            );

            await Promise.all([...updateDataPromises, ...redisUploadPromises]);

            await transaction.commit();

            // Mulai proses background untuk mengunggah ke S3
            setTimeout(async () => {
                for (const file of files) {
                    const { fieldname } = file;
                    const redisKey = `upload:${idlayanannum}:${fieldname}`;
                    const fileData = await redisClient.get(redisKey);

                    if (fileData) {
                        const { buffer, mimetype, originalname, uniqueFilename, folderPath } = JSON.parse(fileData);
                        const uploadParams = {
                            Bucket: process.env.AWS_S3_BUCKET,
                            Key: `${folderPath}/${uniqueFilename}`,
                            Body: Buffer.from(buffer),
                            ACL: 'public-read',
                            ContentType: mimetype
                        };
                        const command = new PutObjectCommand(uploadParams);
                        await s3Client.send(command);
                        await redisClient.del(redisKey); // Hapus dari Redis setelah berhasil diunggah
                    }
                }
            }, 0); // Jalankan segera dalam background

            res.status(200).json(response(200, 'Success update layananforminput'));
        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    updateStatusPengajuan: async (req, res) => {
        try {

            //mendapatkan data layanan untuk pengecekan
            let layananGet = await Layanan_form_num.findOne({
                where: {
                    id: req.params.idlayanannum
                },
                include: [
                    {
                        model: User_info,
                        attributes: ['id' ,'email', 'name'],
                    },
                    {
                        model: Layanan,
                        attributes: ['nama'],
                        include: [
                            {
                                model: Bidang,
                                attributes: ['email', 'nama', 'telp'],
                            },
                        ]
                    }
                ],
            })

            //cek apakah data layanan ada
            if (!layananGet) {
                res.status(404).json(response(404, 'layanan not found'));
                return;
            }

            //membuat schema untuk validasi
            const schema = {
                status: {
                    type: "number"
                },
                pesan: {
                    type: "string",
                    optional: true
                }
            }

            //buat object layanan
            let layananUpdateObj = {
                status: Number(req.body.status),
                pesan: req.body.pesan,
                updated_by: data.userId
            }

            const sendEmailNotification = (subject, text) => {
                const mailOptions = {
                    to: layananGet?.Userinfo?.email,
                    from: process.env.EMAIL_NAME,
                    subject,
                    text
                };
                transporter.sendMail(mailOptions, (err) => {
                    if (err) {
                        console.error('There was an error: ', err);
                        return res.status(500).json({ message: 'Error sending the email.' });
                    }
                    res.status(200).json({ message: 'An email has been sent with further instructions.' });
                });
            };

            if (layananUpdateObj.status === 3 || layananUpdateObj.status === 4 || layananUpdateObj.status === 5) {
                const formattedDate = format(new Date(layananGet?.createdAt), "EEEE, dd MMMM yyyy (HH.mm 'WIB')", { locale: id });
                let subject, text;
                if (layananUpdateObj.status === 3) {
                    subject = 'Notifikasi Permohonan Selesai';
                    text = `Yth. ${layananGet?.Userinfo?.name},\nKami ingin memberitahukan bahwa permohonan Anda dengan nomor permohonan ${layananGet?.no_request} telah selesai diproses.\n\nDetail permohonan Anda adalah sebagai berikut:\n\t- Dinas = ${layananGet?.Layanan?.Instansi?.name}\n\t- Permohonan = ${layananGet?.Layanan?.name}\n\t- Tanggal Permohonan = ${formattedDate}\n\t- Status = Selesai\n\nSilakan mengunjungi Mal Pelayanan Publik atau mengakses portal kami untuk mengambil hasil permohonan Anda. Jika Anda membutuhkan informasi lebih lanjut, jangan ragu untuk menghubungi kami melalui kontak dibawah ini.\n\t- Email = ${layananGet?.Layanan?.Instansi?.email}\n\t- Nomor = ${layananGet?.Layanan?.Instansi?.telp}\n\nTerima kasih atas kepercayaan Anda menggunakan layanan kami.\n\nSalam hormat,\n${layananGet?.Layanan?.Instansi?.name}`;
                    layananUpdateObj.tgl_selesai = Date.now();
                } else if (layananUpdateObj.status === 4) {
                    subject = 'Notifikasi Permohonan Ditolak';
                    text = `Yth. ${layananGet?.Userinfo?.name},\nKami ingin memberitahukan bahwa permohonan Anda dengan nomor permohonan ${layananGet?.no_request} telah ditolak.\n\nDetail permohonan Anda adalah sebagai berikut:\n\t- Dinas = ${layananGet?.Layanan?.Instansi?.name}\n\t- Permohonan = ${layananGet?.Layanan?.name}\n\t- Tanggal Permohonan = ${formattedDate}\n\t- Status = Ditolak\n\t- Alasan Penolakan: ${layananUpdateObj.pesan || 'Tidak ada alasan yang diberikan.'}\n\nSilakan mengunjungi Mal Pelayanan Publik atau mengakses portal kami untuk mendapatkan informasi lebih lanjut mengenai penolakan ini. Jika Anda membutuhkan informasi lebih lanjut, jangan ragu untuk menghubungi kami melalui kontak dibawah ini.\n\t- Email = ${layananGet?.Layanan?.Instansi?.email}\n\t- Nomor = ${layananGet?.Layanan?.Instansi?.telp}.\n\nKami mohon maaf atas ketidaknyamanan yang terjadi dan berharap dapat melayani Anda lebih baik di masa mendatang.\n\nTerima kasih atas pengertian Anda.\n\nSalam hormat,\n${layananGet?.Layanan?.Instansi?.name}`;
                } else if (layananUpdateObj.status === 5) {
                    subject = 'Notifikasi Permohonan Perlu Revisi';
                    text = `Yth. ${layananGet?.Userinfo?.name},\nKami ingin memberitahukan bahwa permohonan Anda dengan nomor permohonan ${layananGet?.no_request} memerlukan revisi/perbaikan data.\n\nDetail permohonan Anda adalah sebagai berikut:\n\t- Dinas = ${layananGet?.Layanan?.Instansi?.name}\n\t- Permohonan = ${layananGet?.Layanan?.name}\n\t- Tanggal Permohonan = ${formattedDate}\n\t- Status = Perlu Revisi\n\t- Alasan Revisi: ${layananUpdateObj.pesan || 'Tidak ada alasan yang diberikan.'}\n\nSilakan mengunjungi Mal Pelayanan Publik atau mengakses portal kami untuk memperbaiki data permohonan Anda. Jika Anda membutuhkan informasi lebih lanjut, jangan ragu untuk menghubungi kami melalui kontak dibawah ini.\n\t- Email = ${layananGet?.Layanan?.Instansi?.email}\n\t- Nomor = ${layananGet?.Layanan?.Instansi?.telp}.\n\nTerima kasih atas perhatian dan kerjasama Anda.\n\nSalam hormat,\n${layananGet?.Layanan?.Instansi?.name}`;
                }
                if (layananGet?.Userinfo?.email) {
                    sendEmailNotification(subject, text);
                }
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(layananUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //update layanan
            await Layanan_form_num.update(layananUpdateObj, {
                where: {
                    id: req.params.idlayanannum,
                }
            })

            let pesansocket;
            
            if(req.body.status == 1 || req.body.status == 2) {
                pesansocket = 'sedang diproses';
            } else if(req.body.status == 3) {
                pesansocket = 'selesai';
            } else if(req.body.status == 4) {
                pesansocket = 'ditolak';
            } else if(req.body.status == 5) {
                pesansocket = 'harus direvisi';
            } else if(req.body.status == 6) {
                pesansocket = 'sudah direvisi';
            }

            console.log("pesansocket", pesansocket)
            
            global.io.emit('UpdateStatus', { pesansocket, iduser : layananGet.Userinfo.id });

            const newNotification = {
                id: Date.now(), // ID unik menggunakan timestamp
                layananformnum_id: layananGet.id,
                userinfo: layananGet.userinfo_id,
                isopen: 0,
                title: `Permohonan ${pesansocket}`, // Judul notifikasi
                description: `Yth. ${layananGet?.Userinfo?.name}, permohonan Anda dengan nomor permohonan ${layananGet?.no_request} telah selesai diproses.`, // Deskripsi notifikasi
                url: `${process.env.WEBSITE_URL}/riwayat/${layananGet.id}`,
                date: new Date().toISOString().split('T')[0] // Tanggal saat notifikasi dibuat
            };
        
            await redisClient.set(`notification:${newNotification.id}`, JSON.stringify(newNotification));

            //mendapatkan data layanan setelah update
            let layananAfterUpdate = await Layanan_form_num.findOne({
                where: {
                    id: req.params.idlayanannum,
                }
            })

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update layanan', layananAfterUpdate));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //upload surat hasil permohonan
    uploadFileHasil: async (req, res) => {
        try {

            let dataGet = await Layanan_form_num.findOne({
                where: {
                    id: req.params.idlayanannum
                }
            })

            if (!dataGet) {
                res.status(404).json(response(404, 'data not found'));
                return;
            }

            //membuat schema untuk validasi
            const schema = {
                fileoutput: { type: "string", optional: true }
            }

            if (req.files && req.files.file) {
                const file = req.files.file[0];
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: `${process.env.PATH_AWS}/fileoutput/${uniqueFileName}`,
                    Body: file.buffer,
                    ACL: 'public-read',
                    ContentType: file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);

                dataKey = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            if (req.files && req.files.sertif) {
                const file = req.files.sertif[0];
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: `${process.env.PATH_AWS}/sertif/${uniqueFileName}`,
                    Body: file.buffer,
                    ACL: 'public-read',
                    ContentType: file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);

                dataKey2 = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object instansi
            let fileUpdateObj = {
                fileoutput: req.files.file ? dataKey : undefined,
                filesertif: req.files.sertif ? dataKey2 : undefined,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(fileUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //update instansi
            await Layanan_form_num.update(fileUpdateObj, {
                where: {
                    id: req.params.idlayanannum,
                }
            })

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update'));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //get history input form user
    gethistoryformuser: async (req, res) => {
        try {
            const search = req.query.search ?? null;
            const status = req.query.status ?? null;
            const range = req.query.range;
            const isonline = req.query.isonline ?? null;
            const userinfo_id = data.role === "User" ? data.userId : null;
            const instansi_id = Number(req.query.instansi_id);
            const layanan_id = Number(req.query.layanan_id);
            const start_date = req.query.start_date;
            let end_date = req.query.end_date;
            const year = req.query.year ? parseInt(req.query.year) : null;
            const month = req.query.month ? parseInt(req.query.month) : null;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let history;
            let totalCount;

            const WhereClause = {};
            const WhereClause2 = {};
            const WhereClause3 = {};

            if (data.role === 'Admin Instansi' || data.role === 'Admin Verifikasi' || data.role === 'Admin Layanan') {
                WhereClause2.instansi_id = data.instansi_id;
            }

            if (data.role === 'Admin Layanan') {
                WhereClause.layanan_id = data.layanan_id;
            }

            if (range == 'today') {
                WhereClause.createdAt = {
                    [Op.between]: [moment().startOf('day').toDate(), moment().endOf('day').toDate()]
                };
            }

            if (isonline) {
                WhereClause.isonline = isonline;
            }
            if (userinfo_id) {
                WhereClause.userinfo_id = userinfo_id;
            }
            if (status) {
                WhereClause.status = status;
            }
            if (layanan_id) {
                WhereClause.layanan_id = layanan_id;
            }

            if (start_date && end_date) {
                end_date = new Date(end_date);
                end_date.setHours(23, 59, 59, 999);
                WhereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            } else if (start_date) {
                WhereClause.createdAt = {
                    [Op.gte]: new Date(start_date)
                };
            } else if (end_date) {
                end_date = new Date(end_date);
                end_date.setHours(23, 59, 59, 999);
                WhereClause.createdAt = {
                    [Op.lte]: new Date(end_date)
                };
            }

            if (instansi_id) {
                WhereClause2.instansi_id = instansi_id;
            }

            if (search) {
                WhereClause3[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { '$Layanan.name$': { [Op.iLike]: `%${search}%` } },
                    { '$Layanan->Instansi.name$': { [Op.iLike]: `%${search}%` } }
                ];
            }

            if (year && month) {
                WhereClause.createdAt = {
                    [Op.between]: [
                        new Date(year, month - 1, 1),
                        new Date(year, month, 0, 23, 59, 59, 999)
                    ]
                };
            } else if (year) {
                WhereClause.createdAt = {
                    [Op.between]: [
                        new Date(year, 0, 1),
                        new Date(year, 11, 31, 23, 59, 59, 999)
                    ]
                };
            } else if (month) {
                const currentYear = new Date().getFullYear();
                WhereClause.createdAt = {
                    [Op.and]: [
                        { [Op.gte]: new Date(currentYear, month - 1, 1) },
                        { [Op.lte]: new Date(currentYear, month, 0, 23, 59, 59, 999) }
                    ]
                };
            }

            [history, totalCount] = await Promise.all([
                Layananformnum.findAll({
                    where: WhereClause,
                    include: [
                        {
                            model: Layanan,
                            attributes: { exclude: ['createdAt', 'updatedAt', "status", 'slug'] },
                            include: [{
                                model: Instansi,
                                attributes: { exclude: ['createdAt', 'updatedAt', "status", 'slug'] },
                            }],
                            where: WhereClause2,
                        },
                        {
                            model: Userinfo,
                            attributes: ['name', 'nik'],
                            where: WhereClause3,
                        },
                        { model: Userinfo, as: 'Adminupdate', attributes: ['id', 'name', 'nik'] },
                    ],
                    limit: limit,
                    offset: offset,
                    order: [['id', 'DESC']]
                }),
                Layananformnum.count({
                    where: WhereClause,
                    include: [
                        {
                            model: Layanan,
                            include: [{
                                model: Instansi
                            }],
                            where: WhereClause2,
                        },
                        {
                            model: Userinfo,
                            where: WhereClause3,
                        },
                        { model: Userinfo, as: 'Adminupdate', attributes: ['id', 'name', 'nik'] },
                    ],
                })
            ]);

            let formattedData = history.map(data => {
                return {
                    id: data.id,
                    userinfo_id: data?.userinfo_id,
                    name: data?.Userinfo?.name,
                    nik: data?.Userinfo?.nik,
                    pesan: data?.pesan,
                    admin_updated: data?.Adminupdate,
                    status: data?.status,
                    tgl_selesai: data?.tgl_selesai,
                    isonline: data?.isonline,
                    layanan_id: data?.layanan_id,
                    layanan_name: data?.Layanan ? data?.Layanan?.name : null,
                    layanan_image: data?.Layanan ? data?.Layanan?.image : null,
                    instansi_id: data?.Layanan && data?.Layanan?.Instansi ? data?.Layanan?.Instansi.id : null,
                    instansi_name: data?.Layanan && data?.Layanan?.Instansi ? data?.Layanan?.Instansi.name : null,
                    instansi_image: data?.Layanan && data?.Layanan?.Instansi ? data?.Layanan?.Instansi.image : null,
                    createdAt: data?.createdAt,
                    updatedAt: data?.updatedAt,
                    fileoutput: data?.fileoutput,
                    filesertif: data?.filesertif,
                    no_request: data?.no_request,
                };
            });

            const pagination = generatePagination(totalCount, page, limit, `/api/user/historyform`);

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

    gethistorydokumen: async (req, res) => {
        try {
            const search = req.query.search ?? null;
            const status = req.query.status ?? null;
            const range = req.query.range;
            const isonline = req.query.isonline ?? null;
            let userinfo_id;
            if (data.role === "User") {
                userinfo_id = data.userId
            } else {
                userinfo_id = req.query.userId
            }

            const instansi_id = Number(req.query.instansi_id);
            const layanan_id = Number(req.query.layanan_id);
            const start_date = req.query.start_date;
            let end_date = req.query.end_date;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let history;
            let totalCount;

            const WhereClause = {};
            const WhereClause2 = {};
            const WhereClause3 = {};

            if (data.role === 'Admin Instansi' || data.role === 'Admin Verifikasi' || data.role === 'Admin Layanan') {
                WhereClause2.instansi_id = data.instansi_id;
            }

            if (data.role === 'Admin Layanan') {
                WhereClause.layanan_id = data.layanan_id;
            }

            WhereClause.status = 3;

            if (range == 'today') {
                WhereClause.createdAt = {
                    [Op.between]: [moment().startOf('day').toDate(), moment().endOf('day').toDate()]
                };
            }

            if (isonline) {
                WhereClause.isonline = isonline;
            }
            if (userinfo_id) {
                WhereClause.userinfo_id = userinfo_id;
            }
            if (status) {
                WhereClause.status = status;
            }
            if (layanan_id) {
                WhereClause.layanan_id = layanan_id;
            }

            if (start_date && end_date) {
                end_date = new Date(end_date);
                end_date.setHours(23, 59, 59, 999);
                WhereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            } else if (start_date) {
                WhereClause.createdAt = {
                    [Op.gte]: new Date(start_date)
                };
            } else if (end_date) {
                end_date = new Date(end_date);
                end_date.setHours(23, 59, 59, 999);
                WhereClause.createdAt = {
                    [Op.lte]: new Date(end_date)
                };
            }

            if (instansi_id) {
                WhereClause2.instansi_id = instansi_id;
            }

            if (search) {
                WhereClause3.name = {
                    [Op.iLike]: `%${search}%`
                };
            }

            [history, totalCount] = await Promise.all([
                Layananformnum.findAll({
                    where: WhereClause,
                    include: [
                        {
                            model: Layanan,
                            attributes: ['name', 'image', "id"],
                            include: [{
                                model: Instansi,
                                attributes: ['name', 'image', "id"],
                            }],
                            where: WhereClause2,
                        },
                        {
                            model: Userinfo,
                            attributes: ['name', 'nik'],
                            where: WhereClause3,
                        }
                    ],
                    limit: limit,
                    offset: offset,
                    order: [['id', 'DESC']]
                }),
                Layananformnum.count({
                    where: WhereClause,
                    include: [
                        {
                            model: Layanan,
                            where: WhereClause2,
                        },
                        {
                            model: Userinfo,
                            where: WhereClause3,
                        }
                    ],
                })
            ]);

            // Restructure the data to show Instansi first
            let instansiMap = {};

            history.forEach(data => {
                const instansiId = data?.Layanan?.Instansi?.id;
                const instansiName = data?.Layanan?.Instansi?.name;
                const instansiImage = data?.Layanan?.Instansi?.image;

                if (!instansiMap[instansiId]) {
                    instansiMap[instansiId] = {
                        instansi_id: instansiId,
                        instansi_name: instansiName,
                        instansi_image: instansiImage,
                        dokumen: []
                    };
                }

                instansiMap[instansiId].dokumen.push({
                    id: data.id,
                    userinfo_id: data?.userinfo_id,
                    tgl_selesai: data?.tgl_selesai,
                    layanan_name: data?.Layanan ? data?.Layanan?.name : null,
                    createdAt: data?.createdAt,
                    updatedAt: data?.updatedAt,
                    fileoutput: data?.fileoutput,
                    filesertif: data?.filesertif,
                    no_request: data?.no_request,
                });
            });

            const formattedData = Object.values(instansiMap);

            const pagination = generatePagination(totalCount, page, limit, `/api/user/historyform`);

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

    gethistorybyid: async (req, res) => {
        try {

            let Layananformnumget = await Layananformnum.findOne({
                where: {
                    id: req.params.idforminput
                },
                include: [
                    {
                        model: Layanan,
                        attributes: { exclude: ['createdAt', 'updatedAt', "status", 'slug'] },
                        include: [{
                            model: Instansi,
                            attributes: { exclude: ['createdAt', 'updatedAt', "status", 'slug'] },
                        }],
                    },
                    {
                        model: Userinfo,
                        attributes: ['name'],
                    },
                    { model: Userinfo, as: 'Adminupdate', attributes: ['id', 'name', 'nik'] },
                ],
            });

            if (!Layananformnumget) {
                res.status(404).json(response(404, 'data not found'));
                return;
            }

            let surveyGet = await Surveyformnum.findOne({
                where: {
                    userinfo_id: Layananformnumget.userinfo_id,
                    layanan_id: Layananformnumget.layanan_id
                },
            });

            let formattedData = {
                id: Layananformnumget?.id,
                userinfo_id: Layananformnumget?.userinfo_id,
                name: Layananformnumget?.Userinfo ? Layananformnumget?.Userinfo?.name : null,
                status: Layananformnumget?.status,
                pesan: Layananformnumget?.pesan,
                admin_updated: Layananformnumget?.Adminupdate,
                tgl_selesai: data?.tgl_selesai,
                layanan_id: Layananformnumget?.layanan_id,
                layanan_name: Layananformnumget?.Layanan ? Layananformnumget?.Layanan?.name : null,
                layanan_image: Layananformnumget?.Layanan ? Layananformnumget?.Layanan?.image : null,
                instansi_id: Layananformnumget?.Layanan && Layananformnumget?.Layanan?.Instansi ? Layananformnumget?.Layanan?.Instansi.id : null,
                instansi_name: Layananformnumget?.Layanan && Layananformnumget?.Layanan?.Instansi ? Layananformnumget?.Layanan?.Instansi.name : null,
                instansi_image: Layananformnumget?.Layanan && Layananformnumget?.Layanan?.Instansi ? Layananformnumget?.Layanan?.Instansi.image : null,
                createdAt: Layananformnumget?.createdAt,
                updatedAt: Layananformnumget?.updatedAt,
                fileoutput: Layananformnumget?.fileoutput,
                filesertif: Layananformnumget?.filesertif,
                input_skm: surveyGet ? true : false,
                no_request: Layananformnumget?.no_request,
            };

            res.status(200).json(response(200, 'success get', formattedData));

        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    pdfhistoryformuser: async (req, res) => {
        try {
            const search = req.query.search ?? null;
            const status = req.query.status ?? null;
            const range = req.query.range;
            const isonline = req.query.isonline ?? null;
            const userinfo_id = data.role === "User" ? data.userId : null;
            let instansi_id = Number(req.query.instansi_id);
            let layanan_id = Number(req.query.layanan_id);
            const start_date = req.query.start_date;
            let end_date = req.query.end_date;
            const year = req.query.year ? parseInt(req.query.year) : null;
            const month = req.query.month ? parseInt(req.query.month) : null;

            let history;

            const WhereClause = {};
            const WhereClause2 = {};
            const WhereClause3 = {};

            if (data.role === 'Admin Instansi' || data.role === 'Admin Verifikasi' || data.role === 'Admin Layanan') {
                instansi_id = data.instansi_id;
            }

            if (data.role === 'Admin Layanan') {
                layanan_id = data.layanan_id;
            }

            if (range == 'today') {
                WhereClause.createdAt = {
                    [Op.between]: [moment().startOf('day').toDate(), moment().endOf('day').toDate()]
                };
            }

            if (isonline) {
                WhereClause.isonline = isonline;
            }
            if (userinfo_id) {
                WhereClause.userinfo_id = userinfo_id;
            }
            if (status) {
                WhereClause.status = status;
            }
            if (layanan_id) {
                WhereClause.layanan_id = layanan_id;
            }

            if (start_date && end_date) {
                end_date = new Date(end_date);
                end_date.setHours(23, 59, 59, 999);
                WhereClause.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            } else if (start_date) {
                WhereClause.createdAt = {
                    [Op.gte]: new Date(start_date)
                };
            } else if (end_date) {
                end_date = new Date(end_date);
                end_date.setHours(23, 59, 59, 999);
                WhereClause.createdAt = {
                    [Op.lte]: new Date(end_date)
                };
            }

            if (instansi_id) {
                WhereClause2.instansi_id = instansi_id;
            }

            if (search) {
                WhereClause3[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { '$Layanan.name$': { [Op.iLike]: `%${search}%` } },
                    { '$Layanan->Instansi.name$': { [Op.iLike]: `%${search}%` } }
                ];
            }

            if (year && month) {
                WhereClause.createdAt = {
                    [Op.between]: [
                        new Date(year, month - 1, 1),
                        new Date(year, month, 0, 23, 59, 59, 999)
                    ]
                };
            } else if (year) {
                WhereClause.createdAt = {
                    [Op.between]: [
                        new Date(year, 0, 1),
                        new Date(year, 11, 31, 23, 59, 59, 999)
                    ]
                };
            } else if (month) {
                // Hanya bulan ditentukan
                const currentYear = new Date().getFullYear();
                WhereClause.createdAt = {
                    [Op.and]: [
                        { [Op.gte]: new Date(currentYear, month - 1, 1) },
                        { [Op.lte]: new Date(currentYear, month, 0, 23, 59, 59, 999) }
                    ]
                };
            }

            history = await Promise.all([
                Layananformnum.findAll({
                    where: WhereClause,
                    include: [
                        {
                            model: Layanan,
                            attributes: { exclude: ['createdAt', 'updatedAt', "status", 'slug'] },
                            include: [{
                                model: Instansi,
                                attributes: { exclude: ['createdAt', 'updatedAt', "status", 'slug'] },
                            }],
                            where: WhereClause2,
                        },
                        {
                            model: Userinfo,
                            attributes: ['name', 'nik'],
                            where: WhereClause3,
                        }
                    ],
                    order: [['id', 'DESC']]
                })
            ]);

            let formattedData = history[0].map(data => {
                return {
                    id: data.id,
                    userinfo_id: data?.userinfo_id,
                    name: data?.Userinfo?.name,
                    nik: data?.Userinfo?.nik,
                    pesan: data?.pesan,
                    status: data?.status,
                    tgl_selesai: data?.tgl_selesai,
                    isonline: data?.isonline,
                    layanan_id: data?.layanan_id,
                    layanan_name: data?.Layanan ? data?.Layanan?.name : null,
                    layanan_image: data?.Layanan ? data?.Layanan?.image : null,
                    instansi_id: data?.Layanan && data?.Layanan?.Instansi ? data?.Layanan?.Instansi.id : null,
                    instansi_name: data?.Layanan && data?.Layanan?.Instansi ? data?.Layanan?.Instansi.name : null,
                    instansi_image: data?.Layanan && data?.Layanan?.Instansi ? data?.Layanan?.Instansi.image : null,
                    createdAt: data?.createdAt,
                    updatedAt: data?.updatedAt,
                    fileoutput: data?.fileoutput,
                    filesertif: data?.filesertif,
                    no_request: data?.no_request,
                };
            });

            // Generate HTML content for PDF
            const templatePath = path.resolve(__dirname, '../views/permohonanperlayanan.html');
            let htmlContent = fs.readFileSync(templatePath, 'utf8');
            let layananGet, instansiGet;

            if (layanan_id) {
                layananGet = await Layanan.findOne({
                    where: {
                        id: layanan_id
                    },
                });
            }

            if (instansi_id) {
                instansiGet = await Instansi.findOne({
                    where: {
                        id: instansi_id
                    },
                });
            }

            const instansiInfo = instansiGet?.name ? `<p>Instansi : ${instansiGet?.name}</p>` : '';
            const layananInfo = layananGet?.name ? `<p>Layanan : ${layananGet?.name}</p>` : '';
            let tanggalInfo = '';
            if (start_date || end_date) {
                const startDateFormatted = start_date ? new Date(start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
                const endDateFormatted = end_date ? new Date(end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
                tanggalInfo = `<p>Periode Tanggal : ${startDateFormatted} s.d. ${endDateFormatted ? endDateFormatted : 'Hari ini'} </p>`;
            }

            if (range === 'today') {
                tanggalInfo = `<p>Periode Tanggal : Hari ini </p>`;
            }

            const getStatusText = (status) => {
                switch (status) {
                    case 0:
                        return 'Belum Divalidasi';
                    case 1:
                        return 'Sudah Divalidasi';
                    case 2:
                        return 'Sudah Disetujui';
                    case 3:
                        return 'Proses Selesai';
                    case 4:
                        return 'Ditolak';
                    case 5:
                        return 'Perbaikan/Revisi';
                    case 6:
                        return 'Diperbaiki';
                    default:
                        return 'Status Tidak Diketahui';
                }
            };

            const reportTableRows = formattedData?.map(permohonan => {
                const createdAtDate = new Date(permohonan.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                const createdAtTime = new Date(permohonan.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const statusText = getStatusText(permohonan.status);

                return `
                    <tr>
                        <td class="center">${createdAtDate}</td>
                        <td class="center">${createdAtTime} WIB</td>
                        <td>${permohonan.nik}</td>
                        <td>${permohonan.name}</td>
                        <td class="center">${statusText}</td>
                    </tr>
                `;
            }).join('');

            htmlContent = htmlContent.replace('{{instansiInfo}}', instansiInfo);
            htmlContent = htmlContent.replace('{{layananInfo}}', layananInfo);
            htmlContent = htmlContent.replace('{{tanggalInfo}}', tanggalInfo);
            htmlContent = htmlContent.replace('{{reportTableRows}}', reportTableRows);

            // Launch Puppeteer
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // Set HTML content
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                landscape: true,
                margin: {
                    top: '1.16in',
                    right: '1.16in',
                    bottom: '1.16in',
                    left: '1.16in'
                }
            });

            await browser.close();

            // Generate filename
            const currentDate = new Date().toISOString().replace(/:/g, '-');
            const filename = `laporan-${currentDate}.pdf`;

            // Send PDF buffer
            res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
            res.setHeader('Content-type', 'application/pdf');
            res.send(pdfBuffer);

        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

}