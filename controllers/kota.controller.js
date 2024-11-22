const { response } = require("../helpers/response.formatter");

const { Kota } = require("../models");
const { generatePagination } = require("../pagination/pagination");
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require("sequelize");

module.exports = {
  //get semua data kota
  getkota: async (req, res) => {
    try {
      let kotaGets;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search ?? null;

      if (search) {
        [kotaGets, totalCount] = await Promise.all([
          Kota.findAll({
            where: {
              nama: { [Op.like]: `%${search}%` },
            },
            limit: limit,
            offset: offset,
          }),
          Kota.count({
            where: {
              nama: { [Op.like]: `%${search}%` },
            },
          }),
        ]);
      } else {
        [kotaGets, totalCount] = await Promise.all([
          Kota.findAll({
            limit: limit,
            offset: offset,
          }),
          Kota.count({}),
        ]);
      }

      const pagination = generatePagination(
        totalCount,
        page,
        limit,
        "/api/user/kota/get"
      );

      res.status(200).json({
        status: 200,
        message: "success get kota",
        data: kotaGets,
        pagination: pagination,
      });
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //get data kota berdasarkan id
  getkotaById: async (req, res) => {
    try {
      let kotaGet = await Kota.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!kotaGet) {
        res.status(404).json(response(404, "kota not found"));
        return;
      }

      res
        .status(200)
        .json(response(200, "success get kota by id", kotaGet));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },
};
