const { response } = require('../helpers/response.formatter');

const { User_feedback, Layanan, User_info, sequelize, Bidang } = require('../models');
require('dotenv').config()
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const puppeteer = require('puppeteer');
const { generatePagination } = require('../pagination/pagination');


module.exports = {

    //input feedback user
    createFeedback: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const idlayanan = req.params.idlayanan;
            const iduser = req.user.userId;
    
            // Pastikan ID user ada
            if (!iduser) {
                throw new Error('User ID is required');
            }
    
            const { datainput } = req.body;
    
            // Cek apakah layanan ID valid
            let dataLayanan = await Layanan.findOne({
                where: {
                    id: idlayanan
                },
                include: [
                    {
                        model: Bidang,
                        attributes: ['nama']
                    },
                ],
                attributes: ['id'],
            });
    
            if (!dataLayanan) {
                throw new Error('Layanan not found');
            }
    
            // Menghitung jumlah feedback yang sudah ada untuk layanan tersebut
            const count = await User_feedback.count({
                where: {
                    layanan_id: idlayanan
                }
            });
    
            // Memasukkan nilai feedback dari pengguna
            let layananID = {
                userinfo_id: Number(iduser), // Get id user dari token
                layanan_id: Number(idlayanan),
                question_1: req.body.question_1 ?? null,
                question_2: req.body.question_2 ?? null,
                question_3: req.body.question_3 ?? null,
                question_4: req.body.question_4 ?? null,
                feedback: req.body.feedback ?? null
            };
    
            // Membuat feedback baru
            const createdFeedback = await User_feedback.create(layananID, { transaction });
    
    
            await transaction.commit();
            res.status(201).json(response(201, 'Success create', createdFeedback));
        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.error(err);
        }
    },
    
    getHistoryByBidang: async (req, res) => {
        try {
            const bidang_id = Number(req.query.bidang_id);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const start_date = req.query.start_date;
            const end_date = req.query.end_date;
            let history;
            let totalCount;
    
            const WhereClause = {};
            if (bidang_id) {
                WhereClause.bidang_id = bidang_id;
            }
            if (start_date && end_date) {
                WhereClause.createdAt = {
                    [Op.between]: [moment(start_date).startOf('day').toDate(), moment(end_date).endOf('day').toDate()]
                };
            } else if (start_date) {
                WhereClause.createdAt = {
                    [Op.gte]: moment(start_date).startOf('day').toDate()
                };
            } else if (end_date) {
                WhereClause.createdAt = {
                    [Op.lte]: moment(end_date).endOf('day').toDate()
                };
            }
    
            [history, totalCount] = await Promise.all([
                Layanan.findAll({
                    include: [{
                        model: User_feedback, // Hanya satu kali include
                        // Kamu bisa menambahkan asosiasi lain jika perlu, tetapi tidak melibatkan User_feedback lagi
                    }],
                    where: WhereClause,
                    limit: limit,
                    offset: offset,
                    // order: [['id', 'DESC']]
                }),
                Layanan.count({
                    where: WhereClause,
                })
            ]);
    
            const pagination = generatePagination(totalCount, page, limit, `/api/user/historysurvey`);
    
            res.status(200).json({
                status: 200,
                message: 'success get',
                data: history,
                pagination: pagination
            });
    
        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },
    


}