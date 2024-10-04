const { response } = require('../helpers/response.formatter');

const { Bkd_struktur } = require('../models');
const slugify = require('slugify');
const Validator = require("fastest-validator");
const v = new Validator();
const moment = require('moment-timezone');
const { generatePagination } = require('../pagination/pagination');
const { Op } = require('sequelize');
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

    //membuat struktur bkd
    createBkdStruktur: async (req, res) => {
        try {

            //membuat schema untuk validasi
            const schema = {
                nama: { type: "string", min: 3 },
                bidang_id: { type: "string", optional: true },
                nip: { type: "string", optional: true },
                jabatan: { type: "string", optional: true },
                golongan: { type: "string", optional: true },
                image: { type: "string", optional: true },
                status: { type: "string", optional: true },
            }

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/struktur_organisasi/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                imageKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object bkdstruktur
            let bkdstrukturCreateObj = {
                nama: req.body.nama,
                slug: req.body.nama ? slugify(req.body.nama, { lower: true }) : null,
                bidang_id: req.body.bidang_id,
                golongan: req.body.golongan,
                nip: req.body.nip,
                jabatan: req.body.jabatan,
                status: req.body.status,
                image: req.file ? imageKey : null,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(bkdstrukturCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //mendapatkan data data untuk pengecekan
            let dataGets = await Bkd_struktur.findOne({
                where: {
                    slug: bkdstrukturCreateObj.slug
                }
            });

            //cek apakah slug sudah terdaftar
            if (dataGets) {
                res.status(409).json(response(409, 'slug already registered'));
                return;
            }

            //buat bkdstruktur
            let bkdstrukturCreate = await Bkd_struktur.create(bkdstrukturCreateObj);

            //response menggunakan helper response.formatter
            res.status(201).json(response(201, 'success create bkd struktur', bkdstrukturCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua data bkd struktur
    getBkdStruktur: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            let { search } = req.query;
            const offset = (page - 1) * limit;
            let BkdstrukturGets;
            let totalCount;
    
            // Kondisi untuk hanya mengambil data yang belum dihapus (deletedAt = null)
            const whereCondition = {
                deletedAt: null
            };
    
            // Menambahkan kondisi search jika ada
            if (search) {
                whereCondition[Op.or] = [{ nama: { [Op.iLike]: `%${search}%` } }];
            }
    
            // Mengambil data struktur BKD dan menghitung total count
            [BkdstrukturGets, totalCount] = await Promise.all([
                Bkd_struktur.findAll({
                    where: whereCondition,
                    limit: limit,
                    offset: offset
                }),
                Bkd_struktur.count({
                    where: whereCondition
                })
            ]);
    
            // Membuat pagination
            const pagination = generatePagination(totalCount, page, limit, '/api/user/bkd/struktur/get');
    
            res.status(200).json({
                status: 200,
                message: 'success get struktur organisasi',
                data: BkdstrukturGets,
                pagination: pagination
            });
    
        } catch (err) {
            res.status(500).json({
                status: 500,
                message: 'internal server error',
                error: err.message
            });
            console.log(err);
        }
    },
    

    //mendapatkan data bkd struktur berdasarkan slug
    getBkdStrukturBySlug: async (req, res) => {
        try {
            const showDeleted = req.query.showDeleted ?? null;
            const whereCondition = { slug: req.params.slug };
            
            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            //mendapatkan data bkdstruktur berdasarkan slug
            let bkdstrukturGet = await Bkd_struktur.findOne({
                where: whereCondition,
            });

            //cek jika bkdstruktur tidak ada
            if (!bkdstrukturGet) {
                res.status(404).json(response(404, 'bkd struktur not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get bkd struktur by slug', bkdstrukturGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate bkd struktur berdasarkan slug
    updateBkdStruktur: async (req, res) => {
        try {
            // Mendapatkan data bkd struktur untuk pengecekan
            let bkdstrukturGet = await Bkd_struktur.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                }
            });
    
            // Cek apakah data bkdstruktur ada
            if (!bkdstrukturGet) {
                res.status(404).json(response(404, 'bkd struktur not found'));
                return;
            }
    
            // Membuat schema untuk validasi
            const schema = {
                nama: { type: "string", min: 3, optional: true },
                bidang_id: { type: "string", optional: true },
                nip: { type: "string", optional: true },
                jabatan: { type: "string", optional: true },
                golongan: { type: "string", optional: true },
                status: { type: "string", optional: true },
                image: { type: "string", optional: true },
            };
    
            // Jika ada file image, upload ke AWS S3
            let imageKey;
            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;
    
                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/struktur/organisasi/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };
    
                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
    
                imageKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }
    
            // Buat object bkdstruktur
            let bkdstrukturUpdateObj = {
                title: req.body.title || bkdstrukturGet.title,
                slug: req.body.title ? slugify(req.body.title, { lower: true }) : bkdstrukturGet.slug,
                jabatan: req.body.jabatan || bkdstrukturGet.jabatan,
                image: req.file ? imageKey : bkdstrukturGet.image,
            };
    
            // Validasi menggunakan module fastest-validator
            const validate = v.validate(bkdstrukturUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }
    
            // Update bkdstruktur
            await Bkd_struktur.update(bkdstrukturUpdateObj, {
                where: {
                    slug: req.params.slug,
                }
            });
    
            // Mendapatkan data bkdstruktur setelah update
            let bkdstrukturAfterUpdate = await Bkd_struktur.findOne({
                where: {
                    slug: req.params.slug,
                }
            });
    
            // Response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update bkd struktur', bkdstrukturAfterUpdate));
    
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },
    

    //menghapus bkd struktur berdasarkan slug
    deleteBkdStruktur: async (req, res) => {
        try {

            //mendapatkan data bkdstruktur untuk pengecekan
            let bkdstrukturGet = await Bkd_struktur.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                }
            })

            //cek apakah data bkdstruktur ada
            if (!bkdstrukturGet) {
                res.status(404).json(response(404, 'bkd struktur not found'));
                return;
            }

            await Bkd_struktur.update({ deletedAt: new Date() }, {
                where: {
                    slug: req.params.slug
                }
            });

            res.status(200).json(response(200, 'success delete bkd struktur'));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    }
}