const { response } = require("../helpers/response.formatter");

const { Faq } = require("../models");

const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require("sequelize");

module.exports = {
  //membuat faq
  createFaq: async (req, res) => {
    try {
      const schema = {
        question: {
          type: "string",
          min: 3,
        },
        answer: {
          type: "string",
          min: 3,
          optional: true,
        },
      };

      let faqCreateObj = {
        question: req.body.question,
        answer: req.body.answer,
      };
      const validate = v.validate(faqCreateObj, schema);
      if (validate.length > 0) {
        res.status(400).json(response(400, "validation failed", validate));
        return;
      }

      let faqCreate = await Faq.create(faqCreateObj);

      res.status(201).json(response(201, "success create faq", faqCreate));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //get semua data faq
  getFaq: async (req, res) => {
    try {
      let faqGets;
      const search = req.query.search ?? null;

      if (search) {
        [faqGets] = await Promise.all([
          Faq.findAll({
            where: {
              [Op.or]: [
                { question: { [Op.like]: `%${search}%` } },
                { answer: { [Op.like]: `%${search}%` } },
              ],
            },
          }),
        ]);
      } else {
        [faqGets] = await Promise.all([Faq.findAll({})]);
      }

      res.status(200).json(response(200, "success get faq", faqGets));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //get data faq berdasarkan id
  getFaqById: async (req, res) => {
    try {
      let faqGet = await Faq.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!faqGet) {
        res.status(404).json(response(404, "faq not found"));
        return;
      }
      res.status(200).json(response(200, "success get faq by id", faqGet));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //mengupdate faq berdasarkan id
  updateFaq: async (req, res) => {
    try {
      let faqGet = await Faq.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!faqGet) {
        res.status(404).json(response(404, "faq not found"));
        return;
      }

      const oldImagePublicId = faqGet.image
        ? faqGet.image.split("/").pop().split(".")[0]
        : null;

      const schema = {
        question: {
          type: "string",
          min: 3,
          optional: true,
        },
        answer: {
          type: "string",
          min: 3,
          optional: true,
        },
      };

      let faqUpdateObj = {
        question: req.body.question,
        answer: req.body.answer,
      };

      const validate = v.validate(faqUpdateObj, schema);
      if (validate.length > 0) {
        res.status(400).json(response(400, "validation failed", validate));
        return;
      }
      await Faq.update(faqUpdateObj, {
        where: {
          id: req.params.id,
        },
      });
      let faqAfterUpdate = await Faq.findOne({
        where: {
          id: req.params.id,
        },
      });

      //response menggunakan helper response.formatter
      res.status(200).json(response(200, "success update faq", faqAfterUpdate));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //menghapus faq berdasarkan id
  deleteFaq: async (req, res) => {
    try {
      let faqGet = await Faq.findOne({
        where: {
          id: req.params.id,
        },
      });
      if (!faqGet) {
        res.status(404).json(response(404, "faq not found"));
        return;
      }

      await Faq.destroy({
        where: {
          id: req.params.id,
        },
      });

      res.status(200).json(response(200, "success delete faq"));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },
};
