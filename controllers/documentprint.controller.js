const { response } = require("../helpers/response.formatter");

const {
  Layanan_form_input,
  Layanan_form_num,
  Layanan_form,
  Layanan,
  Layanan_surat,
  Bidang,
  User_info,
  Desa,
  Kecamatan,
  Bkd_struktur,
  Pengaduan,
  User_feedback,
  sequelize,
} = require("../models");
require("dotenv").config();

const Validator = require("fastest-validator");
const v = new Validator();
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const moment = require("moment-timezone");
const { Op } = require("sequelize");
const { generatePagination } = require("../pagination/pagination");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const nodemailer = require("nodemailer");
const { format } = require("date-fns");
const { id } = require("date-fns/locale");
const crypto = require("crypto");
const axios = require("axios");

const Redis = require("ioredis");
const { log } = require("winston");
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_NAME,
    pass: process.env.EMAIL_PW,
  },
});

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  useAccelerateEndpoint: true,
});

module.exports = {
  // riwayat permohonan pdf
  getApplicationHistoryPrint: async (req, res) => {
    try {
      const userinfo_id = req.user.role === "User" ? req.user.userId : null;
      let { start_date, end_date, search, status, layanan_id, bidang_id } =
        req.query;
      let applicationPrints;

      let whereCondition = {};
      const WhereCondition2 = {};
      const WhereCondition3 = {};

      if (
        req.user.role === "Kepala Bidang" ||
        req.user.role === "Admin Verifikasi"
      ) {
        whereCondition.bidang_id = req.user.bidang_id;
      } else if (
        req.user.role === "Super Admin" ||
        req.user.role === "Kepala Dinas" ||
        req.user.role === "Sekretaris Dinas"
      ) {
      }

      if (userinfo_id) {
        whereCondition.userinfo_id = userinfo_id;
      }

      if (start_date && end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        whereCondition.createdAt = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      } else if (start_date) {
        whereCondition.createdAt = {
          [Op.gte]: new Date(start_date),
        };
      } else if (end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        whereCondition.createdAt = {
          [Op.lte]: new Date(end_date),
        };
      }

      if (bidang_id) {
        WhereCondition2.bidang_id = bidang_id;
      }

      if (search) {
        WhereCondition3[Op.or] = [
          { nama: { [Op.like]: `%${search}%` } },
          { "$Layanan.nama$": { [Op.like]: `%${search}%` } },
          { "$Layanan->Bidang.nama$": { [Op.like]: `%${search}%` } },
        ];
      }

      applicationPrints = await Promise.all([
        Layanan_form_num.findAll({
          where: whereCondition,
          include: [
            {
              model: Layanan,
              attributes: ["nama", "id"],
              include: [
                {
                  model: Bidang,
                  attributes: ["nama", "id"],
                },
              ],
              where: WhereCondition2,
            },
            {
              model: User_info,
              attributes: ["name", "nip"],
              where: WhereCondition3,
            },
          ],
        }),
      ]);

      // Baca template HTML
      const templatePath = path.resolve(
        __dirname,
        "../views/application_history_template.html"
      );
      let htmlContent = fs.readFileSync(templatePath, "utf8");

      let reportTableRows = "";
      reportTableRows = applicationPrints[0]
        ?.map((item, index) => {
          const createdAtDate = new Date(item.createdAt).toLocaleDateString(
            "id-ID",
            { day: "2-digit", month: "short", year: "numeric" }
          );

          return `
             <tr>
                 <td>${index + 1}</td>
                 <td>${item?.User_info?.name}</td>
                 <td>${item?.User_info?.nip}</td>
                 <td>${item?.Layanan?.nama}</td>
                 <td>${createdAtDate}</td>
                 <td>${item?.status === 1 ? "Menunggu" : "Selesai"}</td>
             </tr>
         `;
        })
        .join("");

      htmlContent = htmlContent.replace("{{reportTableRows}}", reportTableRows);

      // Jalankan Puppeteer dan buat PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "0.6in",
          right: "1.08in",
          bottom: "1.08in",
          left: "1.08in",
        },
      });

      await browser.close();

      const currentDate = new Date().toISOString().replace(/:/g, "-");
      const filename = `riwayat-permohonan-${currentDate}.pdf`;

      // Simpan buffer PDF untuk debugging
      fs.writeFileSync("output.pdf", pdfBuffer);

      // Set response headers
      res.setHeader(
        "Content-disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-type", "application/pdf");
      res.end(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  // indeks kepuasan pdf
  getSatisfactionHistoryDetailPrint: async (req, res) => {
    try {
      let { layananId } = req.params;
      const userinfo_id = req.user.role === "User" ? req.user.userId : null;
      let { start_date, end_date, bidang_id } = req.query;

      let history;

      let whereCondition = {};

      if (layananId) {
        whereCondition.layanan_id = layananId;
      }

      if (
        req.user.role === "Kepala Bidang" ||
        req.user.role === "Admin Verifikasi"
      ) {
        whereCondition.bidang_id = req.user.bidang_id;
      } else if (
        req.user.role === "Super Admin" ||
        req.user.role === "Kepala Dinas" ||
        req.user.role === "Sekretaris Dinas"
      ) {
      }

      if (userinfo_id) {
        whereCondition.userinfo_id = userinfo_id;
      }

      if (start_date && end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        whereCondition.createdAt = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      } else if (start_date) {
        whereCondition.createdAt = {
          [Op.gte]: new Date(start_date),
        };
      } else if (end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        whereCondition.createdAt = {
          [Op.lte]: new Date(end_date),
        };
      }

      [history, totalCount] = await Promise.all([
        User_feedback.findAll({
          include: [
            {
              model: User_info,
              attributes: ["id", "name", "nip", "gender"],
            },
          ],
          where: whereCondition,
        }),

        User_feedback.count({
          where: whereCondition,
        }),
      ]);

      const calculateTotalNilai = (feedback) => {
        const nilaiPerUser =
          feedback.question_1 * 25 +
          feedback.question_2 * 25 +
          feedback.question_3 * 25 +
          feedback.question_4 * 25;

        return nilaiPerUser / 4;
      };

      const templatePath = path.resolve(
        __dirname,
        "../views/satisfaction_index_history_template.html"
      );
      let htmlContent = fs.readFileSync(templatePath, "utf8");

      let reportTableRows = history
        ?.map((data, index) => {
          const totalNilai = calculateTotalNilai(data);
          const createdAtDate = new Date(data.createdAt).toLocaleDateString(
            "id-ID",
            { day: "2-digit", month: "short", year: "numeric" }
          );

          return `
          <tr>
              <td>${index + 1}</td>
              <td>${data?.User_info?.name}</td>
              <td>${data?.User_info?.nip}</td>
              <td>${data?.User_info?.gender}</td>
              <td>${createdAtDate}</td>
              <td>${data?.feedback}</td>
              <td>${totalNilai}</td>
          </tr>
      `;
        })
        .join("");

      // Menghitung nilai rata-rata keseluruhan untuk layanan tersebut
      // const totalNilaiKeseluruhan = reportTableRows?.reduce(
      //   (sum, item) => sum + item.nilai,
      //   0
      // );
      // const rataRataNilaiKeseluruhan =
      //   totalCount > 0 ? totalNilaiKeseluruhan / totalCount : 0;

      htmlContent = htmlContent.replace("{{reportTableRows}}", reportTableRows);

      // Jalankan Puppeteer dan buat PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "0.6in",
          right: "1.08in",
          bottom: "1.08in",
          left: "1.08in",
        },
      });

      await browser.close();

      const currentDate = new Date().toISOString().replace(/:/g, "-");
      const filename = `indeks-kepuasan-${currentDate}.pdf`;

      // Simpan buffer PDF untuk debugging
      fs.writeFileSync("output.pdf", pdfBuffer);

      // Set response headers
      res.setHeader(
        "Content-disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-type", "application/pdf");
      res.end(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  // staff bkd pdf
  getStaffBKDPrint: async (req, res) => {
    try {
      let { search, status, bidang_id } = req.query;

      whereCondition = {};

      if (bidang_id) {
        whereCondition.bidang_id = bidang_id;
      }

      if (search) {
        whereCondition[Op.or] = [
          { nama: { [Op.iLike]: `%${search}%` } },
          { nip: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (status) {
        whereCondition.status = status;
      }

      const structures = await Promise.all([
        Bkd_struktur.findAll({
          where: whereCondition,
        }),
      ]);

      // Baca template HTML
      const templatePath = path.resolve(
        __dirname,
        "../views/bkd_staff_template.html"
      );
      let htmlContent = fs.readFileSync(templatePath, "utf8");

      const reportTableRows = structures[0]
        ?.map((item, index) => {
          return `
               <tr>
                   <td>${index + 1}</td>
                   <td>${item?.nama}</td>
                   <td>${item?.jabatan}</td>
                   <td>${item?.status === 1 ? "Aktif" : "Tidak Aktif"}</td>
               </tr>
           `;
        })
        .join("");

      htmlContent = htmlContent.replace("{{reportTableRows}}", reportTableRows);

      // Jalankan Puppeteer dan buat PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "0.6in",
          right: "1.08in",
          bottom: "1.08in",
          left: "1.08in",
        },
      });

      await browser.close();

      const currentDate = new Date().toISOString().replace(/:/g, "-");
      const filename = `staff-bkd-${currentDate}.pdf`;

      // Simpan buffer PDF untuk debugging
      fs.writeFileSync("output.pdf", pdfBuffer);

      // Set response headers
      res.setHeader(
        "Content-disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-type", "application/pdf");
      res.end(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  getUserComplaintPrint: async (req, res) => {
    try {
      const userinfo_id = req.user.role === "User" ? req.user.userId : null;
      let { search, status, start_date, end_date, bidang_id, layanan_id } =
        req.query;

      const whereCondition = {};
      const WhereCondition2 = {};
      const WhereCondition3 = {};

      if (
        req.user.role === "Kepala Bidang" ||
        req.user.role === "Admin Verifikasi"
      ) {
        whereCondition.bidang_id = req.user.bidang_id;
      } else if (
        req.user.role === "Super Admin" ||
        req.user.role === "Kepala Dinas" ||
        req.user.role === "Sekretaris Dinas"
      ) {
      }

      if (userinfo_id) {
        whereCondition.userinfo_id = userinfo_id;
      }

      if (start_date && end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        whereCondition.createdAt = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      } else if (start_date) {
        whereCondition.createdAt = {
          [Op.gte]: new Date(start_date),
        };
      } else if (end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        whereCondition.createdAt = {
          [Op.lte]: new Date(end_date),
        };
      }

      if (layanan_id) {
        whereCondition.layanan_id = layanan_id;
      }

      if (bidang_id) {
        WhereCondition2.bidang_id = bidang_id;
      }

      if (search) {
        WhereCondition3[Op.or] = [
          { nama: { [Op.like]: `%${search}%` } },
          { "$Layanan.nama$": { [Op.like]: `%${search}%` } },
          { "$Layanan->Bidang.nama$": { [Op.like]: `%${search}%` } },
        ];
      }

      const userComplaints = await Promise.all([
        Pengaduan.findAll({
          where: whereCondition,
          include: [
            {
              model: Layanan,
              as: "Layanan",
              include: [
                {
                  model: Bidang,
                  as: "Bidang",
                  where: WhereCondition2,
                },
              ],
            },
          ],
          where: WhereCondition3,
        }),
      ]);

      // Baca template HTML
      const templatePath = path.resolve(
        __dirname,
        "../views/user_complaint_template.html"
      );
      let htmlContent = fs.readFileSync(templatePath, "utf8");

      const reportTableRows = userComplaints[0]
        ?.map((item, index) => {
          const createdAtDate = new Date(item.createdAt).toLocaleDateString(
            "id-ID",
            { day: "2-digit", month: "short", year: "numeric" }
          );

          return `
                 <tr>
                     <td>${index + 1}</td>
                     <td>${createdAtDate}</td>
                     <td>${item?.Layanan?.Bidang?.nama}</td>
                     <td>${item?.Layanan?.nama}</td>
                     <td>${item?.judul_pengaduan}</td>
                     <td>${item?.status === 1 ? "Selesai" : "Menunggu"}</td>
                 </tr>
             `;
        })
        .join("");

      htmlContent = htmlContent.replace("{{reportTableRows}}", reportTableRows);

      // Jalankan Puppeteer dan buat PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "0.6in",
          right: "1.08in",
          bottom: "1.08in",
          left: "1.08in",
        },
      });

      await browser.close();

      const currentDate = new Date().toISOString().replace(/:/g, "-");
      const filename = `staff-bkd-${currentDate}.pdf`;

      // Simpan buffer PDF untuk debugging
      fs.writeFileSync("output.pdf", pdfBuffer);

      // Set response headers
      res.setHeader(
        "Content-disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-type", "application/pdf");
      res.end(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },
};
