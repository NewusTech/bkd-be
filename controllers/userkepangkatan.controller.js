const { response } = require('../helpers/response.formatter');

const { User, User_kepangkatan, Pangkat, Role, Bidang, sequelize } = require('../models');

const passwordHash = require('password-hash');
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require('sequelize');
const { generatePagination } = require('../pagination/pagination');

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const Redis = require("ioredis");
const { options } = require('../routes/historyform.route');
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
    getUserDataPangkat: async (req, res) => {
        try {
            // Ambil informasi user_id dari pengguna yang sedang login
            const iduser = req.user.role === "User" ? req.user.userId : req.body.userId; 
            
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
    
            // Query untuk mendapatkan data User_kepangkatan milik user yang sedang login
            const [userGets, totalCount] = await Promise.all([
                User_kepangkatan.findAll({
                    where: {
                        user_id: iduser
                    },
                    limit: limit,
                    offset: offset,
                    include: [
                        {
                            model: Pangkat,
                            attributes: ['nama', 'id'],
                            as: 'Pangkat'
                        },
                    ],
                }),
                User_kepangkatan.count({
                    where: {
                        user_id: iduser
                    }
                })
            ]);
    
            // Format hasil data
            const formattedData = userGets.map(user => ({
                id: user.id,
                user_id: user.user_id,
                pangkat_id: user.pangkat_id,
                pangkat_nama: user.Pangkat ? user.Pangkat.nama : null,
                tmt: user.tmt,
                no_sk_pangkat: user.no_sk_pangkat,
                tgl_sk_pangkat: user.tgl_sk_pangkat,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }));
    
            // Membuat pagination
            const pagination = generatePagination(totalCount, page, limit, '/api/user/kepangkatan/get');
    
            // Mengirimkan response
            res.status(200).json({
                status: 200,
                message: 'success get user pangkat',
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
    getUserPangkatByID: async (req, res) => {
        try {
            // Mengambil user_id dari user yang sedang login
            const userId = req.user?.user_akun_id;
    
            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: 'User ID tidak tersedia'
                });
            }
    
            const whereCondition = { 
                id: req.params.id, 
                user_id: userId,
                deletedAt: null 
            };
    
            // Mencari data User_kepangkatan dengan kondisi where
            let userGet = await User_kepangkatan.findOne({
                where: whereCondition,
            });
    
            // Cek apakah data ditemukan
            if (!userGet) {
                return res.status(404).json(response(404, 'user data kepangkatan not found'));
            }
    
            // Kirimkan response sukses dengan data User_kepangkatan
            res.status(200).json(response(200, 'success get user kepangkatan by id', userGet));
        } catch (err) {
            // Menangani error server
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //create data user pangkat
    //dari user jika sudah memiliki akun
    createUserPangkat: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            // Mengambil user_akun_id dari req.user
            const userId = req.user?.user_akun_id;
    
            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: 'User ID tidak tersedia'
                });
            }
    
            // Mengambil array dari body request
            const userPangkats = req.body;
    
            if (!Array.isArray(userPangkats) || userPangkats.length === 0) {
                return res.status(400).json({
                    status: 400,
                    message: 'Input harus berupa array dan tidak boleh kosong'
                });
            }
    
            // Schema untuk validasi setiap objek di dalam array
            const schema = {
                pangkat_id: { type: "string", min: 1, optional: true },
                tmt: { type: "string" },
                no_sk_pangkat: { type: "string", optional: true },
                tgl_sk_pangkat: { type: "date", convert: true }
            };
    
            // Array untuk menyimpan hasil dari proses create
            const createdPangkats = [];
    
            // Proses setiap item dalam array userPangkats
            for (let userPangkat of userPangkats) {
                // Masukkan user_id dari req.user ke dalam setiap objek user pangkat
                userPangkat.user_id = userId;
    
                // Validasi setiap objek dalam array
                const validate = v.validate(userPangkat, schema);
                if (validate.length > 0) {
                    const errorMessages = validate.map(error => {
                        if (error.type === 'stringMin') {
                            return `Field ${error.field} minimal ${error.expected} karakter`;
                        } else if (error.type === 'date') {
                            return `Field ${error.field} harus berupa tanggal yang valid`;
                        } else {
                            return `Field ${error.field} tidak valid`;
                        }
                    });
    
                    return res.status(400).json({
                        status: 400,
                        message: `Error untuk kepangkatan ${userPangkat.no_sk_pangkat}: ${errorMessages.join(', ')}`
                    });
                }
                let userpangkatCreate = await User_kepangkatan.create(userPangkat);
                createdPangkats.push(userpangkatCreate);
            }
    
            // Commit transaksi jika semua data berhasil disimpan
            await transaction.commit();
            res.status(200).json({
                status: 200,
                message: 'User kepangkatan created successfully',
                data: createdPangkats
            });
    
        } catch (err) {
            await transaction.rollback();
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

    //update data person
    //user update sendiri
    updateUserPangkat: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            // Mengambil user_id dari user yang sedang login
            const userId = req.user?.user_akun_id;
    
            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: 'User ID tidak tersedia'
                });
            }
    
            // Mengambil id kepangkatan dari parameter URL
            const kepangkatanId = req.params.id;
    
            // Cek apakah data kepangkatan ada
            let userKepangkatan = await User_kepangkatan.findOne({
                where: {
                    id: kepangkatanId,
                    user_id: userId,
                    deletedAt: null 
                }
            });
    
            if (!userKepangkatan) {
                return res.status(404).json({
                    status: 404,
                    message: 'User kepangkatan tidak ditemukan'
                });
            }
    
            // Membuat schema untuk validasi input
            const schema = {
                pangkat_id: { type: "string", optional: true },
                tmt: { type: "string", optional: true },
                no_sk_pangkat: { type: "string", optional: true },
                tgl_sk_pangkat: { type: "date", convert: true }
            };
    
            // Validasi input dari request body
            const validate = v.validate(req.body, schema);
            if (validate.length > 0) {
                const errorMessages = validate.map(error => {
                    if (error.type === 'stringMin') {
                        return `Field ${error.field} minimal ${error.expected} karakter`;
                    } else if (error.type === 'date') {
                        return `Field ${error.field} harus berupa tanggal yang valid`;
                    } else {
                        return `Field ${error.field} tidak valid`;
                    }
                });
    
                return res.status(400).json({
                    status: 400,
                    message: errorMessages.join(', ')
                });
            }
    
            // Update data kepangkatan
            await User_kepangkatan.update({
                pangkat_id: req.body.pangkat_id,
                tmt: req.body.tmt,
                no_sk_pangkat: req.body.no_sk_pangkat,
                tgl_sk_pangkat: req.body.tgl_sk_pangkat
            }, {
                where: {
                    id: kepangkatanId,
                    user_id: userId
                },
                transaction
            });
    
            // Commit transaksi
            await transaction.commit();
    
            // Mengirimkan response sukses
            res.status(200).json({
                status: 200,
                message: 'User kepangkatan berhasil diupdate'
            });
    
        } catch (err) {
            // Rollback jika terjadi kesalahan
            await transaction.rollback();
            console.log(err);
            res.status(500).json({
                status: 500,
                message: 'Terjadi kesalahan pada server',
                error: err.message
            });
        }
    },

    //menghapus user berdasarkan slug
    deleteUserPangkat: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            // Mengambil user_id dari user yang sedang login
            const userId = req.user?.user_akun_id;
    
            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: 'User ID tidak tersedia'
                });
            }
    
            // Mengambil id kepangkatan dari parameter URL
            const kepangkatanId = req.params.id;
    
            // Cek apakah data kepangkatan ada
            let userKepangkatan = await User_kepangkatan.findOne({
                where: {
                    id: kepangkatanId,
                    user_id: userId,
                    deletedAt: null
                }
            });
    
            if (!userKepangkatan) {
                return res.status(404).json({
                    status: 404,
                    message: 'User kepangkatan tidak ditemukan'
                });
            }
    
            // Soft delete data kepangkatan
            await User_kepangkatan.destroy({
                where: {
                    id: kepangkatanId,
                    user_id: userId
                },
                transaction
            });
    
            // Commit transaksi
            await transaction.commit();
    
            // Mengirimkan response sukses
            res.status(200).json({
                status: 200,
                message: 'User pangkat berhasil dihapus'
            });
    
        } catch (err) {
            // Rollback jika terjadi kesalahan
            await transaction.rollback();
            console.log(err);
            res.status(500).json({
                status: 500,
                message: 'Terjadi kesalahan pada server',
                error: err.message
            });
        }
    }

}