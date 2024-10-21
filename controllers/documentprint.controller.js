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
const exceljs = require("exceljs");

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

      const statusApp = (status) => {
        switch (status) {
          case 1:
            return "Menunggu";
          case 2:
            return "Sedang Diproses";
          case 3:
            return "Butuh Perbaikan";
          case 4:
            return "Sudah Diperbaiki";
          case 5:
            return "Sedang Divalidasi";
          case 6:
            return "Sudah Divalidasi";
          case 7:
            return "Sedang Ditandatangani";
          case 8:
            return "Sudah Ditandatangani";
          case 9:
            return "Selesai";
          case 10:
            return "Ditolak";
          default:
            return "Status Tidak Diketahui";
        }
      };

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

          const statusText = statusApp(item.status);

          return `
             <tr>
                 <td>${index + 1}</td>
                 <td>${item?.User_info?.name}</td>
                 <td>${item?.User_info?.nip}</td>
                 <td>${item?.Layanan?.nama}</td>
                 <td>${createdAtDate}</td>
                 <td>${statusText}</td>
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
          { nama: { [Op.like]: `%${search}%` } },
          { nip: { [Op.like]: `%${search}%` } },
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

  // get user complaint pdf
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

  // get application history excel
  getApplicationHistoryExcelPrint: async (req, res) => {
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

      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("Riwayat Permohonan");

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

      worksheet.columns = [
        { width: 5 },
        { width: 40 },
        { width: 25 },
        { width: 60 },
        { width: 25 },
        { width: 30 },
      ];

      worksheet.mergeCells("A3:F3");

      worksheet.getCell(
        "A3"
      ).value = `DAFTAR RIWAYAT PERMOHONAN LAYANAN KABUPATEN LAMPUNG TIMUR TAHUN ${new Date().getFullYear()}`;

      worksheet.getRow(5).values = [
        "NO",
        "NAMA",
        "NIP",
        "LAYANAN",
        "TANGGAL",
        "STATUS",
      ];

      const statusApp = (status) => {
        switch (status) {
          case 1:
            return "Menunggu";
          case 2:
            return "Sedang Diproses";
          case 3:
            return "Butuh Perbaikan";
          case 4:
            return "Sudah Diperbaiki";
          case 5:
            return "Sedang Divalidasi";
          case 6:
            return "Sudah Divalidasi";
          case 7:
            return "Sedang Ditandatangani";
          case 8:
            return "Sudah Ditandatangani";
          case 9:
            return "Selesai";
          case 10:
            return "Ditolak";
          default:
            return "Status Tidak Diketahui";
        }
      };

      applicationPrints[0].forEach((item, index) => {
        const createdAtDate = new Date(item.createdAt).toLocaleDateString(
          "id-ID",
          { day: "2-digit", month: "long", year: "numeric" }
        );

        const statusText = statusApp(item?.status);

        worksheet.getRow(index + 6).values = [
          index + 1,
          item?.User_info?.name,
          item?.User_info?.nip,
          item?.Layanan?.nama,
          createdAtDate,
          statusText,
        ];
      });

      ["A3"].forEach((cell) => {
        worksheet.getCell(cell).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        worksheet.getCell(cell).font = {
          bold: true,
        };
      });

      for (let i = 5; i < 6 + applicationPrints[0].length; i++) {
        ["A", "B", "C", "D", "E", "F"].forEach((j) => {
          let cell = `${j}${i}`;

          worksheet.getCell(cell).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          worksheet.getCell(cell).border = {
            bottom: { style: "thin", color: { argb: "00000000" } },
            right: { style: "thin", color: { argb: "00000000" } },
            left: { style: "thin", color: { argb: "00000000" } },
            top: { style: "thin", color: { argb: "00000000" } },
          };
          if (i === 5) {
            worksheet.getCell(cell).font = {
              bold: true,
              color: { argb: "FFFFFF" },
            };
            worksheet.getCell(cell).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "3572EF" },
              bgColor: { argb: "3572EF" },
            };
            worksheet.getCell(cell).alignment = {
              vertical: "middle",
              horizontal: "left",
            };
            worksheet.getCell(cell).border = {
              bottom: { style: "thin", color: { argb: "00000000" } },
              right: { style: "thin", color: { argb: "00000000" } },
              left: { style: "thin", color: { argb: "00000000" } },
              top: { style: "thin", color: { argb: "00000000" } },
            };
          }

          if (i !== 5) {
            worksheet.getCell(cell).alignment = {
              vertical: "middle",
              horizontal: "left",
            };
          }
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "Riwayat Permohonan Layanan.xlsx"
      );

      workbook.xlsx.write(res).then(() => res.end());
    } catch (error) {
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  // get user complaint excel
  getUserComplaintExcelPrint: async (req, res) => {
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

      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("Riwayat Pengaduan");

      worksheet.columns = [
        { width: 5 },
        { width: 25 },
        { width: 50 },
        { width: 60 },
        { width: 70 },
        { width: 25 },
      ];

      worksheet.mergeCells("A3:F3");

      worksheet.getCell(
        "A3"
      ).value = `DAFTAR RIWAYAT PENGADUAN LAYANAN KABUPATEN LAMPUNG TIMUR TAHUN ${new Date().getFullYear()}`;

      worksheet.getRow(5).values = [
        "NO",
        "TANGGAL",
        "BIDANG",
        "LAYANAN",
        "JUDUL PENGADUAN",
        "STATUS",
      ];

      userComplaints[0].forEach((item, index) => {
        const createdAtDate = new Date(item.createdAt).toLocaleDateString(
          "id-ID",
          { day: "2-digit", month: "short", year: "numeric" }
        );

        worksheet.getRow(index + 6).values = [
          index + 1,
          createdAtDate,
          item?.Layanan?.Bidang?.nama,
          item?.Layanan?.nama,
          item?.judul_pengaduan,
          `${item?.status === 1 ? "Selesai" : "Menunggu"}`,
        ];
      });

      ["A3"].forEach((cell) => {
        worksheet.getCell(cell).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        worksheet.getCell(cell).font = {
          bold: true,
        };
      });

      for (let i = 5; i < 6 + userComplaints[0].length; i++) {
        ["A", "B", "C", "D", "E", "F"].forEach((j) => {
          let cell = `${j}${i}`;
          worksheet.getCell(cell).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          worksheet.getCell(cell).border = {
            bottom: { style: "thin", color: { argb: "00000000" } },
            right: { style: "thin", color: { argb: "00000000" } },
            left: { style: "thin", color: { argb: "00000000" } },
            top: { style: "thin", color: { argb: "00000000" } },
          };
          if (i === 5) {
            worksheet.getCell(cell).font = {
              bold: true,
              color: { argb: "FFFFFF" },
            };
            worksheet.getCell(cell).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "3572EF" },
              bgColor: { argb: "3572EF" },
            };
            worksheet.getCell(cell).alignment = {
              vertical: "middle",
              horizontal: "left",
            };
            worksheet.getCell(cell).border = {
              bottom: { style: "thin", color: { argb: "00000000" } },
              right: { style: "thin", color: { argb: "00000000" } },
              left: { style: "thin", color: { argb: "00000000" } },
              top: { style: "thin", color: { argb: "00000000" } },
            };
          }

          if (i !== 5) {
            worksheet.getCell(cell).alignment = {
              vertical: "middle",
              horizontal: "left",
            };
          }
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "Riwayat Pengaduan.xlsx"
      );

      workbook.xlsx.write(res).then(() => res.end());
    } catch (error) {
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  // staff bkd excel
  getStaffBKDExcelPrint: async (req, res) => {
    try {
      let { search, status, bidang_id } = req.query;

      whereCondition = {};

      if (bidang_id) {
        whereCondition.bidang_id = bidang_id;
      }

      if (search) {
        whereCondition[Op.or] = [
          { nama: { [Op.like]: `%${search}%` } },
          { nip: { [Op.like]: `%${search}%` } },
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

      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("Staf BKD Lampung Timur");

      worksheet.columns = [
        { width: 5 },
        { width: 60 },
        { width: 60 },
        { width: 25 },
      ];

      worksheet.mergeCells("A3:D3");

      worksheet.getCell(
        "A3"
      ).value = `DAFTAR STAF BKD KABUPATEN LAMPUNG TIMUR TAHUN ${new Date().getFullYear()}`;

      worksheet.getRow(5).values = ["NO", "NAMA", "JABATAN", "STATUS"];

      structures[0].forEach((item, index) => {
        worksheet.getRow(index + 6).values = [
          index + 1,
          item?.nama,
          item?.jabatan,
          `${item?.status === 1 ? "Aktif" : "Tidak Aktif"}`,
        ];
      });

      ["A3"].forEach((cell) => {
        worksheet.getCell(cell).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        worksheet.getCell(cell).font = {
          bold: true,
        };
      });

      for (let i = 5; i < 6 + structures[0].length; i++) {
        ["A", "B", "C", "D", "E", "F"].forEach((j) => {
          let cell = `${j}${i}`;

          worksheet.getCell(cell).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          worksheet.getCell(cell).border = {
            bottom: { style: "thin", color: { argb: "00000000" } },
            right: { style: "thin", color: { argb: "00000000" } },
            left: { style: "thin", color: { argb: "00000000" } },
            top: { style: "thin", color: { argb: "00000000" } },
          };
          if (i === 5) {
            worksheet.getCell(cell).font = {
              bold: true,
              color: { argb: "FFFFFF" },
            };
            worksheet.getCell(cell).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "3572EF" },
              bgColor: { argb: "3572EF" },
            };
            worksheet.getCell(cell).alignment = {
              vertical: "middle",
              horizontal: "left",
            };
            worksheet.getCell(cell).border = {
              bottom: { style: "thin", color: { argb: "00000000" } },
              right: { style: "thin", color: { argb: "00000000" } },
              left: { style: "thin", color: { argb: "00000000" } },
              top: { style: "thin", color: { argb: "00000000" } },
            };
          }

          if (i !== 5) {
            worksheet.getCell(cell).alignment = {
              vertical: "middle",
              horizontal: "left",
            };
          }
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "Daftar Staf BKD Lampung Timur.xlsx"
      );

      workbook.xlsx.write(res).then(() => res.end());
    } catch (error) {
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },

  // satisfaction index detail excel
  getSatisfactionHistoryDetailExcelPrint: async (req, res) => {
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

      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("Indeks Kepuasan");

      worksheet.columns = [
        { width: 5 },
        { width: 60 },
        { width: 30 },
        { width: 20 },
        { width: 25 },
        { width: 70 },
        { width: 10 },
      ];

      worksheet.mergeCells("A3:G3");

      worksheet.getCell(
        "A3"
      ).value = `RIWAYAT INDEKS KEPUASAN BKD KABUPATEN LAMPUNG TIMUR TAHUN ${new Date().getFullYear()}`;

      worksheet.getRow(5).values = [
        "NO",
        "NAMA",
        "NIP",
        "JENIS KELAMIN",
        "TANGGAL",
        "KRITIK DAN SARAN",
        "NILAI",
      ];

      history.forEach((item, index) => {
        const totalNilai = calculateTotalNilai(item);
        const createdAtDate = new Date(item.createdAt).toLocaleDateString(
          "id-ID",
          { day: "2-digit", month: "short", year: "numeric" }
        );

        worksheet.getRow(index + 6).values = [
          index + 1,
          item?.User_info?.name,
          item?.User_info?.nip,
          item?.User_info?.gender,
          createdAtDate,
          item?.feedback,
          totalNilai,
        ];
      });

      ["A3"].forEach((cell) => {
        worksheet.getCell(cell).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        worksheet.getCell(cell).font = {
          bold: true,
        };
      });

      for (let i = 5; i < 6 + structures[0].length; i++) {
        ["A", "B", "C", "D", "E", "F", "G"].forEach((j) => {
          let cell = `${j}${i}`;
          worksheet.getCell(cell).alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          worksheet.getCell(cell).border = {
            bottom: { style: "thin", color: { argb: "00000000" } },
            right: { style: "thin", color: { argb: "00000000" } },
            left: { style: "thin", color: { argb: "00000000" } },
            top: { style: "thin", color: { argb: "00000000" } },
          };
          if (i === 5) {
            worksheet.getCell(cell).font = {
              bold: true,
              color: { argb: "FFFFFF" },
            };
            worksheet.getCell(cell).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "3572EF" },
              bgColor: { argb: "3572EF" },
            };
            worksheet.getCell(cell).alignment = {
              vertical: "middle",
              horizontal: "left",
            };
            worksheet.getCell(cell).border = {
              bottom: { style: "thin", color: { argb: "00000000" } },
              right: { style: "thin", color: { argb: "00000000" } },
              left: { style: "thin", color: { argb: "00000000" } },
              top: { style: "thin", color: { argb: "00000000" } },
            };
          }

          if (i !== 5) {
            worksheet.getCell(cell).alignment = {
              vertical: "middle",
              horizontal: "left",
            };
          }
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "Riwayat Indeks Kepuasan Lampung Timur.xlsx"
      );

      workbook.xlsx.write(res).then(() => res.end());
    } catch (error) {
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  },
};
