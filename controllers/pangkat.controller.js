const { response } = require("../helpers/response.formatter");

const { Pangkat } = require("../models");
const { generatePagination } = require("../pagination/pagination");
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require("sequelize");

module.exports = {
  //get semua data pangkat
  getPangkat: async (req, res) => {
    try {
      let pangkatGets;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search ?? null;

      if (search) {
        [pangkatGets, totalCount] = await Promise.all([
          Pangkat.findAll({
            where: {
              nama: { [Op.like]: `%${search}%` },
            },
            limit: limit,
            offset: offset,
          }),
          Pangkat.count({
            where: {
              nama: { [Op.like]: `%${search}%` },
            },
          }),
        ]);
      } else {
        [pangkatGets, totalCount] = await Promise.all([
          Pangkat.findAll({
            limit: limit,
            offset: offset,
          }),
          Pangkat.count({}),
        ]);
      }

      const pagination = generatePagination(
        totalCount,
        page,
        limit,
        "/api/user/pangkat/get"
      );

      res.status(200).json({
        status: 200,
        message: "success get pangkat",
        data: pangkatGets,
        pagination: pagination,
      });
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //get data pangkat berdasarkan id
  getPangkatById: async (req, res) => {
    try {
      let pangkatGet = await Pangkat.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!pangkatGet) {
        res.status(404).json(response(404, "pangkat not found"));
        return;
      }

      res
        .status(200)
        .json(response(200, "success get pangkat by id", pangkatGet));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },
};
