const { response } = require('../helpers/response.formatter');
const { Struktur } = require('../models');
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

    //membuat struktur
    createStruktur: async (req, res) => {
        try {
            const schema = {
                title: { type: "string"},
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
                    Key: `${process.env.PATH_AWS}/file_struktur/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                fileKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object struktur
            let StrukturCreateObj = {
                title: req.body.title,
                file: req.file ? fileKey : undefined,
            }

            const validate = v.validate(StrukturCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //buat struktur
            let StrukturCreate = await Struktur.create(StrukturCreateObj);

            res.status(201).json(response(201, 'success create file struktur', StrukturCreate));
        } catch (err) {
            logger.error(`Error : ${err}`);
            logger.error(`Error message: ${err.message}`);
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua data struktur
    getStruktur: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let StrukturGets;
            let totalCount;

            [StrukturGets, totalCount] = await Promise.all([
                Struktur.findAll({
                    limit: limit,
                    offset: offset
                }),
                Struktur.count()
            ]);

            const pagination = generatePagination(totalCount, page, limit, '/api/user/struktur/get');

            res.status(200).json({
                status: 200,
                message: 'success get file struktur',
                data: StrukturGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan data struktur berdasarkan id
    getStrukturByID: async (req, res) => {
        try {
            //mendapatkan data struktur berdasarkan id
            let StrukturGet = await Struktur.findOne({
                where: {
                    id: req.params.id
                },
            });

            //cek jika Struktur tidak ada
            if (!StrukturGet) {
                res.status(404).json(response(404, 'Struktur not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get file struktur by id', StrukturGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate struktur berdasarkan id
    updateStruktur: async (req, res) => {
        try {
            //mendapatkan data file struktur untuk pengecekan
            let StrukturGet = await Struktur.findOne({
                where: {
                    id: req.params.id
                }
            })

            //cek apakah data file struktur ada
            if (!StrukturGet) {
                res.status(404).json(response(404, 'File struktur not found'));
                return;
            }

            //membuat schema untuk validasi
            const schema = {
                title: { type: "string", optional: true },
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
                    Key: `${process.env.PATH_AWS}/file_struktur/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
                
                fileKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object struktur
            let StrukturUpdateObj = {
                title: req.body.title,
                file: req.file ? fileKey : StrukturGet.file,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(StrukturUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //update Struktur
            await Struktur.update(StrukturUpdateObj, {
                where: {
                    id: req.params.id,
                }
            })

            //mendapatkan data Struktur setelah update
            let StrukturAfterUpdate = await Struktur.findOne({
                where: {
                    id: req.params.id,
                }
            })

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update Struktur', StrukturAfterUpdate));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //menghapus struktur berdasarkan id
    deleteStruktur: async (req, res) => {
        try {

            //mendapatkan data file struktur untuk pengecekan
            let StrukturGet = await Struktur.findOne({
                where: {
                    id: req.params.id
                }
            })

            //cek apakah data file struktur ada
            if (!StrukturGet) {
                res.status(404).json(response(404, 'File struktur not found'));
                return;
            }

            await Struktur.destroy({
                where: {
                    id: req.params.id,
                }
            })

            res.status(200).json(response(200, 'success delete file struktur'));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    }
}