const { response } = require('../helpers/response.formatter');

const { Beritas } = require('../models');
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

    //membuat berita
    createBerita: async (req, res) => {
        try {

            //membuat schema untuk validasi
            const schema = {
                title: { type: "string", min: 3 },
                desc: { type: "string", min: 3, optional: true },
                image: { type: "string", optional: true },
            }

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/berita/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                imageKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object berita
            let beritaCreateObj = {
                title: req.body.title,
                slug: req.body.title ? slugify(req.body.title, { lower: true }) : null,
                desc: req.body.desc,
                image: req.file ? imageKey : null,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(beritaCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //mendapatkan data data untuk pengecekan
            let dataGets = await Beritas.findOne({
                where: {
                    slug: beritaCreateObj.slug
                }
            });

            //cek apakah slug sudah terdaftar
            if (dataGets) {
                res.status(409).json(response(409, 'slug already registered'));
                return;
            }

            //buat berita
            let beritaCreate = await Beritas.create(beritaCreateObj);

            //response menggunakan helper response.formatter
            res.status(201).json(response(201, 'success create berita', beritaCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua data berita
    getBerita: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            let { start_date, end_date, search } = req.query;
            const limit = parseInt(req.query.limit) || 10;
            const showDeleted = req.query.showDeleted ?? null;
            const offset = (page - 1) * limit;
            let BeritaGets;
            let totalCount;

            const whereCondition = {};

            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            if (search) {
                whereCondition[Op.or] = [{ title: { [Op.iLike]: `%${search}%` } }];
            }

            if (start_date && end_date) {
                whereCondition.createdAt = { [Op.between]: [moment(start_date).startOf('day').toDate(), moment(end_date).endOf('day').toDate()] };
            } else if (start_date) {
                whereCondition.createdAt = { [Op.gte]: moment(start_date).startOf('day').toDate() };
            } else if (end_date) {
                whereCondition.createdAt = { [Op.lte]: moment(end_date).endOf('day').toDate() };
            }

            [BeritaGets, totalCount] = await Promise.all([
                Beritas.findAll({
                    where: whereCondition,
                    limit: limit,
                    offset: offset
                }),
                Beritas.count({
                    where: whereCondition
                })
            ]);

            const pagination = generatePagination(totalCount, page, limit, '/api/user/berita/get');

            res.status(200).json({
                status: 200,
                message: 'success get berita',
                data: BeritaGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan data berita berdasarkan slug
    getBeritaBySlug: async (req, res) => {
        try {
            const showDeleted = req.query.showDeleted ?? null;
            const whereCondition = { slug: req.params.slug };
            
            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            //mendapatkan data berita berdasarkan slug
            let beritaGet = await Beritas.findOne({
                where: whereCondition,
            });

            //cek jika berita tidak ada
            if (!beritaGet) {
                res.status(404).json(response(404, 'berita not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get berita by slug', beritaGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate berita berdasarkan slug
    updateBerita: async (req, res) => {
        try {
            //mendapatkan data berita untuk pengecekan
            let beritaGet = await Beritas.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                }
            });
    
            //cek apakah data berita ada
            if (!beritaGet) {
                res.status(404).json(response(404, 'berita not found'));
                return;
            }
    
            //membuat schema untuk validasi
            const schema = {
                title: { type: "string", min: 3, optional: true },
                desc: { type: "string", min: 3, optional: true },
                image: { type: "string", optional: true },
            };
    
            let imageKey;
            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;
    
                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/berita/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };
    
                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
    
                imageKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }
    
            //buat object berita
            let beritaUpdateObj = {
                title: req.body.title || beritaGet.title,
                slug: req.body.title ? slugify(req.body.title, { lower: true }) : beritaGet.slug,
                desc: req.body.desc || beritaGet.desc,
                image: req.file ? imageKey : beritaGet.image,
            };
    
            //validasi menggunakan module fastest-validator
            const validate = v.validate(beritaUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }
    
            //update berita
            await Beritas.update(beritaUpdateObj, {
                where: {
                    slug: req.params.slug,
                }
            });
    
            //mendapatkan data berita setelah update
            let beritaAfterUpdate = await Beritas.findOne({
                where: {
                    slug: req.params.slug,
                }
            });
    
            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update berita', beritaAfterUpdate));
    
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },
    

    //menghapus berita berdasarkan slug
    deleteBerita: async (req, res) => {
        try {

            //mendapatkan data berita untuk pengecekan
            let beritaGet = await Beritas.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                }
            })

            //cek apakah data berita ada
            if (!beritaGet) {
                res.status(404).json(response(404, 'berita not found'));
                return;
            }

            await Beritas.update({ deletedAt: new Date() }, {
                where: {
                    slug: req.params.slug
                }
            });

            res.status(200).json(response(200, 'success delete berita'));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    }
}