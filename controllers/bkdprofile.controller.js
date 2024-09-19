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
                image_bkd: { type: "string", min: 3 },
                visi: { type: "string", min: 3 },
                misi: { type: "string", min: 3 },
                kontak: { type: "string", min: 3 },
                long: { type: "string", min: 3 },
                lang: { type: "string", min: 3 },
                logo: { type: "string", min: 3 },
            }

            let imageKey = null;
            let logoKey = null;
            
            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/about_bkd/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                imageKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/about_bkd/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                logoKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            //buat object Facilities
            let ProfileCreateObj = {
                about_bkd: req.body.about_bkd,
                visi: req.body.visi,
                misi: req.body.misi,
                kontak: req.body.kontak,
                long: req.body.long,
                lang: req.body.lang,
                image_bkd: req.file ? imageKey : null,
                logo: req.file ? logoKey : null,
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
            //mendapatkan data contact berdasarkan
            let profileGet = await Bkd_profile.findOne();

            //cek jika contact tidak ada
            if (!profileGet) {
                res.status(404).json(response(404, 'about bkd not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get about bkd', profileGet));
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
            // Mendapatkan data Profile untuk pengecekan
            let ProfileGet = await Bkd_profile.findOne({
                where: {
                    id: req.params.id
                }
            });
    
            // Cek apakah data Profile ada
            if (!ProfileGet) {
                res.status(404).json(response(404, 'BKD Profile not found'));
                return;
            }
    
            // Membuat schema untuk validasi
            const schema = {
                about_bkd: { type: "string", min: 3, optional: true },
                image_bkd: { type: "string", min: 3, optional: true },
                visi: { type: "string", min: 3, optional: true },
                misi: { type: "string", min: 3, optional: true },
                kontak: { type: "string", min: 3, optional: true },
                long: { type: "string", min: 3, optional: true },
                lang: { type: "string", min: 3, optional: true },
                logo: { type: "string", min: 3, optional: true },
            };
    
            let imageKey = null;
            let logoKey = null;
    
            // Proses upload image_bkd
            if (req.files && req.files.image_bkd) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.files.image_bkd[0].originalname}`;
    
                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/about_bkd/${uniqueFileName}`,
                    Body: req.files.image_bkd[0].buffer,
                    ACL: 'public-read',
                    ContentType: req.files.image_bkd[0].mimetype
                };
    
                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
    
                imageKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }
    
            // Proses upload logo
            if (req.files && req.files.logo) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.files.logo[0].originalname}`;
    
                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/about_bkd/${uniqueFileName}`,
                    Body: req.files.logo[0].buffer,
                    ACL: 'public-read',
                    ContentType: req.files.logo[0].mimetype
                };
    
                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
    
                logoKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }
    
            // Buat object untuk update profile
            let ProfileUpdateObj = {
                about_bkd: req.body.about_bkd,
                visi: req.body.visi,
                misi: req.body.misi,
                kontak: req.body.kontak,
                long: req.body.long,
                lang: req.body.lang,
                image_bkd: imageKey || ProfileGet.image_bkd, // Tetap gunakan gambar lama jika tidak ada upload baru
                logo: logoKey || ProfileGet.logo, // Tetap gunakan logo lama jika tidak ada upload baru
            };
    
            // Validasi menggunakan module fastest-validator
            const validate = v.validate(ProfileUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }
    
            // Update profile
            await Bkd_profile.update(ProfileUpdateObj, {
                where: { id: req.params.id }
            });
    
            // Mendapatkan data profile setelah update
            let ProfileAfterUpdate = await Bkd_profile.findOne({
                where: { id: req.params.id }
            });
    
            // Response sukses
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