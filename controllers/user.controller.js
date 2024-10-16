const { response } = require('../helpers/response.formatter');

const { User, Token, Bidang, Layanan, Role, User_info, User_jabatan, User_kepangkatan, User_pendidikan, User_penghargaan, User_pelatihan, User_kgb, User_descendant, User_spouse, User_dokumen, Kecamatan, Desa, Pangkat, User_permission, Permission, sequelize } = require('../models');
const baseConfig = require('../config/base.config');
const passwordHash = require('password-hash');
const jwt = require('jsonwebtoken');
const { generatePagination } = require('../pagination/pagination');
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const logger = require('../errorHandler/logger');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_NAME,
        pass: process.env.EMAIL_PW,
    }
});

module.exports = {

    //membuat user baru
    createUser: async (req, res) => {
        const transaction = await sequelize.transaction();
    
        try {
            // Membuat schema untuk validasi
            const schema = {
                name: { type: "string", min: 3 },
                nip: { type: "string", min: 3 },
                email: { type: "string", min: 5, max: 50, pattern: /^\S+@\S+\.\S+$/, optional: true },
                telepon: { type: "string", min: 7, max: 15, pattern: /^[0-9]+$/, optional: true },
                password: { type: "string", min: 5, max: 16 },
                role_id: { type: "number", optional: true },
                kecamatan_id: { type: "string", min: 1, optional: true },
                desa_id: { type: "string", min: 1, optional: true },
                rt: { type: "string", min: 1, optional: true },
                rw: { type: "string", min: 1, optional: true },
                alamat: { type: "string", min: 3, optional: true },
            };
    
            // Validasi data input
            const validate = v.validate({
                name: req.body.name,
                nip: req.body.nip,
                password: req.body.password,
                role_id: req.body.role_id !== undefined ? Number(req.body.role_id) : undefined,
                email: req.body.email,
                telepon: req.body.telepon,
                kecamatan_id: req.body.kecamatan_id,
                desa_id: req.body.desa_id,
                rt: req.body.rt,
                rw: req.body.rw,
                alamat: req.body.alamat
            }, schema);
    
            if (validate.length > 0) {
                const errorMessages = validate.map(error => {
                    if (error.type === 'stringMin') {
                        return `${error.field} minimal ${error.expected} karakter`;
                    } else if (error.type === 'stringMax') {
                        return `${error.field} maksimal ${error.expected} karakter`;
                    } else if (error.type === 'stringPattern') {
                        return `${error.field} format tidak valid`;
                    } else {
                        return `${error.field} tidak valid`;
                    }
                });
    
                return res.status(400).json({
                    status: 400,
                    message: errorMessages.join(', ')
                });
            }
    
            // Generate slug unik
            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
            const slug = `${req.body.name}-${timestamp}`;
    
            // Membuat user baru
            let userCreateObj = {
                password: passwordHash.generate(req.body.password),
                role_id: req.body.role_id !== undefined ? Number(req.body.role_id) : undefined,
                bidang_id: req.body.bidang_id !== undefined ? Number(req.body.bidang_id) : undefined,
                slug: slug
            };
    
            // Simpan user
            let userCreate = await User.create(userCreateObj, { transaction });
    
            // Membuat object untuk create userinfo
            let userinfoCreateObj = {
                name: req.body.name,
                user_id: userCreate.id, // Referensi ke user yang baru dibuat
                nip: req.body.nip,
                email: req.body.email,
                telepon: req.body.telepon,
                kecamatan_id: req.body.kecamatan_id,
                desa_id: req.body.desa_id,
                rt: req.body.rt,
                rw: req.body.rw,
                alamat: req.body.alamat,
                slug: slug
            };
    
            // Membuat entri baru di tabel userinfo
            let userinfoCreate = await User_info.create(userinfoCreateObj, { transaction });

            let userUpdateObj = {
                userinfo_id: userinfoCreate.id, // menggunakan userinfoCreate.id, bukan userCreate.id
            };
            
            await User.update(userUpdateObj, {
                where: { id: userCreate.id }, // Update berdasarkan id user yang baru dibuat
                transaction
            });
            

            // Commit transaksi jika semuanya berhasil
            await transaction.commit();
            res.status(201).json(response(201, 'user created', { user: userCreate, userinfo: userinfoCreate }));
    
        } catch (err) {
            // Rollback transaksi jika ada error
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
    
    //login user
    loginUser: async (req, res) => {
        try {
            const schema = {
                nip: {
                    type: "string",
                    min: 3,
                },
                password: {
                    type: "string",
                    min: 3,
                }
            };

            let isAdmin = req.query.admin;
            let isUser = req.query.user;
            let nip = req.body.nip;
            let password = req.body.password;

            // Validasi input
            const validate = v.validate({
                nip: nip,
                password: password,
            }, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            // Mencari data user berdasarkan nik atau email yang disimpan dalam nik
            let whereClause = {
                [Op.or]: [
                    { nip: nip },
                    // { email: email },
                    // { telepon: telepon }
                ]
            };

            const adminCondition = {};
            adminCondition.deletedAt = null;
            whereClause.deletedAt = null;

            if (isAdmin) {
                adminCondition['$User.role_id$'] = {
                    [Op.ne]: 1
                };
            }

            if (isUser) {
                adminCondition['$User.role_id$'] = {
                    [Op.eq]: 1
                };
            }

            let userinfo = await User_info.findOne({
                where: whereClause,
                attributes: ['nip', 'email', 'id', 'telepon'],
                include: [
                    {
                        model: User,
                        attributes: ['password', 'id', 'role_id', 'layanan_id', 'bidang_id'],
                        include: [
                            {
                                model: Role,
                                attributes: ['id', 'name']
                            },
                            {
                                model: Bidang,
                                attributes: ['id', 'nama']
                            },
                            {
                                model: Permission,
                                through: User_permission,
                                as: 'permissions'
                            },
                            {
                                model: Layanan,
                                attributes: ['id', 'nama', 'slug']
                            }
                        ],
                        where: adminCondition
                    },
                ],
            });

            // cek apakah user ditemukan
            if (!userinfo) {
                res.status(404).json(response(404, 'User not found'));
                return;
            }

            // check password
            if (!passwordHash.verify(password, userinfo.User.password)) {
                res.status(403).json(response(403, 'password wrong'));
                return;
            }

            // membuat token jwt
            let token = jwt.sign({
                userId: userinfo.id,
                user_akun_id: userinfo.User.id,
                nip: userinfo.nip,
                role: userinfo.User.Role.name,
                bidang: userinfo?.User?.Bidang?.nama ?? undefined,
                bidang_id: userinfo?.User?.Bidang?.id ?? undefined,
                layanan: userinfo?.User?.Layanan?.nama ?? undefined,
                layanan_id: userinfo?.User?.Layanan?.id ?? undefined,
                layanan_slug: userinfo?.User?.Layanan?.slug ?? undefined,
                // permissions: userinfo?.User?.permissions,
                permission: userinfo.User.permissions.map(permission => permission.name)
            }, baseConfig.auth_secret, { // auth secret
                expiresIn: 864000 // expired 24 jam
            });

            res.status(200).json(response(200, 'login success', { token: token }));

        } catch (err) {

            logger.error(`Error : ${err}`);
            logger.error(`Error message: ${err.message}`);
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //logout user
    logoutUser: async (req, res) => {
        try {
            let token = req.headers.authorization.split(' ')[1];

            let tokenInsert = await Token.create({
                token: token
            });
            res.status(200).json(response(200, 'logout success', tokenInsert));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //get all data user
    getUser: async (req, res) => {
        try {
            const showDeleted = req.query.showDeleted ?? null;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let userGets;
            let totalCount;

            const whereCondition = {};

            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            [userGets, totalCount] = await Promise.all([
                User.findAll({
                    include: [
                        {
                            model: Role,
                            attributes: ['name', 'id'],
                            as: 'Role'
                        },
                        {
                            model: User_info,
                            as: 'User_info',
                        },
                    ],
                    limit: limit,
                    offset: offset,
                    attributes: { exclude: ['Role', 'User_info'] },
                    order: [['id', 'ASC']],
                    where: whereCondition,
                }),
                User.count({
                    where: whereCondition
                })
            ]);

            let formattedUsers = userGets.map(user => {
                return {
                    id: user.id,
                    slug: user.slug,
                    nama: user.User_info?.nama,
                    nip: user.User_info?.nip,
                    role_id: user.Role?.id,
                    role_name: user.Role?.name,
                    nik: user.User_info?.nik,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                };
            });

            const pagination = generatePagination(totalCount, page, limit, '/api/user/get');

            res.status(200).json({
                status: 200,
                message: 'success get',
                data: formattedUsers,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //get data user berdasarkan slug
    getUserBySlug: async (req, res) => {
        try {
            const showDeleted = req.query.showDeleted ?? null;
            const whereCondition = { slug: req.params.slug };

            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            let userGet = await User.findOne({
                where: whereCondition,
                include: [
                    {
                        model: Role,
                        attributes: ['name', 'id'],
                        as: 'Role'
                    },
                    {
                        model: User_info,
                        as: 'Userinfo'
                    },
                ],
                attributes: { exclude: ['Role', 'Userinfo'] }
            });

            //cek jika user tidak ada
            if (!userGet) {
                res.status(404).json(response(404, 'user not found'));
                return;
            }

            let formattedUsers = {
                id: userGet.id,
                nama: userGet.User_info?.nama,
                nik: userGet.User_info?.nik,
                role_id: userGet.Role?.id,
                role_name: userGet.Role?.name,
                createdAt: userGet.createdAt,
                updatedAt: userGet.updatedAt
            };

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get user by id', formattedUsers));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    getForUser: async (req, res) => {
        try {
            const showDeleted = req.query.showDeleted ?? null;
            // Menggunakan req.user untuk mendapatkan user_akun_id
            const userId = req.user?.user_akun_id;

            if (!userId) {
                return res.status(400).json(response(400, 'Bad Request: User ID is not available'));
            }
    
            const whereCondition = { id: userId };
    
            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }
    
            let userGet = await User.findOne({
                where: whereCondition,
                include: [
                    {
                        model: Bidang,
                        attributes: ['nama', 'id'],
                        as: 'Bidang'
                    },
                    {
                        model: Role,
                        attributes: ['name', 'id'],
                        as: 'Role'
                    },
                    {
                        model: User_info,
                        as: 'User_info',
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
                            }
                        ]
                    },
                ],
                attributes: { exclude: ['Bidang', 'Role', 'Userinfo'] }
            });
    
            if (!userGet) {
                return res.status(404).json(response(404, 'user not found'));
            }

            const userJabatans = await User_jabatan.findAll({
                where: { user_id: userId }
            });
            const userPangkats = await User_kepangkatan.findAll({
                where: { user_id: userId },
                include: [
                    {
                        model: Pangkat, // Include model Pangkat
                        attributes: ['nama'], // Ambil kolom nama dari tabel Pangkat
                        as: 'Pangkat' // Alias sesuai dengan yang didefinisikan di relasi
                    }
                ]
            });
            const userPendidikans = await User_pendidikan.findAll({
                where: { user_id: userId }
            });
            const userKgbs = await User_kgb.findAll({
                where: { user_id: userId }
            });
            const userPenghargaans = await User_penghargaan.findAll({
                where: { user_id: userId }
            });
            const userPelatihans = await User_pelatihan.findAll({
                where: { user_id: userId }
            });
            const userSpouses = await User_spouse.findAll({
                where: { user_id: userId }
            });
            const userChildrens = await User_descendant.findAll({
                where: { user_id: userId }
            });
            const userDokumens = await User_dokumen.findOne({
                where: { user_id: userId }
            });


        // Format data jabatan untuk user (jika ada banyak jabatan)
            const formattedJabatans = userJabatans.map(jabatan => ({
                id: jabatan.id,
                nama_jabatan: jabatan.nama_jabatan,
                tmt: jabatan.tmt,
                no_sk_pangkat: jabatan.no_sk_pangkat,
                tgl_sk_pangkat: jabatan.tgl_sk_pangkat,
                createdAt: jabatan.createdAt,
                updatedAt: jabatan.updatedAt
            }));
    
        // Format data pangkat untuk user (jika ada banyak kepangakatan)
        const formattedPangkats = userPangkats.map(pangkat => ({
            id: pangkat.id,
            pangkat_id: pangkat.pangkat_id,
            nama_pangkat: pangkat.Pangkat ? pangkat.Pangkat.nama : null,
            tmt: pangkat.tmt,
            no_sk_pangkat: pangkat.no_sk_pangkat,
            tgl_sk_pangkat: pangkat.tgl_sk_pangkat,
        }));

        // Format data pendidikan untuk user (jika ada banyak pendidikan)
        const formattedPendidikans = userPendidikans.map(pendidikan => ({
            id: pendidikan.id,
            tingkat_pendidikan: pendidikan.tingkat_pendidikan,
            program_study: pendidikan.program_study,
            institut: pendidikan.institut,
            no_ijazah: pendidikan.no_ijazah,
            tgl_ijazah: pendidikan.tgl_ijazah
        }));

        const formattedKgbs = userKgbs.map(kgb => ({
            id: kgb.id,
            uraian_berkala: kgb.uraian_berkala,
            tmt: kgb.tmt,
            no_sk_pangkat: kgb.no_sk_pangkat,
            tgl_sk_pangkat: kgb.tgl_sk_pangkat,
        }));

        const formattedPenghargaans = userPenghargaans.map(penghargaan => ({
            id: penghargaan.id,
            uraian_penghargaan: penghargaan.uraian_penghargaan,
            tanggal_penghargaan: penghargaan.tanggal_penghargaan,
            instansi_penghargaan: penghargaan.instansi_penghargaan,
        }));

        const formattedPelatihans = userPelatihans.map(pelatihan => ({
            id: pelatihan.id,
            uraian_pelatihan: pelatihan.uraian_pelatihan,
            lama_pelatihan: pelatihan.lama_pelatihan,
            no_surat_pelatihan: pelatihan.no_surat_pelatihan,
            tanggal_pelatihan: pelatihan.tanggal_pelatihan,
            tempat_pelatihan: pelatihan.tempat_pelatihan,
        }));

        const formattedSposes = userSpouses.map(spouse => ({
            id: spouse.id,
            nama: spouse.nama,
            tempat_lahir: spouse.tempat_lahir,
            tanggal_lahir: spouse.tanggal_lahir,
            tanggal_pernikahan: spouse.tanggal_pernikahan,
            pekerjaan: spouse.pekerjaan,
            status: spouse.status,
        }));

        const formattedChildrens = userChildrens.map(children => ({
            id: children.id,
            nama: children.nama,
            tempat_lahir: children.tempat_lahir,
            tanggal_lahir: children.tanggal_lahir,
            jenis_kelamin: children.jenis_kelamin,
            pekerjaan: children.pekerjaan,
            status: children.status,
        }));

        const formattedDokumen = userDokumens ? {
            id: userDokumens.id,
            sk_80: userDokumens.sk_80,
            sk_100: userDokumens.sk_100,
            ktp: userDokumens.ktp,
            kk: userDokumens.kk,
            kartu_pegawai: userDokumens.kartu_pegawai,
            npwp: userDokumens.npwp,
        } : null;
    
            let formattedUsers = {
                id: userGet.id,
                name: userGet.User_info?.name,
                slug: userGet.User_info?.slug,
                nip: userGet.User_info?.nip,
                nik: userGet.User_info?.nik,
                email: userGet.User_info?.email,
                telepon: userGet.User_info?.telepon,
                kecamatan_id: userGet.User_info?.Kecamatan?.id,
                kecamatan_nama: userGet.User_info?.Kecamatan?.nama,
                desa_id: userGet.User_info?.Desa?.id,
                desa_nama: userGet.User_info?.Desa?.nama,
                rt: userGet.User_info?.rt,
                rw: userGet.User_info?.rw,
                alamat: userGet.User_info?.alamat,
                agama: userGet.User_info?.agama,
                tempat_lahir: userGet.User_info?.tempat_lahir,
                tgl_lahir: userGet.User_info?.tgl_lahir,
                gender: userGet.User_info?.gender,
                goldar: userGet.User_info?.goldar,
                unit_kerja: userGet.User_info?.unit_kerja,
                image_profile: userGet.User_info?.image_profile,
                bidang_id: userGet.Bidang?.id,
                bidang_title: userGet.Bidang?.nama,
                role_id: userGet.Role?.id,
                role_name: userGet.Role?.name,

                pasangan: formattedSposes,
                anak: formattedChildrens,
                jabatans: formattedJabatans,
                pangkats: formattedPangkats,
                pendidikans: formattedPendidikans,
                kgb: formattedKgbs,
                penghargaan: formattedPenghargaans,
                pelatihan: formattedPelatihans,
                dokumen_pendukung: formattedDokumen, 
                createdAt: userGet.createdAt,
                updatedAt: userGet.updatedAt,
            };
    
            res.status(200).json(response(200, 'success get user by id', formattedUsers));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },
    
    //menghapus user berdasarkan slug
    deleteUser: async (req, res) => {
        try {
            let userGet = await User.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                }
            })
            if (!userGet) {
                res.status(404).json(response(404, 'user not found'));
                return;
            }

            await User.update({ deletedAt: new Date() }, {
                where: {
                    slug: req.params.slug
                }
            });
            res.status(200).json(response(200, 'success delete user'));

        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    changePassword: async (req, res) => {
        const slug = req.params.slug;
        const { oldPassword, newPassword, confirmNewPassword } = req.body;
    
        // Validasi input
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ status: 400, message: 'Fields are required.' });
        }
    
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ status: 400, message: 'New password doesn`t match' });
        }
    
        try {
            const user = await User.findOne({ where: { slug } });
            if (!user) {
                return res.status(404).json({ status: 404, message: 'User not found' });
            }
    
            if (!passwordHash.verify(oldPassword, user.password)) {
                return res.status(400).json({ status: 400, message: 'Old password is incorrect' });
            }
    
            user.password = passwordHash.generate(newPassword);
            await user.save();
    
            // Return response success
            return res.status(201).json({ status: 201, message: 'Password has been updated.' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ status: 500, message: 'Internal server error.' });
        }
    },
    

    forgotPassword: async (req, res) => {
        const { email } = req.body;

        try {
            const user = await User.findOne({
                include: [
                    {
                        model: User_info,
                        attributes: ['email', 'name'],
                        where: { email },
                    }
                ]
            },);

            if (!user) {
                return res.status(404).json({ message: 'Email tidak terdaftar.' });
            }

            console.log("aaaaaaa", user?.User_info?.email)
            const token = crypto.randomBytes(20).toString('hex');
            const resetpasswordexpires = Date.now() + 3600000;

            user.resetpasswordtoken = token;
            user.resetpasswordexpires = resetpasswordexpires;

            await user.save();

            const mailOptions = {
                to: user?.User_info?.email,
                from: process.env.EMAIL_NAME,
                subject: 'Password Reset',
                text: `Halo ${user?.User_info?.name},\n\n
                Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.
                Untuk mengatur ulang kata sandi, silakan klik tautan berikut atau salin dan tempelkan ke browser Anda:\n
                ${process.env.WEBSITE_URL}/${token}\n\n
                Jika Anda tidak merasa meminta pengaturan ulang kata sandi ini, abaikan email ini. Kata sandi akun Anda tidak akan berubah.\n\n
                Terima kasih.`
            };

            transporter.sendMail(mailOptions, (err) => {
                if (err) {
                    console.error('There was an error: ', err);
                    return res.status(500).json({ message: `${process.env.EMAIL_NAME} ${process.env.EMAIL_PW}Error sending the email.  ${err}` });
                }
                res.status(200).json({ message: 'Email telah dikirim ke dengan instruksi lebih lanjut.' });
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error.' });
        }
    },

    resetPassword: async (req, res) => {
        const { token } = req.params;
        const { newPassword, confirmNewPassword } = req.body;

        if (!newPassword || !confirmNewPassword) {
            return res.status(400).json({ message: 'Field is required' });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: 'New password doesn`t match' });
        }

        try {
            const user = await User.findOne({
                where: {
                    resetpasswordtoken: token,
                    resetpasswordexpires: { [Op.gt]: Date.now() }
                }
            });

            if (!user) {
                return res.status(400).json({ message: 'Token is invalid or has expired.' });
            }

            user.password = passwordHash.generate(newPassword);
            user.resetpasswordtoken = null;
            user.resetpasswordexpires = null;
            await user.save();

            return res.status(200).json({ message: 'Password successfully changed' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error.' });
        }
    },
}