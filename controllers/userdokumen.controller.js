const { response } = require('../helpers/response.formatter');

const { User, User_dokumen, Role, Bidang, sequelize } = require('../models');

const passwordHash = require('password-hash');
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require('sequelize');
const { generatePagination } = require('../pagination/pagination');

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const Redis = require("ioredis");
const { kk } = require('date-fns/locale');
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

    //mendapatkan semua data user dokumen
    //UTK ADMIN NGECEK DATA PEMOHON
    getUserDataDokumen: async (req, res) => {
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
    
            // Query untuk mendapatkan data User_dokumen
            if (search) {
                [userGets, totalCount] = await Promise.all([
                    User_dokumen.findAll({
                        where: {
                            [Op.or]: [
                                { nip: { [Op.like]: `%${search}%` } },
                                { name: { [Op.like]: `%${search}%` } }
                            ]
                        },
                        limit: limit,
                        offset: offset
                    }),
                    User_dokumen.count({
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
                    User_dokumen.findAll({
                        limit: limit,
                        offset: offset
                    }),
                    User_dokumen.count()
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
                    sk_80: user.sk_80,
                    sk_100: user.sk_100,
                    kartu_pegawai: user.kartu_pegawai,
                    ktp: user.ktp,
                    kk: user.kk,
                    npwp: user.npwp,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    // Role: relatedRole ? relatedRole.name : null,
                    // Bidang: relatedBidang ? relatedBidang.nama : null
                };
            });
    
            // Jika hanya ingin mengambil satu objek (contohnya objek pertama)
            const formattedObject = formattedData[0] || {}; // Jika tidak ada data, kembalikan objek kosong.
    
            // Membuat pagination
            const pagination = generatePagination(totalCount, page, limit, '/api/user/dokumen/get');
    
            // Mengirimkan response
            res.status(200).json({
                status: 200,
                message: 'success get user dokumen pendukung',
                data: formattedObject, // Mengirimkan objek tunggal
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
    

    //mendapatkan data user dokumen berdasarkan id
    //UTK ADMIN NGECEK DATA PEMOHON
    getUserDokumenByID: async (req, res) => {
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
    
            // Mencari data user dokumen dengan kondisi where
            let userGet = await User_dokumen.findOne({
                where: whereCondition,
            });
    
            // Cek apakah data ditemukan
            if (!userGet) {
                return res.status(404).json(response(404, 'user data dokumen not found'));
            }
    
            // Kirimkan response sukses dengan data User_kepangkatan
            res.status(200).json(response(200, 'success get user dokumen by id', userGet));
        } catch (err) {
            // Menangani error server
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //create data user dokumen
    //dari sisi user untuk update data dokumen
    createUserDokumen: async (req, res) => {
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
    
            // Schema untuk validasi input
            const schema = {
                sk_80: { type: "string", optional: true },
                sk_100: { type: "string", optional: true },
                kartu_pegawai: { type: "string", optional: true },
                ktp: { type: "string", optional: true },
                kk: { type: "string", optional: true },
                npwp: { type: "string", optional: true }
            };
    
            // Proses upload file ke S3
            const uploadToS3 = async (file) => {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${file.originalname}`;
    
                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/user_dokumen/${uniqueFileName}`,
                    Body: file.buffer,
                    ACL: 'public-read',
                    ContentType: file.mimetype
                };
    
                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
    
                return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            };
    
            let sk80Key, sk100Key, kartupegawaiKey, ktpKey, kartukeluargaKey, npwpKey;
    
            // Cek dan upload setiap file yang ada
            if (req.files?.sk_80) sk80Key = await uploadToS3(req.files.sk_80[0]);
            if (req.files?.sk_100) sk100Key = await uploadToS3(req.files.sk_100[0]);
            if (req.files?.kartu_pegawai) kartupegawaiKey = await uploadToS3(req.files.kartu_pegawai[0]);
            if (req.files?.ktp) ktpKey = await uploadToS3(req.files.ktp[0]);
            if (req.files?.kk) kartukeluargaKey = await uploadToS3(req.files.kk[0]);
            if (req.files?.npwp) npwpKey = await uploadToS3(req.files.npwp[0]);
    
            // Buat objek dokumen
            const createdUserDokumen = {
                user_id: userId,
                sk_80: sk80Key || null,
                sk_100: sk100Key || null,
                kartu_pegawai: kartupegawaiKey || null,
                ktp: ktpKey || null,
                kk: kartukeluargaKey || null,
                npwp: npwpKey || null
            };
    
            // Validasi input berdasarkan schema
            const validate = v.validate(createdUserDokumen, schema);
            if (validate.length > 0) {
                const errorMessages = validate.map(error => `Field ${error.field} tidak valid: ${error.message}`);
                return res.status(400).json({
                    status: 400,
                    message: `Error: ${errorMessages.join(', ')}`
                });
            }
    
            // Simpan ke database
            let userdokumenCreate = await User_dokumen.create(createdUserDokumen);
    
            // Commit transaksi jika data berhasil disimpan
            await transaction.commit();
            res.status(200).json({
                status: 200,
                message: 'User dokumen berhasil dibuat',
                data: userdokumenCreate
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

    //update data user dokumen
    //user update sendiri
    updateUserDokumen: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const userId = req.user?.user_akun_id;
    
            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: 'User ID tidak tersedia'
                });
            }
    
            const dokumenId = req.params.id;
    
            let userDokumen = await User_dokumen.findOne({
                where: {
                    id: dokumenId,
                    user_id: userId,
                    deletedAt: null
                },
                transaction
            });
    
            if (!userDokumen) {
                return res.status(404).json({
                    status: 404,
                    message: 'User dokumen tidak ditemukan'
                });
            }
    
            const uploadToS3 = async (file) => {
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${file.originalname}`;
                const uploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/user_dokumen/${uniqueFileName}`,
                    Body: file.buffer,
                    ACL: 'public-read',
                    ContentType: file.mimetype
                };
                const command = new PutObjectCommand(uploadParams);
                await s3Client.send(command);
    
                return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
            };
    
            let sk80Key = userDokumen.sk_80;
            let sk100Key = userDokumen.sk_100;
            let kartupegawaiKey = userDokumen.kartu_pegawai;
            let ktpKey = userDokumen.ktp;
            let kartukeluargaKey = userDokumen.kk;
            let npwpKey = userDokumen.npwp;
    
            // Cek dan upload setiap file yang ada
            if (req.files?.sk_80) sk80Key = await uploadToS3(req.files.sk_80[0]);
            if (req.files?.sk_100) sk100Key = await uploadToS3(req.files.sk_100[0]);
            if (req.files?.kartu_pegawai) kartupegawaiKey = await uploadToS3(req.files.kartu_pegawai[0]);
            if (req.files?.ktp) ktpKey = await uploadToS3(req.files.ktp[0]);
            if (req.files?.kk) kartukeluargaKey = await uploadToS3(req.files.kk[0]);
            if (req.files?.npwp) npwpKey = await uploadToS3(req.files.npwp[0]);
    
            // Buat objek dokumen baru
            const updatedUserDokumen = {
                sk_80: sk80Key || null,
                sk_100: sk100Key || null,
                kartu_pegawai: kartupegawaiKey || null,
                ktp: ktpKey || null,
                kk: kartukeluargaKey || null,
                npwp: npwpKey || null
            };
    
            // Validasi input berdasarkan schema
            const schema = {
                sk_80: { type: "string", optional: true },
                sk_100: { type: "string", optional: true },
                kartu_pegawai: { type: "string", optional: true },
                ktp: { type: "string", optional: true },
                kk: { type: "string", optional: true },
                npwp: { type: "string", optional: true }
            };
            
            const validate = v.validate(updatedUserDokumen, schema);
            if (validate.length > 0) {
                const errorMessages = validate.map(error => `Field ${error.field} tidak valid: ${error.message}`);
                return res.status(400).json({
                    status: 400,
                    message: `Error: ${errorMessages.join(', ')}`
                });
            }
    
            // Update dokumen di database
            await User_dokumen.update(updatedUserDokumen, {
                where: {
                    id: dokumenId,
                    user_id: userId
                },
                transaction
            });
    
            await transaction.commit();
            res.status(200).json({
                status: 200,
                message: 'User dokumen berhasil diupdate',
                data: updatedUserDokumen
            });
    
        } catch (err) {
            await transaction.rollback();
            res.status(500).json({
                status: 500,
                message: 'Terjadi kesalahan pada server',
                error: err.message
            });
        }
    },
    

    //menghapus user berdasarkan id
    deleteUserDokumen: async (req, res) => {
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
    
            // Mengambil id user dokumen dari parameter URL
            const dokumenId = req.params.id;
    
            // Cek apakah data dokumen ada
            let userDokumen = await User_dokumen.findOne({
                where: {
                    id: dokumenId,
                    user_id: userId,
                    deletedAt: null
                }
            });
    
            if (!userDokumen) {
                return res.status(404).json({
                    status: 404,
                    message: 'User data user dokumen tidak ditemukan'
                });
            }
    
            // Soft delete data dokumen pendukung
            await User_dokumen.destroy({
                where: {
                    id: dokumenId,
                    user_id: userId
                },
                transaction
            });
    
            // Commit transaksi
            await transaction.commit();
    
            // Mengirimkan response sukses
            res.status(200).json({
                status: 200,
                message: 'User data user dokumen berhasil dihapus'
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