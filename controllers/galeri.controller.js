const { response } = require('../helpers/response.formatter');
const { Galeri } = require('../models');
const Validator = require("fastest-validator");
const v = new Validator();
const { generatePagination } = require('../pagination/pagination');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const slugify = require('slugify');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    useAccelerateEndpoint: true
});

module.exports = {

    //membuat galeri
    createGaleri: async (req, res) => {
        try {
            const schema = {
                title: { type: "string", min: 3 },
                image: {
                    type: "string",
                    optional: true
                },
            }

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: `${process.env.PATH_AWS}/galeri/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                imageKey = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object Facilities
            let GaleriCreateObj = {
                title: req.body.title,
                slug: req.body.title ? slugify(req.body.title, { lower: true }) : undefined,
                image: req.file ? imageKey : undefined,
            }

            const validate = v.validate(GaleriCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //buat Galeri
            let GaleriCreate = await Galeri.create(GaleriCreateObj);

            res.status(201).json(response(201, 'success create Galeri', GaleriCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua data Galeri
    getGaleri: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let GaleriGets;
            let totalCount;

            [GaleriGets, totalCount] = await Promise.all([
                Galeri.findAll({
                    limit: limit,
                    offset: offset
                }),
                Galeri.count()
            ]);

            const pagination = generatePagination(totalCount, page, limit, '/api/user/galeri/get');

            res.status(200).json({
                status: 200,
                message: 'success get galeri',
                data: GaleriGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan data Facilities berdasarkan slug
    getGaleriBySlug: async (req, res) => {
        try {
            //mendapatkan data Facilities berdasarkan slug
            let GaleriGet = await Galeri.findOne({
                where: {
                    slug: req.params.slug
                },
            });

            //cek jika Galeri tidak ada
            if (!GaleriGet) {
                res.status(404).json(response(404, 'Galeri not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get Galeri by slug', GaleriGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate galeri berdasarkan slug
    updateGaleri: async (req, res) => {
        try {
            //mendapatkan data galeri untuk pengecekan
            let GaleriGet = await Galeri.findOne({
                where: {
                    slug: req.params.slug
                }
            })

            //cek apakah data Galeri ada
            if (!GaleriGet) {
                res.status(404).json(response(404, 'Galeri not found'));
                return;
            }

            //membuat schema untuk validasi
            const schema = {
                title: { type: "string", min: 3, optional: true },
                image: {
                    type: "string",
                    optional: true
                },
            }

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: `${process.env.PATH_AWS}/galeri/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
                
                imageKey = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object Galeri
            let GaleriUpdateObj = {
                title: req.body.title,
                slug: req.body.title ? slugify(req.body.title, { lower: true }) : undefined,
                image: req.file ? imageKey : GaleriGet.image,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(GaleriUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //update Galeri
            await Galeri.update(GaleriUpdateObj, {
                where: {
                    slug: req.params.slug,
                }
            })

            //mendapatkan data Galeri setelah update
            let GaleriAfterUpdate = await Galeri.findOne({
                where: {
                    slug: req.params.slug,
                }
            })

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update galeri', GaleriAfterUpdate));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //menghapus Galeri berdasarkan slug
    deleteGaleri: async (req, res) => {
        try {

            //mendapatkan data Galeri untuk pengecekan
            let GaleriGet = await Galeri.findOne({
                where: {
                    slug: req.params.slug
                }
            })

            //cek apakah data Galeri ada
            if (!GaleriGet) {
                res.status(404).json(response(404, 'Galeri not found'));
                return;
            }

            await Galeri.destroy({
                where: {
                    slug: req.params.slug,
                }
            })

            res.status(200).json(response(200, 'success delete galeri'));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    }
}