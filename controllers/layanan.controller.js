const { response } = require('../helpers/response.formatter');

const { Layanan, Bidang } = require('../models');
require('dotenv').config()

const slugify = require('slugify');
const Validator = require("fastest-validator");
const v = new Validator();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { generatePagination } = require('../pagination/pagination');
const { Op } = require('sequelize');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const logger = require('../errorHandler/logger');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    useAccelerateEndpoint: true
});

module.exports = {

    //membuat layanan
    createLayanan: async (req, res) => {
        try {
            const schema = {
                nama: { type: "string" },
                desc: { type: "string", optional: true },
                syarat: { type: "string", optional: true },
                ketentuan: { type: "string", optional: true },
                langkah: { type: "string", optional: true },
                penanggung_jawab: { type: "string", optional: true },
                bidang_id: { type: "number", optional: true }
            }
            let layananCreateObj = {
                nama: req.body.nama,
                slug: slugify(req.body.nama, { lower: true }),
                desc: req.body.desc,
                syarat: req.body.syarat,
                ketentuan: req.body.ketentuan,
                langkah: req.body.langkah,
                penanggung_jawab: req.body.penanggung_jawab,
                bidang_id: req.body.bidang_id !== undefined ? Number(req.body.bidang_id) : null,
            }
            
            //validasi
            const validate = v.validate(layananCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }
            let dataGets = await Layanan.findOne({
                where: {
                    slug: layananCreateObj.slug
                }
            }
            );
            if (dataGets) {
                res.status(409).json(response(409, 'slug already registered'));
                return;
            }

            //buat layanan
            let layananCreate = await Layanan.create(layananCreateObj);

            //response menggunakan helper response.formatter
            res.status(201).json(response(201, 'success create layanan', layananCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //get semua data layanan
    getLayanan: async (req, res) => {
        try {
            const search = req.query.search ?? null;
            const showDeleted = req.query.showDeleted === 'true' ?? false;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let layananGets;
            let totalCount;
    
            const whereCondition = {};
    
            // Tambahkan pencarian berdasarkan nama layanan
            if (search) {
                whereCondition[Op.or] = [
                    { nama: { [Op.like]: `%${search}%` } } // Menggunakan 'LIKE' untuk MySQL, gunakan 'ILIKE' untuk PostgreSQL
                ];
            }
    
            // Menampilkan data yang dihapus jika parameter showDeleted true
            if (showDeleted) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }
    
            // Query untuk mendapatkan layanan dan jumlah total layanan
            [layananGets, totalCount] = await Promise.all([
                Layanan.findAll({
                    where: whereCondition,
                    include: [{ model: Bidang, attributes: ['id', 'nama'] }],
                    limit: limit,
                    offset: offset,
                    order: [
                        ['id', 'ASC'] // Mengurutkan berdasarkan ID
                    ]
                }),
                Layanan.count({
                    where: whereCondition
                })
            ]);
    
            // Modifikasi hasil untuk mencocokkan struktur yang diinginkan
            const modifiedLayananGets = layananGets.map(layanan => {
                const { Bidang, ...otherData } = layanan.dataValues;
                return {
                    ...otherData,
                    Bidang_name: Bidang?.nama // Menampilkan nama bidang yang terkait
                };
            });
    
            // Generate pagination
            const pagination = generatePagination(totalCount, page, limit, '/api/user/layanan/get');
    
            // Kirimkan response
            res.status(200).json({
                status: 200,
                message: 'success get layanan',
                data: modifiedLayananGets,
                pagination: pagination
            });
    
        } catch (err) {
            // Tangani error
            res.status(500).json({
                status: 500,
                message: 'internal server error',
                error: err.message
            });
            console.log(err);
            logger.error(`Error : ${err}`);
            logger.error(`Error message: ${err.message}`);
        }
    },
    

    //get semua data layanan by bidang
    getLayananByBidang: async (req, res) => {
        try {
            const bidang_id = req.params.bidang_id;
            const showDeleted = req.query.showDeleted === 'true' ?? false;
            let { search } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let bidangGets;
            let layananGets;
            let totalCount;

            let includeOptions = [{ model: Bidang, attributes: ['id', 'nama'] }]

            const whereCondition = {
                bidang_id: bidang_id
            };

            // if (data?.role === "Admin Instansi" || data?.role === "Super Admin" || data?.role === "Bupati" || data?.role === "Admin Verifikasi") {
            // } else {
            //     whereCondition.status = true;
            // }

            if (search) {
                whereCondition[Op.and] = [
                    { name: { [Op.iLike]: `%${search}%` } }
                ];
            }

            if (showDeleted) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            [bidangGets, layananGets, totalCount] = await Promise.all([
                Bidang.findOne({
                    where: {
                        id: bidang_id
                    },
                }),
                Layanan.findAll({
                    where: whereCondition,
                    include: includeOptions,
                    limit: limit,
                    offset: offset,
                    order: [
                        ['DESC'],
                        ['id', 'ASC']
                    ]
                }),
                Layanan.count({
                    where: whereCondition,
                    include: includeOptions,
                    distinct: true
                })
            ]);

            const modifiedLayananGets = layananGets.map(layanan => {
                const { Bidang, ...otherData } = layanan.dataValues;
                return {
                    ...otherData,
                    Bidang_nama: Bidang?.nama
                };
            });

            const pagination = generatePagination(totalCount, page, limit, `/api/user/layanan/bidang/get/${bidang_id}`);

            res.status(200).json({
                status: 200,
                message: 'success get layanan by bidang',
                data: modifiedLayananGets,
                bidang: bidangGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //get data layanan berdasarkan id
    getLayananById: async (req, res) => {
        try {
            const showDeleted = req.query.showDeleted ?? null;
            const whereCondition = { id: req.params.id };

            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            // if (data?.role === "Admin Instansi" || data?.role === "Super Admin" || data?.role === "Bupati" || data?.role === "Admin Verifikasi") {
            // } else {
            //     whereCondition.status = true;
            // }

            let layananGet = await Layanan.findOne({
                where: whereCondition,
                include: [{ model: Bidang, attributes: ['id', 'nama'] }]
            });

            //cek jika layanan tidak ada
            if (!layananGet) {
                res.status(404).json(response(404, 'layanan not found'));
                return;
            }

            const { Bidang: bidangObj, ...otherData } = layananGet.dataValues;
            const modifiedLayananGet = {
                ...otherData,
                bidang_name: bidangObj?.nama
            };
            res.status(200).json(response(200, 'success get layanan by id', modifiedLayananGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //update layanan berdasarkan id
    updateLayanan: async (req, res) => {
        try {
            let layananGet = await Layanan.findOne({
                where: {
                    id: req.params.id,
                    deletedAt: null
                }
            })
            if (!layananGet) {
                res.status(404).json(response(404, 'layanan not found'));
                return;
            }

            const schema = {
                nama: { type: "string", optional: true },
                desc: { type: "string", optional: true },
                syarat: { type: "string", optional: true },
                ketentuan: { type: "string", optional: true },
                langkah: { type: "string", optional: true },
                penanggung_jawab: { type: "string", optional: true },
            }

            let layananUpdateObj = {
                nama: req.body.nama,
                slug: req.body.nama ? slugify(req.body.nama, { lower: true }) : undefined,
                desc: req.body.desc,
                syarat: req.body.syarat,
                ketentuan: req.body.ketentuan,
                langkah: req.body.langkah,
                penanggung_jawab: req.body.penanggung_jawab,
            }

            const validate = v.validate(layananUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //update layanan
            await Layanan.update(layananUpdateObj, {
                where: {
                    id: req.params.id,
                }
            })

            let layananAfterUpdate = await Layanan.findOne({
                where: {
                    id: req.params.id,
                }
            })
            res.status(200).json(response(200, 'success update layanan', layananAfterUpdate));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //menghapus layanan
    deleteLayanan: async (req, res) => {
        try {
            let layananGet = await Layanan.findOne({
                where: {
                    id: req.params.id,
                    deletedAt: null
                }
            })
            if (!layananGet) {
                res.status(404).json(response(404, 'layanan not found'));
                return;
            }

            await Layanan.update({ deletedAt: new Date() }, {
                where: {
                    id: req.params.id
                }
            });

            res.status(200).json(response(200, 'success delete layanan'));

        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

}