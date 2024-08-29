const { response } = require('../helpers/response.formatter');

const { User, Userinfo, Role, Instansi, Kecamatan, Desa, sequelize } = require('../models');

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
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    useAccelerateEndpoint: true
});

module.exports = {

    //mendapatkan semua data user
    getuserdata: async (req, res) => {
        try {
            const search = req.query.search ?? null;
            const role = req.query.role ?? null;
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

            if (search) {
                [userGets, totalCount] = await Promise.all([
                    Userinfo.findAll({
                        where: {
                            [Op.or]: [
                                { nik: { [Op.iLike]: `%${search}%` } },
                                { name: { [Op.iLike]: `%${search}%` } }
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
                                ],
                            },
                        ],
                        limit: limit,
                        offset: offset
                    }),
                    Userinfo.count({
                        where: {
                            [Op.or]: [
                                { nik: { [Op.iLike]: `%${search}%` } },
                                { name: { [Op.iLike]: `%${search}%` } }
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
                                ],
                            },
                        ],
                    })
                ]);
            } else {
                [userGets, totalCount] = await Promise.all([
                    Userinfo.findAll({
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
                                ],
                            },
                        ],
                    }),
                    Userinfo.count({
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
                                ],
                            },
                        ],
                    })
                ]);
            }

            const pagination = generatePagination(totalCount, page, limit, '/api/userinfo/get');

            const formattedData = userGets.map(user => {
                return {
                    id: user.id,
                    user_id: user?.User?.id,
                    name: user.name,
                    slug: user.slug,
                    nik: user.nik,
                    email: user.email,
                    telepon: user.telepon,
                    alamat: user.alamat,
                    agama: user.agama,
                    tempat_lahir: user.tempat_lahir,
                    tgl_lahir: user.tgl_lahir,
                    status_kawin: user.status_kawin,
                    gender: user.gender,
                    pekerjaan: user.pekerjaan,
                    goldar: user.goldar,
                    pendidikan: user.pendidikan,
                    foto: user.foto,
                    aktalahir: user.aktalahir,
                    filektp: user.filektp,
                    filekk: user.filekk,
                    fileijazahsd: user.fileijazahsd,
                    fileijazahsmp: user.fileijazahsmp,
                    fileijazahsma: user.fileijazahsma,
                    fileijazahlain: user.fileijazahlain,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    Role: user.User.Role ? user.User.Role.name : null,
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
    getuserByslug: async (req, res) => {
        try {

            const showDeleted = req.query.showDeleted ?? null;
            const whereCondition = { slug: req.params.slug };

            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            let userGet = await Userinfo.findOne({
                where: whereCondition,
                include: [
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

    //create data
    createuserinfo: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const folderPaths = {
                aktalahir: `${process.env.PATH_AWS}/datauser/aktalahir`,
                foto: `${process.env.PATH_AWS}/datauser/foto`,
                filektp: `${process.env.PATH_AWS}/datauser/filektp`,
                filekk: `${process.env.PATH_AWS}/datauser/filekk`,
                fileijazahsd: `${process.env.PATH_AWS}/datauser/fileijazahsd`,
                fileijazahsmp: `${process.env.PATH_AWS}/datauser/fileijazahsmp`,
                fileijazahsma: `${process.env.PATH_AWS}/datauser/fileijazahsma`,
                fileijazahlain: `${process.env.PATH_AWS}/datauser/fileijazahlain`,
            };

            // Membuat schema untuk validasi
            const schema = {
                name: { type: "string", min: 2 },
                nik: { type: "string", length: 16 },
                email: { type: "string", min: 5, max: 50, pattern: /^\S+@\S+\.\S+$/, optional: true },
                telepon: { type: "string", min: 7, max: 15, pattern: /^[0-9]+$/, optional: true },
                alamat: { type: "string", min: 3, optional: true },
                agama: { type: "number", optional: true },
                tempat_lahir: { type: "string", min: 2, optional: true },
                tgl_lahir: { type: "string", pattern: /^\d{4}-\d{2}-\d{2}$/, optional: true },
                status_kawin: { type: "number", optional: true },
                gender: { type: "number", optional: true },
                pekerjaan: { type: "string", optional: true },
                goldar: { type: "number", optional: true },
                pendidikan: { type: "number", optional: true },
                foto: { type: "string", optional: true },
                aktalahir: { type: "string", optional: true },
                filekk: { type: "string", optional: true },
                filektp: { type: "string", optional: true },
                fileijazahsd: { type: "string", optional: true },
                fileijazahsmp: { type: "string", optional: true },
                fileijazahsma: { type: "string", optional: true },
                fileijazahlain: { type: "string", optional: true },
            }

            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
            const slug = `${req.body.name}-${timestamp}`;

            // Buat object userinfo
            let userinfoObj = {
                name: req.body.name,
                nik: req.body.nik,
                email: req.body.email,
                telepon: req.body.telepon,
                alamat: req.body.alamat,
                agama: req.body.agama ? Number(req.body.agama) : null,
                tempat_lahir: req.body.tempat_lahir,
                tgl_lahir: req.body.tgl_lahir,
                status_kawin: req.body.status_kawin ? Number(req.body.status_kawin) : null,
                gender: req.body.gender ? Number(req.body.gender) : null,
                pekerjaan: req.body.pekerjaan,
                goldar: req.body.goldar ? Number(req.body.goldar) : null,
                pendidikan: req.body.pendidikan ? Number(req.body.pendidikan) : null,
                slug: slug
            };

            // Process image upload
            const files = req.files;
            let imageUrls = {};

            const uploadPromises = Object.keys(files).map(async (key) => {
                if (files[key] && files[key][0]) {
                    const file = files[key][0];
                    const { mimetype, buffer, originalname } = file;

                    const now = new Date();
                    const timestamp = now.toISOString().replace(/[-:.]/g, '');
                    const uniqueFilename = `${originalname.split('.')[0]}_${timestamp}`;

                    const redisKey = `upload:${slug}:${key}`;
                    await redisClient.set(redisKey, JSON.stringify({
                        buffer,
                        mimetype,
                        originalname,
                        uniqueFilename,
                        folderPath: folderPaths[key]
                    }), 'EX', 60 * 60); // Expire in 1 hour

                    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${folderPaths[key]}/${uniqueFilename}`;
                    imageUrls[key] = fileUrl;
                    userinfoObj[key] = fileUrl;
                }
            });

            await Promise.all(uploadPromises);

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
            let userinfoCreate = await Userinfo.create(userinfoObj)

            const firstName = req.body.name.split(' ')[0].toLowerCase();
            const generatedPassword = firstName + "123";

            // Membuat object untuk create user
            let userCreateObj = {
                password: passwordHash.generate(generatedPassword),
                role_id: 1,
                userinfo_id: userinfoCreate.id,
                slug: slug
            };

            // Membuat user baru
            await User.create(userCreateObj);

            // Mulai proses background untuk mengunggah ke S3
            setTimeout(async () => {
                for (const key in files) {
                    const redisKey = `upload:${slug}:${key}`;
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
    updateuserinfo: async (req, res) => {
        try {
            //mendapatkan data userinfo untuk pengecekan
            let userinfoGet = await Userinfo.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                }
            })

            //cek apakah data userinfo ada
            if (!userinfoGet) {
                res.status(404).json(response(404, 'userinfo not found'));
                return;
            }

            //membuat schema untuk validasi
            const schema = {
                name: { type: "string", min: 2, optional: true },
                nik: { type: "string", length: 16, optional: true },
                email: { type: "string", min: 5, max: 50, pattern: /^\S+@\S+\.\S+$/, optional: true },
                telepon: { type: "string", min: 7, max: 15, pattern: /^[0-9]+$/, optional: true },
                alamat: { type: "string", min: 3, optional: true },
                agama: { type: "number", optional: true },
                tempat_lahir: { type: "string", min: 2, optional: true },
                tgl_lahir: { type: "string", pattern: /^\d{4}-\d{2}-\d{2}$/, optional: true },
                status_kawin: { type: "number", optional: true },
                gender: { type: "number", optional: true },
                pekerjaan: { type: "string", optional: true },
                goldar: { type: "number", optional: true },
                pendidikan: { type: "number", optional: true },
            }

            //buat object userinfo
            let userinfoUpdateObj = {
                name: req.body.name,
                nik: req.body.nik,
                email: req.body.email,
                telepon: req.body.telepon,
                alamat: req.body.alamat,
                agama: req.body.agama ? Number(req.body.agama) : undefined,
                tempat_lahir: req.body.tempat_lahir,
                tgl_lahir: req.body.tgl_lahir,
                status_kawin: req.body.status_kawin ? Number(req.body.status_kawin) : undefined,
                gender: req.body.gender ? Number(req.body.gender) : undefined,
                pekerjaan: req.body.pekerjaan,
                goldar: req.body.goldar ? Number(req.body.goldar) : undefined,
                pendidikan: req.body.pendidikan ? Number(req.body.pendidikan) : undefined,
            };

            //validasi menggunakan module fastest-validator
            const validate = v.validate(userinfoUpdateObj, schema);
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

            //update userinfo
            await Userinfo.update(userinfoUpdateObj, {
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                }
            })

            //mendapatkan data userinfo setelah update
            let userinfoAfterUpdate = await Userinfo.findOne({
                where: {
                    slug: req.params.slug,
                }
            })

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update userinfo', userinfoAfterUpdate));

        } catch (err) {
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
    updateuserdocs: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const folderPaths = {
                aktalahir: `${process.env.PATH_AWS}/datauser/aktalahir`,
                foto: `${process.env.PATH_AWS}/datauser/foto`,
                filektp: `${process.env.PATH_AWS}/datauser/filektp`,
                filekk: `${process.env.PATH_AWS}/datauser/filekk`,
                fileijazahsd: `${process.env.PATH_AWS}/datauser/fileijazahsd`,
                fileijazahsmp: `${process.env.PATH_AWS}/datauser/fileijazahsmp`,
                fileijazahsma: `${process.env.PATH_AWS}/datauser/fileijazahsma`,
                fileijazahlain: `${process.env.PATH_AWS}/datauser/fileijazahlain`,
            };

            // Mendapatkan data userinfo untuk pengecekan
            let userinfoGet = await Userinfo.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                },
                transaction
            });

            // Cek apakah data userinfo ada
            if (!userinfoGet) {
                await transaction.rollback();
                res.status(404).json(response(404, 'userinfo not found'));
                return;
            }

            const oldImageUrls = {
                aktalahir: userinfoGet.aktalahir,
                foto: userinfoGet.foto,
                filektp: userinfoGet.filektp,
                filekk: userinfoGet.filekk,
                fileijazahsd: userinfoGet.fileijazahsd,
                fileijazahsmp: userinfoGet.fileijazahsmp,
                fileijazahsma: userinfoGet.fileijazahsma,
                fileijazahlain: userinfoGet.fileijazahlain,
            };

            const files = req.files;
            let uploadResults = {};

            const uploadPromises = Object.keys(files).map(async (key) => {
                if (files[key] && files[key][0]) {
                    const file = files[key][0];
                    const { mimetype, buffer, originalname } = file;
                    const base64 = Buffer.from(buffer).toString('base64');
                    const dataURI = `data:${mimetype};base64,${base64}`;

                    const now = new Date();
                    const timestamp = now.toISOString().replace(/[-:.]/g, '');
                    const uniqueFilename = `${originalname.split('.')[0]}_${timestamp}`;

                    const redisKey = `upload:${req.params.slug}:${key}`;
                    await redisClient.set(redisKey, JSON.stringify({
                        buffer,
                        mimetype,
                        originalname,
                        uniqueFilename,
                        folderPath: folderPaths[key]
                    }), 'EX', 60 * 60); // Expire in 1 hour

                    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${folderPaths[key]}/${uniqueFilename}`;
                    uploadResults[key] = fileUrl;
                }
            });

            await Promise.all(uploadPromises);

            let userinfoUpdateObj = {};

            for (const key in folderPaths) {
                userinfoUpdateObj[key] = uploadResults[key] || oldImageUrls[key];
            }

            // Update userinfo
            await Userinfo.update(userinfoUpdateObj, {
                where: {
                    slug: req.params.slug,
                },
                transaction
            });

            // Mendapatkan data userinfo setelah update
            let userinfoAfterUpdate = await Userinfo.findOne({
                where: {
                    slug: req.params.slug,
                },
                transaction
            });

            await transaction.commit();


            // Mulai proses background untuk mengunggah ke S3
            setTimeout(async () => {
                for (const key in files) {
                    const redisKey = `upload:${req.params.slug}:${key}`;
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

            // Response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success update userinfo', userinfoAfterUpdate));

        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //menghapus user berdasarkan slug
    deleteuser: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {

            //mendapatkan data user untuk pengecekan
            let userinfoGet = await Userinfo.findOne({
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
                if (Model.associations && Model.associations.Userinfo && Model.rawAttributes.deletedAt) {
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

            await Userinfo.update({ deletedAt: new Date() }, {
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