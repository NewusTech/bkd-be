const { response } = require('../helpers/response.formatter');

const { User, User_info, Role, Bidang, Kecamatan, Desa, sequelize } = require('../models');

const passwordHash = require('password-hash');
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require('sequelize');
const { generatePagination } = require('../pagination/pagination');

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const Redis = require("ioredis");
const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
});

const s3Client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    useAccelerateEndpoint: true
});

module.exports = {

    //mendapatkan semua data user
    //UTK ADMIN NGECEK DATA PEMOHON
    getUserData: async (req, res) => {
        try {
            const search = req.query.search ?? null;
            const role = req.query.role ?? null;
            const bidang = req.query.bidang ?? null;
            const layanan = req.query.layanan ?? null;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const showDeleted = req.query.showDeleted ?? null;
            const offset = (page - 1) * limit;
            let userGets;
            let totalCount;

            const userWhereClause = {};
            if (showDeleted !== null) {
                userWhereClause.deletedAt = { [Op.not]: null };
            } else {
                userWhereClause.deletedAt = null;
            }
            if (role) {
                userWhereClause.role_id = role;
            }
            if (bidang) {
                userWhereClause.bidang_id = bidang;
            }
            if (layanan) {
                userWhereClause.layanan_id = layanan;
            }

            if (search) {
                [userGets, totalCount] = await Promise.all([
                    User_info.findAll({
                        where: {
                            [Op.or]: [
                                { nip: { [Op.like]: `%${search}%` } },
                                { name: { [Op.like]: `%${search}%` } }
                            ]
                        },
                        include: [
                            {
                                model: User,
                                where: userWhereClause,
                                attributes: ['id'],
                                include: [
                                    {
                                        model: Role,
                                        attributes: ['id', 'name'],
                                    },
                                    {
                                        model: Bidang,
                                        attributes: ['id', 'nama'],
                                    }
                                ],
                            },
                            {
                                model: Kecamatan,
                                attributes: ['nama', 'id'],
                                as: 'Kecamatan'
                            },
                            {
                                model: Desa,
                                attributes: ['nama', 'id'],
                                as: 'Desa'
                            }
                        ],
                        limit: limit,
                        offset: offset
                    }),
                    User_info.count({
                        where: {
                            [Op.or]: [
                                { nip: { [Op.like]: `%${search}%` } },
                                { name: { [Op.like]: `%${search}%` } }
                            ]
                        },
                        include: [
                            {
                                model: User,
                                where: userWhereClause,
                                attributes: ['id'],
                                include: [
                                    {
                                        model: Role,
                                        attributes: ['id', 'name'],
                                    },
                                    {
                                        model: Bidang,
                                        attributes: ['id', 'nama'],
                                    }
                                ],
                            },
                            {
                                model: Kecamatan,
                                attributes: ['nama', 'id'],
                                as: 'Kecamatan'
                            },
                            {
                                model: Desa,
                                attributes: ['nama', 'id'],
                                as: 'Desa'
                            }
                        ],
                    })
                ]);
            } else {
                [userGets, totalCount] = await Promise.all([
                    User_info.findAll({
                        limit: limit,
                        offset: offset,
                        include: [
                            {
                                model: User,
                                where: userWhereClause,
                                attributes: ['id'],
                                include: [
                                    {
                                        model: Role,
                                        attributes: ['id', 'name'],
                                    },
                                    {
                                        model: Bidang,
                                        attributes: ['id', 'nama'],
                                    }
                                ],
                            },
                            {
                                model: Kecamatan,
                                attributes: ['nama', 'id'],
                                as: 'Kecamatan'
                            },
                            {
                                model: Desa,
                                attributes: ['nama', 'id'],
                                as: 'Desa'
                            }
                        ],
                    }),
                    User_info.count({
                        include: [
                            {
                                model: User,
                                where: userWhereClause,
                                attributes: ['id'],
                                include: [
                                    {
                                        model: Role,
                                        attributes: ['id', 'name'],
                                    },
                                    {
                                        model: Bidang,
                                        attributes: ['id', 'nama'],
                                    }
                                ],
                            },
                            {
                                model: Kecamatan,
                                attributes: ['nama', 'id'],
                                as: 'Kecamatan'
                            },
                            {
                                model: Desa,
                                attributes: ['nama', 'id'],
                                as: 'Desa'
                            }
                        ],
                    })
                ]);
            }

            const pagination = generatePagination(totalCount, page, limit, '/api/user/alluserinfo/get');

            const formattedData = userGets.map(user => {
                return {
                    id: user.id,
                    user_id: user?.User?.id,
                    name: user.name,
                    slug: user.slug,
                    nip: user.nip,
                    nik: user.nik,
                    email: user.email,
                    telepon: user.telepon,
                    kecamatan_id: user.kecamatan_id,
                    kecamatan_nama: user.Kecamatan?.nama,
                    desa_id: user.desa_id,
                    desa_nama: user.Desa?.nama,
                    rt: user.rt,
                    rw: user.rw,
                    alamat: user.alamat,
                    agama: user.agama,
                    tempat_lahir: user.tempat_lahir,
                    tgl_lahir: user.tgl_lahir,
                    gender: user.gender,
                    goldar: user.goldar,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    Role: user.User.Role ? user.User.Role.name : null,
                    Bidang: user.User.Bidang ? user.User.Bidang.nama : null
                };
            });

            res.status(200).json({
                status: 200,
                message: 'success get user',
                data: formattedData,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json({
                status: 500,
                message: 'internal server error',
                error: err
            });
            console.log(err);
        }
    },

    //mendapatkan data user berdasarkan slug
    //UTK ADMIN NGECEK DATA PEMOHON
    getUserBySlug: async (req, res) => {
        try {

            const showDeleted = req.query.showDeleted ?? null;
            const whereCondition = { slug: req.params.slug };

            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            let userGet = await User_info.findOne({
                where: whereCondition,
                include: [
                    {
                        model: Kecamatan,
                        attributes: ['nama', 'id'],
                        as: 'Kecamatan'
                    },
                    {
                        model: Desa,
                        attributes: ['nama', 'id'],
                        as: 'Desa'
                    },
                    {
                        model: User,
                        attributes: ['id'],
                    }
                ]
            });

            if (!userGet) {
                res.status(404).json(response(404, 'user data not found'));
                return;
            }

            res.status(200).json(response(200, 'success get user by slug', userGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //create data person
    //dari sisi admin, jika user offline belum punya akun
    createUserInfo: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {

            const userId = req.user?.user_akun_id;
    
            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: 'User ID tidak tersedia'
                });
            }

            // Membuat schema untuk validasi
            const schema = {
                name: { type: "string", min: 2 },
                nip: { type: "string", min: 18 },
                nik: { type: "string", length: 16 },
                email: { type: "string", min: 5, max: 50, pattern: /^\S+@\S+\.\S+$/, optional: true },
                telepon: { type: "string", min: 7, max: 15, pattern: /^[0-9]+$/, optional: true },
                kecamatan_id: { type: "string", min: 1, optional: true },
                desa_id: { type: "string", min: 1, optional: true },
                rt: { type: "string", min: 1, optional: true },
                rw: { type: "string", min: 1, optional: true },
                alamat: { type: "string", min: 3, optional: true },
                agama: { type: "number", optional: true },
                tempat_lahir: { type: "string", min: 2, optional: true },
                tgl_lahir: { type: "string", pattern: /^\d{4}-\d{2}-\d{2}$/, optional: true },
                gender: { type: "number", optional: true },
                goldar: { type: "number", optional: true },
                image_profile: { type: "string", optional: true },
            }

            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
            const slug = `${req.body.name}-${timestamp}`;


            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/user/profile/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                imageKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

             // Buat object userinfo
             let userinfoObj = {
                name: req.body.name,
                nik: req.body.nik,
                nip: req.body.nip,
                email: req.body.email,
                telepon: req.body.telepon,
                kecamatan_id: req.body.kecamatan_id,
                desa_id: req.body.desa_id,
                rt: req.body.rt,
                rw: req.body.rw,
                alamat: req.body.alamat,
                agama: req.body.agama ? Number(req.body.agama) : null,
                tempat_lahir: req.body.tempat_lahir,
                tgl_lahir: req.body.tgl_lahir,
                gender: req.body.gender ? Number(req.body.gender) : null,
                goldar: req.body.goldar ? Number(req.body.goldar) : null,
                image_profile: req.file ? imageKey : null,
                slug: slug
            };

            // Validasi menggunakan module fastest-validator
            const validate = v.validate(userinfoObj, schema);
            if (validate.length > 0) {
                // Format pesan error dalam bahasa Indonesia
                const errorMessages = validate.map(error => {
                    if (error.type === 'stringMin') {
                        return `Field ${error.field} minimal ${error.expected} karakter`;
                    } else if (error.type === 'stringMax') {
                        return `Field ${error.field} maksimal ${error.expected} karakter`;
                    } else if (error.type === 'stringPattern') {
                        return `Field ${error.field} format tidak valid`;
                    } else {
                        return `Field ${error.field} tidak valid`;
                    }
                });

                res.status(400).json({
                    status: 400,
                    message: errorMessages.join(', ')
                });
                return;
            }

            // Update userinfo
            let userinfoCreate = await User_info.create(userinfoObj)


            // Response menggunakan helper response.formatter
            await transaction.commit();
            res.status(200).json(response(200, 'success create userinfo', userinfoCreate));
        } catch (err) {
            await transaction.rollback();
            if (err.name === 'SequelizeUniqueConstraintError') {
                // Menangani error khusus untuk constraint unik
                res.status(400).json({
                    status: 400,
                    message: `${err.errors[0].path} sudah terdaftar`
                });
            } else {
                // Menangani error lainnya
                res.status(500).json(response(500, 'terjadi kesalahan pada server', err));
            }
            console.log(err);
        }
    },

    //update data person
    //user update sendiri
    updateUserInfo: async (req, res) => {
        try {
            // Mendapatkan user_id dari user yang sedang login (misalnya, dari token JWT)
            const userId = req.user?.user_akun_id;
    
            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: 'User ID tidak tersedia'
                });
            }
    
            // Mendapatkan data userinfo untuk pengecekan berdasarkan user_id
            let userinfoGet = await User_info.findOne({
                where: {
                    user_id: userId,
                    deletedAt: null // Jika menggunakan soft delete
                }
            });
    
            // Cek apakah data userinfo ada
            if (!userinfoGet) {
                return res.status(404).json({
                    status: 404,
                    message: 'userinfo not found'
                });
            }
    
            // Membuat schema untuk validasi
            const schema = {
                name: { type: "string", min: 2, optional: true },
                nik: { type: "string", length: 16, optional: true },
                nip: { type: "string", length: 18, optional: true },
                email: { type: "string", min: 5, max: 50, pattern: /^\S+@\S+\.\S+$/, optional: true },
                telepon: { type: "string", min: 7, max: 15, pattern: /^[0-9]+$/, optional: true },
                kecamatan_id: { type: "string", min: 1, optional: true },
                desa_id: { type: "string", min: 1, optional: true },
                rt: { type: "string", min: 1, optional: true },
                rw: { type: "string", min: 1, optional: true },
                alamat: { type: "string", min: 3, optional: true },
                agama: { type: "number", optional: true },
                tempat_lahir: { type: "string", min: 2, optional: true },
                tgl_lahir: { type: "string", pattern: /^\d{4}-\d{2}-\d{2}$/, optional: true },
                gender: { type: "number", optional: true },
                goldar: { type: "number", optional: true },
                image_profile: { type: "string", optional: true }
            };
    
            let imageKey;
            if (req.file) {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${req.file.originalname}`;
    
                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/user/profile/${uniqueFileName}`,
                    Body: req.file.buffer,
                    ACL: 'public-read',
                    ContentType: req.file.mimetype
                };
    
                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
    
                imageKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            }
    
            // Buat object userinfo
            let userinfoUpdateObj = {
                name: req.body.name,
                nik: req.body.nik,
                nip: req.body.nip,
                email: req.body.email,
                telepon: req.body.telepon,
                kecamatan_id: req.body.kecamatan_id,
                desa_id: req.body.desa_id,
                rt: req.body.rt,
                rw: req.body.rw,
                alamat: req.body.alamat,
                agama: req.body.agama ? Number(req.body.agama) : undefined,
                tempat_lahir: req.body.tempat_lahir,
                tgl_lahir: req.body.tgl_lahir,
                gender: req.body.gender ? Number(req.body.gender) : undefined,
                goldar: req.body.goldar ? Number(req.body.goldar) : undefined,
                image_profile: req.file ? imageKey : userinfoGet.image_profile
            };
    
            // Validasi menggunakan fastest-validator
            const validate = v.validate(userinfoUpdateObj, schema);
            if (validate.length > 0) {
                const errorMessages = validate.map(error => {
                    if (error.type === 'stringMin') {
                        return `Field ${error.field} minimal ${error.expected} karakter`;
                    } else if (error.type === 'stringMax') {
                        return `Field ${error.field} maksimal ${error.expected} karakter`;
                    } else if (error.type === 'stringPattern') {
                        return `Field ${error.field} format tidak valid`;
                    } else {
                        return `Field ${error.field} tidak valid`;
                    }
                });
    
                return res.status(400).json({
                    status: 400,
                    message: errorMessages.join(', ')
                });
            }
    
            // Update userinfo
            await User_info.update(userinfoUpdateObj, {
                where: {
                    user_id: userId,
                    deletedAt: null
                }
            });
    
            // Mendapatkan data userinfo setelah update
            let userinfoAfterUpdate = await User_info.findOne({
                where: {
                    user_id: userId
                }
            });
    
            // Response
            res.status(200).json({
                status: 200,
                message: 'success update userinfo',
                data: userinfoAfterUpdate
            });
    
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                res.status(400).json({
                    status: 400,
                    message: `${err.errors[0].path} sudah terdaftar`
                });
            } else {
                res.status(500).json({
                    status: 500,
                    message: 'Terjadi kesalahan pada server',
                    error: err.message
                });
            }
            console.log(err);
        }
    },
    

    //menghapus user berdasarkan slug
    deleteUser: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {

            //mendapatkan data user untuk pengecekan
            let userinfoGet = await User_info.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                },
                transaction
            })

            //cek apakah data user ada
            if (!userinfoGet) {
                await transaction.rollback();
                res.status(404).json(response(404, 'data not found'));
                return;
            }

            const models = Object.keys(sequelize.models);

            // Array untuk menyimpan promise update untuk setiap model terkait
            const updatePromises = [];

            // Lakukan soft delete pada semua model terkait
            models.forEach(async modelName => {
                const Model = sequelize.models[modelName];
                if (Model.associations && Model.associations.User_info && Model.rawAttributes.deletedAt) {
                    updatePromises.push(
                        Model.update({ deletedAt: new Date() }, {
                            where: {
                                userinfo_id: userinfoGet.id
                            },
                            transaction
                        })
                    );
                }
            });

            // Jalankan semua promise update secara bersamaan
            await Promise.all(updatePromises);

            await User_info.update({ deletedAt: new Date() }, {
                where: {
                    slug: req.params.slug
                },
                transaction
            });

            await transaction.commit();

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success delete user'));

        } catch (err) {
            // Rollback transaksi jika terjadi kesalahan
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

}