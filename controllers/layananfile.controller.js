const { response } = require('../helpers/response.formatter');

const { Layanan_file, Layanan } = require('../models');
require('dotenv').config()

const Validator = require("fastest-validator");
const v = new Validator();
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

    //create layanan file
    createLayananFile: async (req, res) => {
        try {

            //membuat schema untuk validasi
            const schema = {
                nama: { type: "string" },
                layanan_id: { type: "number" }
            }

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/layanan_file/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                fileKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object layanan
            let layananCreateObj = {
                nama: req.body.nama,
                layanan_id: Number(req.params.idlayanan),
                file: req.file ? fileKey : undefined,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(layananCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //buat layanan
            let layananCreate = await Layanan_file.create(layananCreateObj);

            res.status(201).json(response(201, 'success create file layanan', layananCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    getLayananFile: async (req, res) => {
        try {
            const idlayanan = req.params.idlayanan;

            let layananData = await Layanan.findOne({
                where: {
                    id: idlayanan
                },
                attributes: ['id' ,'nama', 'desc'],
                include: [
                    {
                        model: Layanan_file,
                    },
                ]
            });

            if (!layananData) {
                res.status(404).json(response(404, 'data not found'));
                return;
            }

            res.status(200).json(response(200, 'success get data file layanan', layananData));
        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    getLayananFileById: async (req, res) => {
        try {
        
            let LayananfileGet = await Layanan_file.findOne({
                where: {
                    id: req.params.id
                },
            });

            //cek jika Layananfile tidak ada
            if (!LayananfileGet) {
                res.status(404).json(response(404, 'Layanan file not found'));
                return;
            }

            res.status(200).json(response(200, 'success get file layanan by id', LayananfileGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    updateLayananFile: async (req, res) => {
        try {
            //mendapatkan data layanan untuk pengecekan
            let layananGet = await Layanan_file.findOne({
                where: {
                    id: req.params.id,
                }
            })

            //cek apakah data layanan ada
            if (!layananGet) {
                res.status(404).json(response(404, 'layanan file not found'));
                return;
            }

            //membuat schema untuk validasi
            const schema = {
                nama: { type: "string", optional: true },
            }

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: `${process.env.PATH_AWS}/layanan_file/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                fileKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object layanan
            let layananUpdateObj = {
                nama: req.body.nama,
                file: req.file ? fileKey : layananGet.file,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(layananUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //update layanan
            await Layanan_file.update(layananUpdateObj, {
                where: {
                    id: req.params.id,
                }
            })

            res.status(200).json(response(200, 'success update layanan file'));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    deleteLayananFile: async (req, res) => {
        try {

            //mendapatkan data Layananfile untuk pengecekan
            let LayananfileGet = await Layanan_file.findOne({
                where: {
                    id: req.params.idlayanan
                }
            })

            //cek apakah data Layananfile ada
            if (!LayananfileGet) {
                res.status(404).json(response(404, 'Layanan file not found'));
                return;
            }

            await Layanan_file.destroy({
                where: {
                    id: req.params.idlayanan,
                }
            })

            res.status(200).json(response(200, 'success delete layanan file'));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    }
}