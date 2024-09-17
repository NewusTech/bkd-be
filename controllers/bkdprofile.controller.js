const { response } = require('../helpers/response.formatter');
const { Bkd_profile } = require('../models');
const Validator = require("fastest-validator");
const v = new Validator();
const { generatePagination } = require('../pagination/pagination');
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

    //membuat galeri
    createProfile: async (req, res) => {
        try {
            const schema = {
                about_bkd: { type: "string", min: 3 },
                visi: { type: "string", min: 3 },
                misi: { type: "string", min: 3 },
                kontak: { type: "string", min: 3 },
                long: { type: "string", min: 3 },
                lang: { type: "string", min: 3 },
            }

            //buat object Facilities
            let ProfileCreateObj = {
                about_bkd: req.body.about_bkd,
                visi: req.body.visi,
                misi: req.body.misi,
                kontak: req.body.kontak,
                long: req.body.long,
                lang: req.body.lang,
            }

            const validate = v.validate(ProfileCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //buat Profile
            let ProfileCreate = await Bkd_profile.create(ProfileCreateObj);

            res.status(201).json(response(201, 'success create Profile BKD', ProfileCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua data Profile
    getProfile: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let ProfileGets;
            let totalCount;

            [ProfileGets, totalCount] = await Promise.all([
                Bkd_profile.findAll({
                    limit: limit,
                    offset: offset
                }),
                Bkd_profile.count()
            ]);

            const pagination = generatePagination(totalCount, page, limit, '/api/user/bkd/profile/get');

            res.status(200).json({
                status: 200,
                message: 'success get profile bkd',
                data: ProfileGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan data profile berdasarkan slug
    getProfileById: async (req, res) => {
        try {
            //mendapatkan data profile berdasarkan slug
            let ProfileGet = await Bkd_profile.findOne({
                where: {
                    id: req.params.id
                },
            });

            //cek jika Profile tidak ada
            if (!ProfileGet) {
                res.status(404).json(response(404, 'BKD Profile not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get bkd profile by id', ProfileGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate Profile berdasarkan id
    updateProfile: async (req, res) => {
        try {
            //mendapatkan data Profile untuk pengecekan
            let ProfileGet = await Bkd_profile.findOne({
                where: {
                    id: req.params.id
                }
            })

            //cek apakah data Profile ada
            if (!ProfileGet) {
                res.status(404).json(response(404, 'BKD Profile not found'));
                return;
            }

            //membuat schema untuk validasi
            const schema = {
                about_bkd: { type: "string", min: 3, optional: true },
                visi: { type: "string", min: 3, optional: true },
                misi: { type: "string", min: 3, optional: true },
                kontak: { type: "string", min: 3, optional: true },
                long: { type: "string", min: 3, optional: true },
                lang: { type: "string", min: 3, optional: true },
            }

            //buat object Galeri
            let ProfileUpdateObj = {
                about_bkd: req.body.about_bkd,
                visi: req.body.visi,
                misi: req.body.misi,
                kontak: req.body.kontak,
                long: req.body.long,
                lang: req.body.lang,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(ProfileUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //update Profile
            await Bkd_profile.update(ProfileUpdateObj, {
                where: {
                    id: req.params.id,
                }
            })

            //mendapatkan data Profile setelah update
            let ProfileAfterUpdate = await Bkd_profile.findOne({
                where: {
                    id: req.params.id,
                }
            })

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update profile', ProfileAfterUpdate));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //menghapus Profile berdasarkan id
    deleteProfile: async (req, res) => {
        try {

            //mendapatkan data Profile untuk pengecekan
            let ProfileGet = await Bkd_profile.findOne({
                where: {
                    id: req.params.id
                }
            })

            //cek apakah data Profile ada
            if (!ProfileGet) {
                res.status(404).json(response(404, 'bkd profile not found'));
                return;
            }

            await Bkd_profile.destroy({
                where: {
                    id: req.params.id,
                }
            })

            res.status(200).json(response(200, 'success delete bkd profile'));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    }
}