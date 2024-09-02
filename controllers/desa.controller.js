const { response } = require('../helpers/response.formatter');

const { Desa } = require('../models');
const { generatePagination } = require('../pagination/pagination');
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require('sequelize');

module.exports = {

    //mendapatkan semua data desa
    getdesa: async (req, res) => {
        try {
            let desaGets;
            const search = req.query.search ?? null;
            const kecamatan_id = req.query.kecamatan_id ?? null;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let totalCount;

            let filter = {};

            if (search) {
                filter.name = { [Op.iLike]: `%${search}%` };
            }
    
            if (kecamatan_id) {
                filter.kecamatan_id = kecamatan_id;
            }

            [desaGets, totalCount] = await Promise.all([
                Desa.findAll({
                    where: filter,
                    limit: limit,
                    offset: offset
                }),
                Desa.count({
                    where: filter,
                })
            ]);

            const pagination = generatePagination(totalCount, page, limit, '/api/user/desa/get');

            res.status(200).json({
                status: 200,
                message: 'success get artikel',
                data: desaGets,
                pagination: pagination
            });

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan data desa berdasarkan id
    getdesaById: async (req, res) => {
        try {
            //mendapatkan data desa berdasarkan id
            let desaGet = await Desa.findOne({
                where: {
                    id: req.params.id
                },
            });

            //cek jika desa tidak ada
            if (!desaGet) {
                res.status(404).json(response(404, 'desa not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get desa by id', desaGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },
}