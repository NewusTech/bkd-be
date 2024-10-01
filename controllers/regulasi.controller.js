const { response } = require('../helpers/response.formatter');
const { Regulasi } = require('../models');
const Validator = require("fastest-validator");
const v = new Validator();
const { generatePagination } = require('../pagination/pagination');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const logger = require('../errorHandler/logger');

const s3Client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    useAccelerateEndpoint: true
});

module.exports = {

    //membuat regulasi
    createRegulasi: async (req, res) => {
        try {
            const schema = {
                title: { type: "string", min: 3 },
                file: {
                    type: "string",
                    optional: true
                },
            }

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/regulasi/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                fileKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object Facilities
            let RegulasiCreateObj = {
                title: req.body.title,
                file: req.file ? fileKey : undefined,
            }

            const validate = v.validate(RegulasiCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //buat regulasi
            let RegulasiCreate = await Regulasi.create(RegulasiCreateObj);

            res.status(201).json(response(201, 'success create regulasi', RegulasiCreate));
        } catch (err) {
            logger.error(`Error : ${err}`);
            logger.error(`Error message: ${err.message}`);
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua data regulasi
    getRegulasi: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let RegulasiGets;
            let totalCount;

            [RegulasiGets, totalCount] = await Promise.all([
                Regulasi.findAll({
                    limit: limit,
                    offset: offset
                }),
                Regulasi.count()
            ]);

            const pagination = generatePagination(totalCount, page, limit, '/api/user/regulasi/get');

            res.status(200).json({
                status: 200,
                message: 'success get regulasi',
                data: RegulasiGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan data regulasi berdasarkan id
    getRegulasiByID: async (req, res) => {
        try {
            //mendapatkan data regulasi berdasarkan id
            let RegulasiGet = await Regulasi.findOne({
                where: {
                    id: req.params.id
                },
            });

            //cek jika Regulasi tidak ada
            if (!RegulasiGet) {
                res.status(404).json(response(404, 'Regulasi not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get regulasi by id', RegulasiGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate regulasi berdasarkan id
    updateRegulasi: async (req, res) => {
        try {
            //mendapatkan data regulasi untuk pengecekan
            let RegulasiGet = await Regulasi.findOne({
                where: {
                    id: req.params.id
                }
            })

            //cek apakah data regulasi ada
            if (!RegulasiGet) {
                res.status(404).json(response(404, 'Regulasi not found'));
                return;
            }

            //membuat schema untuk validasi
            const schema = {
                title: { type: "string", min: 3, optional: true },
                file: {
                    type: "string",
                    optional: true
                },
            }

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/regulasi/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
                
                fileKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object regulasi
            let RegulasiUpdateObj = {
                title: req.body.title,
                file: req.file ? fileKey : RegulasiGet.file,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(RegulasiUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //update Regulasi
            await Regulasi.update(RegulasiUpdateObj, {
                where: {
                    id: req.params.id,
                }
            })

            //mendapatkan data Regulasi setelah update
            let RegulasiAfterUpdate = await Regulasi.findOne({
                where: {
                    id: req.params.id,
                }
            })

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update regulasi', RegulasiAfterUpdate));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //menghapus regulasi berdasarkan id
    deleteRegulasi: async (req, res) => {
        try {

            //mendapatkan data regulasi untuk pengecekan
            let RegulasiGet = await Regulasi.findOne({
                where: {
                    id: req.params.id
                }
            })

            //cek apakah data regulasi ada
            if (!RegulasiGet) {
                res.status(404).json(response(404, 'Regulasi not found'));
                return;
            }

            await Regulasi.destroy({
                where: {
                    id: req.params.id,
                }
            })

            res.status(200).json(response(200, 'success delete regulasi'));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    }
}