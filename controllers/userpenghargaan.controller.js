const { response } = require('../helpers/response.formatter');

const { User, User_penghargaan, Role, Bidang, sequelize } = require('../models');

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

    //mendapatkan semua data user penghargaan
    //UTK ADMIN NGECEK DATA PEMOHON
    getUserDataPenghargaan: async (req, res) => {
        try {
            const iduser = req.user.role === "User" ? req.user.userId : req.body.userId; 
            
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
    
            // Query untuk mendapatkan data User_penghargaan
            if (search) {
                [userGets, totalCount] = await Promise.all([
                    User_penghargaan.findAll({
                        where: {
                            [Op.or]: [
                                { nip: { [Op.like]: `%${search}%` } },
                                { name: { [Op.like]: `%${search}%` } }
                            ]
                        },
                        limit: limit,
                        offset: offset
                    }),
                    User_penghargaan.count({
                        where: {
                            [Op.or]: [
                                { nip: { [Op.like]: `%${search}%` } },
                                { name: { [Op.like]: `%${search}%` } }
                            ]
                        }
                    })
                ]);
            } else {
                [userGets, totalCount] = await Promise.all([
                    User_penghargaan.findAll({
                        where: {
                            user_id: iduser
                        },
                        limit: limit,
                        offset: offset
                    }),
                    User_penghargaan.count({
                        where: {
                            user_id: iduser
                        },
                    })
                ]);
            }
    
            // Ambil semua user IDs dari hasil userGets
            const userIds = userGets.map(user => user.user_id);
    
            // Query manual untuk mendapatkan data dari tabel User
            const users = await User.findAll({
                where: {
                    id: { [Op.in]: userIds },
                    ...userWhereClause
                },
                attributes: ['id'],
            });
    
            // Ambil semua role IDs dari hasil users
            const roleIds = users.map(user => user.role_id);
    
            // Query manual untuk mendapatkan data dari tabel Role
            const roles = await Role.findAll({
                where: {
                    id: { [Op.in]: roleIds }
                },
                attributes: ['id', 'name']
            });
    
            // Ambil semua bidang IDs dari hasil users
            const bidangIds = users.map(user => user.bidang_id);
    
            // Query manual untuk mendapatkan data dari tabel Bidang
            const bidangData = await Bidang.findAll({
                where: {
                    id: { [Op.in]: bidangIds }
                },
                attributes: ['id', 'nama']
            });
    
            // Format hasil dengan menggabungkan data dari tabel User, Role, dan Bidang
            const formattedData = userGets.map(user => {
                const relatedUser = users.find(u => u.id === user.user_id);
                const relatedRole = roles.find(r => r.id === relatedUser?.role_id);
                const relatedBidang = bidangData.find(b => b.id === relatedUser?.bidang_id);
    
                return {
                    id: user.id,
                    user_id: user?.user_id,
                    uraian_penghargaan: user.uraian_penghargaan,
                    tanggal_penghargaan: user.tanggal_penghargaan,
                    instansi_penghargaan: user.instansi_penghargaan,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    Role: relatedRole ? relatedRole.name : null,
                    Bidang: relatedBidang ? relatedBidang.nama : null
                };
            });
    
            // Membuat pagination
            const pagination = generatePagination(totalCount, page, limit, '/api/user/kepangkatan/get');
    
            // Mengirimkan response
            res.status(200).json({
                status: 200,
                message: 'success get user penghargaan',
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

    //mendapatkan data user penghargaan berdasarkan id
    //UTK ADMIN NGECEK DATA PEMOHON
    getUserPenghargaanByID: async (req, res) => {
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
    
            // Mencari data user penghargaan dengan kondisi where
            let userGet = await User_penghargaan.findOne({
                where: whereCondition,
            });
    
            // Cek apakah data ditemukan
            if (!userGet) {
                return res.status(404).json(response(404, 'user data penghargaan not found'));
            }
    
            // Kirimkan response sukses dengan data User penghargaan
            res.status(200).json(response(200, 'success get user penghargaan by id', userGet));
        } catch (err) {
            // Menangani error server
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //create data person
    //dari sisi user untuk update data penghargaan
    createUserPenghargaan: async (req, res) => {
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
            const userPenghargaans = req.body;
    
            if (!Array.isArray(userPenghargaans) || userPenghargaans.length === 0) {
                return res.status(400).json({
                    status: 400,
                    message: 'Input harus berupa array dan tidak boleh kosong'
                });
            }
    
            // Schema untuk validasi setiap objek di dalam array
            const schema = {
                uraian_penghargaan: { type: "string" },
                tanggal_penghargaan: { type: "string" },
                instansi_penghargaan: { type: "string", optional: true },
            };
    
            // Array untuk menyimpan hasil dari proses create
            const createdPenghargaans = [];
    
            // Proses setiap item dalam array user penghargaan
            for (let userPenghargaan of userPenghargaans) {
                // Masukkan user_id dari req.user ke dalam setiap objek penghargaan
                userPenghargaan.user_id = userId;
    
                // Validasi setiap objek dalam array
                const validate = v.validate(userPenghargaan, schema);
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
                        message: `Error untuk penghargaan ${userPenghargaan.uraian_penghargaan}: ${errorMessages.join(', ')}`
                    });
                }
                let userpenghargaanCreate = await User_penghargaan.create(userPenghargaan);
                createdPenghargaans.push(userpenghargaanCreate);
            }
    
            // Commit transaksi jika semua data berhasil disimpan
            await transaction.commit();
            res.status(200).json({
                status: 200,
                message: 'User penghargaan created successfully',
                data: createdPenghargaans
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
    updateUserPenghargaan: async (req, res) => {
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
    
            // Mengambil id penghargaan dari parameter URL
            const penghargaanId = req.params.id;
    
            // Cek apakah data penghargaan ada
            let userPenghargaan = await User_penghargaan.findOne({
                where: {
                    id: penghargaanId,
                    user_id: userId,
                    deletedAt: null 
                }
            });
    
            if (!userPenghargaan) {
                return res.status(404).json({
                    status: 404,
                    message: 'User data penghargaan tidak ditemukan'
                });
            }
    
            // Membuat schema untuk validasi input
            const schema = {
                uraian_penghargaan: { type: "string" },
                tanggal_penghargaan: { type: "string" },
                instansi_penghargaan: { type: "string", optional: true },
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
    
            // Update data penghargaan
            await User_penghargaan.update({
                uraian_penghargaan: req.body.uraian_penghargaan,
                tanggal_penghargaan: req.body.tanggal_penghargaan,
                instansi_penghargaan: req.body.instansi_penghargaan,
            }, {
                where: {
                    id: penghargaanId,
                    user_id: userId
                },
                transaction
            });
    
            // Commit transaksi
            await transaction.commit();
    
            // Mengirimkan response sukses
            res.status(200).json({
                status: 200,
                message: 'User data penghargaan berhasil diupdate'
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
    deleteUserPenghargaan: async (req, res) => {
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
    
            // Mengambil id penghargaan dari parameter URL
            const penghargaanId = req.params.id;
    
            // Cek apakah data penghargaan ada
            let userPenghargaan = await User_penghargaan.findOne({
                where: {
                    id: penghargaanId,
                    user_id: userId,
                    deletedAt: null
                }
            });
    
            if (!userPenghargaan) {
                return res.status(404).json({
                    status: 404,
                    message: 'User data Penghargaan tidak ditemukan'
                });
            }
    
            // Soft delete data Penghargaan
            await User_penghargaan.destroy({
                where: {
                    id: penghargaanId,
                    user_id: userId
                },
                transaction
            });
    
            // Commit transaksi
            await transaction.commit();
    
            // Mengirimkan response sukses
            res.status(200).json({
                status: 200,
                message: 'User data penghargaan berhasil dihapus'
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

}