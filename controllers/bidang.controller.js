const { response } = require('../helpers/response.formatter');

const { Bidang, Layanan, sequelize } = require('../models');

const slugify = require('slugify');
const Validator = require("fastest-validator");
const v = new Validator();
const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');
const moment = require('moment-timezone');
const { generatePagination } = require('../pagination/pagination');
const { Op, Sequelize } = require('sequelize');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    useAccelerateEndpoint: true
});

module.exports = {

    //membuat bidang
    createBidang: async (req, res) => {
        try {
            const schema = {
                nama: { type: "string" },
                desc: { type: "string", optional: true },
                pj: { type: "string", optional: true },
                nip_pj: { type: "string", optional: true }
            }
            let bidangCreateObj = {
                nama: req.body.nama,
                slug: req.body.nama ? slugify(req.body.nama, { lower: true }) : undefined,
                desc: req.body.desc,
                pj: req.body.pj,
                nip_pj: req.body.nip_pj,
            }
            //validasi
            const validate = v.validate(bidangCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }
            let dataGets = await Bidang.findOne({
                where: {
                    slug: bidangCreateObj.slug
                }
            }
            );
            if (dataGets) {
                res.status(409).json(response(409, 'slug already registered'));
                return;
            }

            //buat bidang
            let bidangCreate = await Bidang.create(bidangCreateObj);
            res.status(201).json(response(201, 'success create bidang', bidangCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua data bidang
    getBidang: async (req, res) => {
        try {
            let { search } = req.query;
            const showDeleted = req.query.showDeleted ?? null;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let bidangGets;
            let totalCount;

            const whereCondition = {};

            if (data?.role === "Admin Instansi" || data?.role === "Super Admin" || data?.role === "Bupati" || data?.role === "Admin Verifikasi") {
            } else {
                whereCondition.status = true;
            }
            let includeOptions = [];
            let isrequired = false
            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }
            if (search) {
                whereCondition[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    {
                        [Op.and]: Sequelize.literal(`
                            EXISTS (
                                SELECT 1 
                                FROM "Layanans" 
                                WHERE "Layanans"."bidang_id" = "Bidang"."id" 
                                AND "Layanans"."name" ILIKE '%${search}%'
                            )
                        `)
                    }
                ];
            }

            [bidangGets, totalCount] = await Promise.all([
                Bidang.findAll({
                    where: whereCondition,
                    include: [
                        {
                            model: Layanan,
                            as: 'Layanans',
                            attributes: ['id', 'nama'],
                            where: {
                                // status: true,
                                deletedAt: null
                            },
                            include: includeOptions,
                            required: isrequired
                        }
                    ],
                    offset: offset,
                    limit: limit,
                    order: [
                        ['DESC'],
                        ['id', 'ASC']
                    ],
                }),
                Bidang.count({
                    where: whereCondition,
                    include: [
                        {
                            model: Layanan,
                            as: 'Layanans',
                            attributes: [],
                            where: {
                                // status: true,
                                deletedAt: null
                            },
                            include: includeOptions,
                            required: isrequired
                        }
                    ],
                    distinct: true
                })
            ]);

            const formattedBidangGets = bidangGets.map(bidang => {
                const { id, nama, slug, desc, pj, nip_pj, createdAt, updatedAt, deletedAt } = bidang.toJSON();
                const jmlLayanan = bidang.Layanans.length;
                return {
                    id, nama, slug, desc, pj, nip_pj, createdAt, updatedAt, deletedAt, jmlLayanan
                };
            });

            const pagination = generatePagination(totalCount, page, limit, '/api/user/bidang/get');

            res.status(200).json({
                status: 200,
                message: 'success get bidang',
                data: formattedBidangGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan data bidang berdasarkan slug
     getBidangBySlug: async (req, res) => {
        try {
            const showDeleted = req.query.showDeleted ?? null;
            const whereCondition = { slug: req.params.slug };

            if (showDeleted !== null) {
                whereCondition.deletedAt = { [Op.not]: null };
            } else {
                whereCondition.deletedAt = null;
            }

            if (data?.role === "Admin Instansi" || data?.role === "Super Admin" || data?.role === "Bupati" || data?.role === "Admin Verifikasi") {
            } else {
                whereCondition.status = true;
            }

            let bidangGet = await Bidang.findOne({
                where: whereCondition,
                include: [
                    {
                        model: Layanan,
                        as: 'Layanans',
                        attributes: ['id', 'nama', 'desc', 'syarat'],
                        where: {
                            deletedAt: null
                        },
                        required: false
                    },
                ]
            });

            //cek jika bidang tidak ada
            if (!bidangGet) {
                res.status(404).json(response(404, 'bidang not found'));
                return;
            }

            const { id, nama, slug, desc, pj, nip_pj, createdAt, updatedAt, deletedAt, Layanans } = bidangGet.toJSON();
            const jml_layanan = Layanans.length;

            const formattedBidangGets = {
                id, nama, slug, desc, pj, nip_pj, createdAt, updatedAt, deletedAt, jml_layanan, Layanans
            };

            res.status(200).json(response(200, 'success get bidang by slug', formattedBidangGets));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate bidang berdasarkan slug
    updateBidang: async (req, res) => {
        try {
            let bidangGet = await Bidang.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                }
            })
            if (!bidangGet) {
                res.status(404).json(response(404, 'bidang not found'));
                return;
            }

            const schema = {
                nama: { type: "string", optional: true },
                desc: { type: "string", optional: true },
                pj: { type: "string", optional: true },
                nip_pj: { type: "string", optional: true },
            }

            let bidangUpdateObj = {
                nama: req.body.nama,
                slug: req.body.nama ? slugify(req.body.nama, { lower: true }) : undefined,
                desc: req.body.desc,
                pj: req.body.pj,
                nip_pj: req.body.nip_pj,
            }

            //validasi
            const validate = v.validate(bidangUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            await Bidang.update(bidangUpdateObj, {
                where: {
                    slug: req.params.slug,
                }
            })

            //mendapatkan data bidang setelah update
            let bidangAfterUpdate = await Bidang.findOne({
                where: {
                    slug: req.params.slug,
                }
            })
            res.status(200).json(response(200, 'success update bidang', bidangAfterUpdate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //delete bidang
    deleteBidang: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            let bidangGet = await Bidang.findOne({
                where: {
                    slug: req.params.slug,
                    deletedAt: null
                },
                transaction
            });
            if (!bidangGet) {
                await transaction.rollback();
                res.status(404).json(response(404, 'bidang not found'));
                return;
            }

            const models = Object.keys(sequelize.models);

            const updatePromises = [];

            models.forEach(async modelName => {
                const Model = sequelize.models[modelName];
                if (Model.associations && Model.associations.Instansi && Model.rawAttributes.deletedAt) {
                    updatePromises.push(
                        Model.update({ deletedAt: new Date() }, {
                            where: {
                                bidang_id: bidangGet.id
                            },
                            transaction
                        })
                    );
                }
            });

            // Jalankan semua promise update secara bersamaan
            await Promise.all(updatePromises);

            await Bidang.update({ deletedAt: new Date() }, {
                where: {
                    slug: req.params.slug
                },
                transaction
            });

            await transaction.commit();

            res.status(200).json(response(200, 'success delete bidang'));

        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },


}