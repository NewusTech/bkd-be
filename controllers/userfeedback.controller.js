const { response } = require('../helpers/response.formatter');

const { User_feedback, Layanan, User_info, sequelize, Instansi } = require('../models');
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
            const iduser = data.userId;
    
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
                userinfo_id: Number(iduser),
                layanan_id: Number(idlayanan),
                // Pastikan nilai pertanyaan berupa integer
                question_1: parseInt(req.body.question_1, 10) || null,
                question_2: parseInt(req.body.question_2, 10) || null,
                question_3: parseInt(req.body.question_3, 10) || null,
                question_4: parseInt(req.body.question_4, 10) || null,
                feedback: req.body.feedback ?? null
            };
    
            // Membuat record feedback baru
            const createdFeedback = await User_feedback.create(layananID, { transaction });
    
            // Menyimpan data input lainnya terkait survey
            const updatedDatainput = datainput.map(item => ({
                ...item,
                // surveyformnum_id: createdFeedback.id
            }));
    
            const createdUserFeedback = await Surveyforminput.bulkCreate(updatedDatainput, { transaction });
    
            await transaction.commit();
            res.status(201).json(response(201, 'Success create', createdUserFeedback));
        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.error(err);
        }
    },


}