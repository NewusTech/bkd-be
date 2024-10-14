const { response } = require("../helpers/response.formatter");

const {
  User_feedback,
  Layanan,
  User_info,
  sequelize,
  Bidang,
} = require("../models");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const moment = require("moment-timezone");
const puppeteer = require("puppeteer");
const { generatePagination } = require("../pagination/pagination");

module.exports = {
  //input feedback user
  createFeedback: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const idlayanan = req.params.idlayanan;
      const iduser = req.user.userId;

      // Pastikan ID user ada
      if (!iduser) {
        throw new Error("User ID is required");
      }

      const { datainput } = req.body;

      // Cek apakah layanan ID valid dan mengambil bidang terkait
      let dataLayanan = await Layanan.findOne({
        where: {
          id: idlayanan,
        },
        include: [
          {
            model: Bidang,
            attributes: ["id", "nama"],
          },
        ],
        attributes: ["id"],
      });

      // Jika layanan tidak ditemukan
      if (!dataLayanan) {
        throw new Error("Layanan not found");
      }

      // Menghitung jumlah feedback yang sudah ada untuk layanan tersebut
      const count = await User_feedback.count({
        where: {
          layanan_id: idlayanan,
        },
      });

      // Ambil bidang_id dari data layanan
      const bidangId = dataLayanan.Bidang?.id;

      // Memasukkan nilai feedback dari pengguna, termasuk bidang_id
      let layananID = {
        userinfo_id: Number(iduser), // Get id user dari token
        layanan_id: Number(idlayanan),
        bidang_id: bidangId, // Tambahkan bidang_id ke feedback
        question_1: req.body.question_1 ?? null,
        question_2: req.body.question_2 ?? null,
        question_3: req.body.question_3 ?? null,
        question_4: req.body.question_4 ?? null,
        feedback: req.body.feedback ?? null,
      };

      // Membuat feedback baru
      const createdFeedback = await User_feedback.create(layananID, {
        transaction,
      });

      // Commit transaksi jika semua berhasil
      await transaction.commit();
      res.status(201).json(response(201, "Success create", createdFeedback));
    } catch (err) {
      // Rollback transaksi jika ada error
      await transaction.rollback();
      res.status(500).json(response(500, "Internal server error", err));
      console.error(err);
    }
  },

  getHistoryByBidang: async (req, res) => {
    try {
      const userRole = req.user.role; // Ambil role dari user yang login
      const userBidangId = req.user.bidang_id; // Ambil bidang_id dari user yang login jika ada
      const bidang_id = Number(req.query.bidang_id) || userBidangId; // Gunakan bidang_id dari query atau dari user
      const layanan_id = req.query.layanan_id ?? null;
      const search = req.query.search ?? null;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const start_date = req.query.start_date;
      const end_date = req.query.end_date;
      let history;
      let totalCount;

      const WhereClause = {};
      const WhereCondition = {};

      // Batasi data per bidang berdasarkan role user
      if (userRole === "Admin Verifikasi" || userRole === "Kepala Bidang") {
        if (userBidangId) {
          WhereClause.bidang_id = userBidangId; // Batasi data berdasarkan bidang user
        }
      } else if (bidang_id) {
        WhereClause.bidang_id = bidang_id; // Jika bidang_id diberikan di query, gunakan itu
      }

      if (layanan_id) {
        WhereClause.id = layanan_id;
      }

      if (search) {
        WhereCondition[Op.or] = [
          {
            nama: { [Op.iLike]: `%${search}%` },
          },
          {
            "$Bidang.nama$": { [Op.iLike]: `%${search}%` },
          },
        ];
      }

      if (start_date && end_date) {
        WhereClause.createdAt = {
          [Op.between]: [
            moment(start_date).startOf("day").toDate(),
            moment(end_date).endOf("day").toDate(),
          ],
        };
      } else if (start_date) {
        WhereClause.createdAt = {
          [Op.gte]: moment(start_date).startOf("day").toDate(),
        };
      } else if (end_date) {
        WhereClause.createdAt = {
          [Op.lte]: moment(end_date).endOf("day").toDate(),
        };
      }

      // Query untuk mendapatkan layanan berdasarkan bidang dengan feedback dan bidang terkait
      [history, totalCount] = await Promise.all([
        Layanan.findAll({
          include: [
            {
              model: User_feedback,
              attributes: [
                "id",
                "question_1",
                "question_2",
                "question_3",
                "question_4",
              ], // Ambil nilai untuk setiap pertanyaan
            },
            {
              model: Bidang, // Sertakan model Bidang untuk mendapatkan nama bidang
              attributes: ["id", "nama"], // Ambil ID dan nama Bidang
              where: WhereCondition,
            },
          ],
          where: {
            ...WhereClause,
            ...WhereCondition,
          },
          limit: limit,
          offset: offset,
          order: [["id", "DESC"]],
        }),
        Layanan.count({
          where: {
            ...WhereClause,
            ...WhereCondition,
          },
          include: [
            {
              model: Bidang, // Sertakan model Bidang untuk mendapatkan nama bidang
              attributes: ["id", "nama"], // Ambil ID dan nama Bidang
              where: search
                ? { nama: { [Op.iLike]: `%${search}%` } }
                : undefined,
            },
          ],
        }),
      ]);

      // Fungsi untuk menghitung total nilai dari feedback dan mengonversi ke skala 100
      const calculateTotalFeedbackAndNilai = (feedbacks) => {
        const totalFeedback = feedbacks.length;

        const totalNilai = feedbacks.reduce((sum, feedback) => {
          const nilaiTotal =
            feedback.question_1 * 25 +
            feedback.question_2 * 25 +
            feedback.question_3 * 25 +
            feedback.question_4 * 25;

          return sum + nilaiTotal;
        }, 0);

        const nilaiRataRata =
          totalFeedback > 0 ? totalNilai / (totalFeedback * 4) : 0; // Dibagi dengan 4 pertanyaan
        return {
          totalFeedback,
          nilaiRataRata,
        };
      };

      // Format data untuk setiap layanan yang didapatkan
      let formattedData = history.map((data) => {
        const feedbackSummary = calculateTotalFeedbackAndNilai(
          data.User_feedbacks
        );

        return {
          id: data.id,
          layanan_id: data.id || null,
          layanan_name: data.nama || null,
          bidang_name: data.Bidang ? data.Bidang.nama : null, // Ambil nama Bidang terkait
          total_feedback: feedbackSummary.totalFeedback,
          average_nilai: feedbackSummary.nilaiRataRata, // Nilai rata-rata di skala 100
          created_at: data.createdAt,
        };
      });

      // Generate pagination
      const pagination = generatePagination(
        totalCount,
        page,
        limit,
        `/api/user/history/feedback`
      );

      // Return hasil
      res.status(200).json({
        status: 200,
        message: "Success get data",
        data: formattedData,
        pagination: pagination,
      });
    } catch (err) {
      res.status(500).json({
        status: 500,
        message: "Internal server error",
        error: err,
      });
      console.log(err);
    }
  },

  getHistoryByLayanan: async (req, res) => {
    try {
      const idlayanan = Number(req.params.idlayanan);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const start_date = req.query.start_date;
      const end_date = req.query.end_date;

      let layanan;
      let history;
      let totalCount;

      const WhereClause = {};

      // Filter berdasarkan idlayanan
      if (idlayanan) {
        WhereClause.layanan_id = idlayanan;
      }

      // Filter berdasarkan tanggal (start_date dan end_date)
      if (start_date && end_date) {
        WhereClause.createdAt = {
          [Op.between]: [
            moment(start_date).startOf("day").toDate(),
            moment(end_date).endOf("day").toDate(),
          ],
        };
      } else if (start_date) {
        WhereClause.createdAt = {
          [Op.gte]: moment(start_date).startOf("day").toDate(),
        };
      } else if (end_date) {
        WhereClause.createdAt = {
          [Op.lte]: moment(end_date).endOf("day").toDate(),
        };
      }

      // Query untuk mendapatkan data layanan, history, dan jumlah total data
      [layanan, history, totalCount] = await Promise.all([
        Layanan.findOne({
          where: {
            id: idlayanan,
          },
          attributes: ["id", "nama"],
        }),
        User_feedback.findAll({
          include: [
            {
              model: User_info,
              attributes: ["id", "name", "nip", "gender"],
            },
          ],
          where: WhereClause,
          limit: limit,
          offset: offset,
        }),
        User_feedback.count({
          where: WhereClause,
        }),
      ]);

      // Fungsi untuk menghitung nilai per user berdasarkan feedback
      const calculateTotalNilai = (feedback) => {
        const nilaiPerUser =
          feedback.question_1 * 25 +
          feedback.question_2 * 25 +
          feedback.question_3 * 25 +
          feedback.question_4 * 25;

        return nilaiPerUser / 4;
      };

      // Format data yang akan ditampilkan
      let formattedData = history.map((data) => {
        const totalNilai = calculateTotalNilai(data);

        return {
          id: data.id,
          name: data.User_info ? data.User_info.name : null,
          nip: data.User_info ? data.User_info.nip : null,
          gender: data.User_info ? data.User_info.gender : null,
          date: data.createdAt,
          kritiksaran: data.feedback,
          nilai: totalNilai, // Nilai rata-rata per user
        };
      });

      // Menghitung nilai rata-rata keseluruhan untuk layanan tersebut
      const totalNilaiKeseluruhan = formattedData.reduce(
        (sum, item) => sum + item.nilai,
        0
      );
      const rataRataNilaiKeseluruhan =
        totalCount > 0 ? totalNilaiKeseluruhan / totalCount : 0; // Cek untuk menghindari pembagian dengan nol

      // Generate pagination
      const pagination = generatePagination(
        totalCount,
        page,
        limit,
        `/api/user/historysurvey/${idlayanan}`
      );

      // Return hasil
      res.status(200).json({
        status: 200,
        message: "Success get data",
        data: formattedData,
        layanan: layanan,
        rataRataNilaiKeseluruhan: rataRataNilaiKeseluruhan.toFixed(2), // Rata-rata keseluruhan dari semua user
        pagination: pagination,
      });
    } catch (err) {
      res.status(500).json({
        status: 500,
        message: "Internal server error",
        error: err,
      });
      console.log(err);
    }
  },

  // user get inputan feedback nya
  getHistoryForUser: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      let { start_date, end_date, search } = req.query;

      let history;
      let totalCount;

      const WhereClause = {};

      WhereClause.userinfo_id = req.user.userId;

      if (search) {
        WhereClause[Op.or] = [
          { "$Layanan.nama$": { [Op.like]: `%${search}%` } },
          { "$Layanan.Bidang.nama$": { [Op.like]: `%${search}%` } },
        ];
      }

      if (start_date && end_date) {
        WhereClause.createdAt = {
          [Op.between]: [
            moment(start_date).startOf("day").toDate(),
            moment(end_date).endOf("day").toDate(),
          ],
        };
      } else if (start_date) {
        WhereClause.createdAt = {
          [Op.gte]: moment(start_date).startOf("day").toDate(),
        };
      } else if (end_date) {
        WhereClause.createdAt = {
          [Op.lte]: moment(end_date).endOf("day").toDate(),
        };
      }

      [history, totalCount] = await Promise.all([
        User_feedback.findAll({
          where: WhereClause,
          limit: limit,
          offset: offset,
          order: [["id", "DESC"]],
          include: [
            {
              model: Layanan,
              attributes: ["nama"],
              include: [
                {
                  model: Bidang,
                  attributes: ["nama"],
                },
              ],
            },
          ],
        }),
        User_feedback.count({
          where: WhereClause,
          include: [
            {
              model: Layanan,
              attributes: ["nama"],
              include: [
                {
                  model: Bidang,
                  attributes: ["nama"],
                },
              ],
            },
          ],
        }),
      ]);

      const transformedHistory = history.map((item) => ({
        id: item.id,
        // no_skm: item.no_skm,
        userinfo_id: item.userinfo_id,
        layanan_id: item.layanan_id,
        layanan_name: item?.Layanan?.nama,
        bidang_name: item?.Layanan?.Bidang?.nama,
        date: item.date,
        question_1: item.question_1,
        question_2: item.question_2,
        question_3: item.question_3,
        question_4: item.question_4,
        feedback: item.feedback,
        createdAt: item?.createdAt,
        updatedAt: item?.updatedAt,
      }));

      const pagination = generatePagination(
        totalCount,
        page,
        limit,
        `/api/user/get/history/feedback`
      );

      res.status(200).json({
        status: 200,
        message: "success get",
        data: transformedHistory,
        pagination: pagination,
      });
    } catch (err) {
      res.status(500).json(response(500, "Internal server error", err));
      console.log(err);
    }
  },

  // user get feedback by id nya
  getDetailHistoryFeedback: async (req, res) => {
    try {
      const idfeedback = req.params.idfeedback;

      // Cari feedback berdasarkan id
      const feedbackData = await User_feedback.findOne({
        where: {
          id: idfeedback,
        },
        include: [
          {
            model: Layanan,
            attributes: ["id", "nama"],
            include: [
              {
                model: Bidang,
                attributes: ["id", "nama"],
              },
            ],
          },
        ],
      });

      if (!feedbackData) {
        return res.status(404).json(response(404, "Data not found"));
      }

      // Ambil detail feedback, layanan, dan bidang
      const question_1 = feedbackData.question_1;
      const question_2 = feedbackData.question_2;
      const question_3 = feedbackData.question_3;
      const question_4 = feedbackData.question_4;
      const feedback = feedbackData.feedback;
      const date = feedbackData.createdAt;
      const layanan_name = feedbackData.Layanan?.nama;
      const bidang_name = feedbackData.Layanan?.Bidang?.nama;

      // Jika diperlukan lebih dari satu data, modifikasi di sini
      const formatteddata = {
        id: feedbackData.id,
        question_1,
        question_2,
        question_3,
        question_4,
        feedback,
        date,
        // nilai: feedbackData.nilai,
        layanan_name: layanan_name || "Unknown",
        bidang_name: bidang_name || "Unknown",
      };

      res.status(200).json(response(200, "Success get data", formatteddata));
    } catch (err) {
      console.error(err);
      res.status(500).json(response(500, "Internal server error", err));
    }
  },

  getPDFHistoryByBidang: async (req, res) => {
    try {
      const bidang_id = req.user?.bidang_id || req.query.bidang_id;
      let history;

      const start_date = req.query.start_date;
      const end_date = req.query.end_date;

      const WhereClause = {};
      if (start_date && end_date) {
        WhereClause.createdAt = {
          [Op.between]: [
            moment(start_date).startOf("day").toDate(),
            moment(end_date).endOf("day").toDate(),
          ],
        };
      } else if (start_date) {
        WhereClause.createdAt = {
          [Op.gte]: moment(start_date).startOf("day").toDate(),
        };
      } else if (end_date) {
        WhereClause.createdAt = {
          [Op.lte]: moment(end_date).endOf("day").toDate(),
        };
      }

      const WhereClause2 = {};
      if (bidang_id) {
        WhereClause2.id = bidang_id;
      }

      [history] = await Promise.all([
        Layanan.findAll({
          include: [
            {
              model: User_feedback,
              include: [
                {
                  model: User_info,
                  attributes: ["id", "name", "nip", "gender"],
                },
              ],
              where: WhereClause,
            },
            {
              model: Bidang,
              attributes: ["nama"],
              where: WhereClause2,
            },
          ],
        }),
      ]);

      let formattedData = history
        .map((service) => {
          return service.User_feedback?.map((data) => {
            // Ambil nilai dari question_1 hingga question_4 langsung dari tabel User_feedback
            const { question_1, question_2, question_3, question_4 } = data;

            const totalNilai =
              (question_1 || 0) +
              (question_2 || 0) +
              (question_3 || 0) +
              (question_4 || 0);

            return {
              id: data?.id,
              layanan: service?.nama,
              question_1: question_1 || 0,
              question_2: question_2 || 0,
              question_3: question_3 || 0,
              question_4: question_4 || 0,
              total_nilai: totalNilai,
              name: data?.User_info?.name || data?.name,
            };
          });
        })
        .flat();

      let reportTableRows = "";
      if (formattedData.length > 0) {
        reportTableRows = formattedData
          .map(
            (survey) => `
                    <tr>
                        <td>${survey?.name}</td>
                        <td class="center">${survey?.layanan}</td>
                        <td class="center">${survey?.question_1}</td>
                        <td class="center">${survey?.question_2}</td>
                        <td class="center">${survey?.question_3}</td>
                        <td class="center">${survey?.question_4}</td>
                        <td class="center">${survey?.total_nilai}</td>
                    </tr>
                `
          )
          .join("");
      } else {
        reportTableRows = `
                    <tr>
                        <td class="center" colspan="7" style="color: red;"><strong>DATA KOSONG</strong></td>
                    </tr>
                `;
      }

      const bidangInfo = history[0]?.Bidang?.nama
        ? `<p>Instansi : ${history[0]?.Bidang?.nama}</p>`
        : "<p>Instansi Tidak Diketahui</p>";
      const templatePath = path.resolve(
        __dirname,
        "../views/surveybyinstansi.html"
      );
      let htmlContent = fs.readFileSync(templatePath, "utf8");

      htmlContent = htmlContent.replace(
        "{{reportTableRows}}",
        reportTableRows || ""
      );
      htmlContent = htmlContent.replace("{{bidangInfo}}", bidangInfo);

      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "Legal",
        landscape: true,
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
      });

      await browser.close();

      const currentDate = new Date().toISOString().replace(/:/g, "-");
      const filename = `laporan-survey-${currentDate}.pdf`;

      res.setHeader(
        "Content-disposition",
        'attachment; filename="' + filename + '"'
      );
      res.setHeader("Content-type", "application/pdf");
      res.send(pdfBuffer);
    } catch (err) {
      res.status(500).json({ message: "Internal server error", error: err });
    }
  },
};
