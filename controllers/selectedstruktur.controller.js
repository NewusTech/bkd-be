const { response } = require("../helpers/response.formatter");

const { Bkd_struktur, Selected_struktur } = require("../models");
const slugify = require("slugify");
const Validator = require("fastest-validator");
const v = new Validator();
const moment = require("moment-timezone");
const { generatePagination } = require("../pagination/pagination");
const { Op } = require("sequelize");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  useAccelerateEndpoint: true,
});

module.exports = {
  //membuat selected struktur bkd
  createSelectedStruktur: async (req, res) => {
    try {
      // Hitung jumlah data yang ada di tabel Selected_struktur
      const selectedStrukturCount = await Selected_struktur.count();

      // Jika jumlah data sudah 18, kirimkan error
      if (selectedStrukturCount >= 40) {
        return res.status(400).json({
          status: 400,
          message: "Maksimal 40 data yang diperbolehkan",
        });
      }

      let selectedstrukturCreateObj = {
        bkdstruktur_id: req.body.bkdstruktur_id,
      };

      // Buat select blog
      let selectedstrukturCreate = await Selected_struktur.create(
        selectedstrukturCreateObj
      );

      res
        .status(201)
        .json(
          response(
            201,
            "success create select selected",
            selectedstrukturCreate
          )
        );
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //mendapatkan semua data selected struktur bkd
  getSelectedStruktur: async (req, res) => {
    try {
      const selectedStruktur = await Selected_struktur.findAll({
        // where: {
        //   deletedAt: null, // Filter hanya data yang tidak dihapus (soft delete)
        // },
        include: [
          {
            model: Bkd_struktur,
            as: "struktur",
            attributes: [
              "id",
              "nama",
              "slug",
              "jabatan",
              "image",
              "createdAt",
              "updatedAt",
            ],
            // where: {
            //   deletedAt: null, // Filter di Bkd_struktur juga untuk data yang tidak dihapus
            // },
          },
        ],
      });

      const data = selectedStruktur.map((select) => {
        return {
          select_id: select.id,
          bkdstruktur_id: select.struktur.id,
          nama: select.struktur.nama,
          slug: select.struktur.slug,
          jabatan: select.struktur.jabatan,
          image: select.struktur.image,
          createdAt: select.struktur.createdAt,
          updatedAt: select.struktur.updatedAt,
        };
      });

      res.status(200).json({
        success: true,
        data: data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  //mendapatkan data selected bkd struktur berdasarkan id
  getSelectedStrukturByID: async (req, res) => {
    try {
      let selectedStruktur = await Selected_struktur.findAll({
        where: { id: req.params.id },
        include: [
          {
            model: Bkd_struktur,
            as: "struktur",
            // attributes: ['id', 'title', 'image', 'webLink'],
          },
        ],
      });

      res.status(200).json({
        success: true,
        data: selectedStruktur,
      });
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //mengupdate bkd struktur berdasarkan slug
  updateSelectedStruktur: async (req, res) => {
    try {
      // Mencari data Selected_struktur berdasarkan bkdstruktur_id
      let selectedStruktur = await Selected_struktur.findOne({
        where: { id: req.params.id },
      });

      // Jika tidak ditemukan, kirim respons not found
      if (!selectedStruktur) {
        return res
          .status(404)
          .json(response(404, "Selected struktur not found"));
      }

      // Membuat object untuk di-update
      let selectedstrukturUpdateObj = {
        bkdstruktur_id: req.body.bkdstruktur_id,
      };

      // Update data selected struktur
      await Selected_struktur.update(selectedstrukturUpdateObj, {
        where: { bkdstruktur_id: req.body.bkdstruktur_id },
      });

      // Mendapatkan data setelah update
      let updatedStruktur = await Selected_struktur.findOne({
        where: { bkdstruktur_id: req.body.bkdstruktur_id },
      });

      // Mengirimkan respons sukses
      res
        .status(200)
        .json(
          response(200, "success update selected struktur", updatedStruktur)
        );
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //menghapus selected struktur berdasarkan id
  deleteSelectedStruktur: async (req, res) => {
    try {
      const { id } = req.params;
      //mendapatkan data selected struktur untuk pengecekan
      let selectedstrukturGet = await Selected_struktur.findByPk(id);

      //cek apakah data selected struktur ada
      if (!selectedstrukturGet) {
        res.status(404).json(response(404, "selected struktur not found"));
        return;
      }

      await Selected_struktur.destroy({ where: { id } });

      res.status(200).json(response(200, "success delete selected struktur"));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },
};
