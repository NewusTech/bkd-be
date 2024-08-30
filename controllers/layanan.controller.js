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
    createlayanan: async (req, res) => {
        try {
            const schema = {
                nama: { type: "string" },
                desc: { type: "string", optional: true },
                syarat: { type: "string", optional: true },
                bidang_id: { type: "number", optional: true }
            }
            let layananCreateObj = {
                nama: req.body.nama,
                slug: slugify(req.body.nama, { lower: true }),
                desc: req.body.desc,
                syarat: req.body.syarat,
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

    //mendapatkan semua data layanan
    getlayanan: async (req, res) => {
        try {
            const search = req.query.search ?? null;
            const showDeleted = req.query.showDeleted === 'true' ?? false;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let layananGets;
            let totalCount;

            const whereCondition = {};
            if (search) {
                whereCondition[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }];
            }
            if (showDeleted) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            if (data?.role === "Admin Instansi" || data?.role === "Super Admin" || data?.role === "Bupati" || data?.role === "Admin Verifikasi") {
            } else {
                whereCondition.status = true;
            }

            [layananGets, totalCount] = await Promise.all([
                Layanan.findAll({
                    where: whereCondition,
                    include: [{ model: Bidang, attributes: ['id', 'nama'] }],
                    limit: limit,
                    offset: offset,
                    order: [
                        ['DESC'],
                        ['id', 'ASC']
                    ]
                }),
                Layanan.count({
                    where: whereCondition
                })
            ]);

            const modifiedLayananGets = layananGets.map(layanan => {
                const { Bidang, ...otherData } = layanan.dataValues;
                return {
                    ...otherData,
                    Bidang_name: Bidang?.name
                };
            });

            const pagination = generatePagination(totalCount, page, limit, '/api/user/layanan/get');

            res.status(200).json({
                status: 200,
                message: 'success get layanan',
                data: modifiedLayananGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
            logger.error(`Error : ${err}`);
            logger.error(`Error message: ${err.message}`);
        }
    },

    //mendapatkan semua data layanan by bidang
    getlayananbybidang: async (req, res) => {
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

            if (data?.role === "Admin Instansi" || data?.role === "Super Admin" || data?.role === "Bupati" || data?.role === "Admin Verifikasi") {
            } else {
                whereCondition.status = true;
            }

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

    //mendapatkan data layanan berdasarkan id
    getlayananById: async (req, res) => {
        try {
            const showDeleted = req.query.showDeleted ?? null;
            const whereCondition = { id: req.params.id };

            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            if (data?.role === "Admin Instansi" || data?.role === "Super Admin" || data?.role === "Bupati" || data?.role === "Admin Verifikasi") {
            } else {
                whereCondition.status = true;
            }

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


}