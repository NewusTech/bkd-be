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
const QRCode = require('qrcode');

const Redis = require("ioredis");
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
  
  inputForm: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const folderPaths = {
        fileinput: "dir_bkd/file_pemohon",
        fileoutput: "fileoutput", // path untuk testing
      };

      const idlayanan = req.params.idlayanan;
      const iduser =
        req.user.role === "User" ? req.user.userId : req.body.userId;
      const statusinput = 1;

      if (!iduser) {
        throw new Error("User ID is required");
      }

      const { datainput } = req.body;
      let { datafile } = req.body;

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const countToday = await Layanan_form_num.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(todayStr + "T00:00:00Z"),
            [Op.lte]: new Date(todayStr + "T23:59:59Z"),
          },
          layanan_id: idlayanan,
        },
      });

      const urut = String(countToday + 1).padStart(4, "0");
      const tanggalFormat = today.toISOString().slice(2, 10).replace(/-/g, "");

      const randomCode = crypto.randomBytes(3).toString("hex");
      const noRequest = `${randomCode}-${tanggalFormat}-${urut}`;

      let layananID = {
        userinfo_id: Number(iduser),
        no_request: noRequest,
        layanan_id: Number(idlayanan),
        status: Number(statusinput),
      };

      const createdLayananformnum = await Layanan_form_num.create(layananID, {
        transaction,
      });

      // Setelah create, ambil ID dari Layanan_form_num yang baru dibuat
      const idforminput = createdLayananformnum.id;
      console.log("Created Layanan_form_num ID:", idforminput);

      const updatedDatainput = datainput.map((item) => ({
        ...item,
        layananformnum_id: idforminput,
      }));

      const files = req.files;
      let s3UploadPromises = files.map(async (file) => {
        const { fieldname, mimetype, buffer, originalname } = file;
        
        const now = new Date();
        
        const timestamp = now.toISOString().replace(/[-:.]/g, "");
        const uniqueFilename = `${originalname.split(".")[0]}_${timestamp}.pdf`;
        
        const uploadParams = {
          Bucket: process.env.AWS_BUCKET,
          Key: `${folderPaths.fileinput}/${uniqueFilename}`, // Path di S3
          Body: buffer,
          ContentType: mimetype,
          ACL: "public-read",
          };
          
          const command = new PutObjectCommand(uploadParams);
          await s3Client.send(command);
          
          // URL file di S3 setelah berhasil di-upload
          
          const fileUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
          
          const index = parseInt(fieldname.match(/\d+/)[0], 10);
          datafile[index].data = fileUrl;
        });

        await Promise.all(s3UploadPromises);
        
        if (datafile) {
          datafile = datafile.map((item) => ({
            ...item,
            layananformnum_id: idforminput,
          }));
        }


      const createdLayananforminput = await Layanan_form_input.bulkCreate(
        updatedDatainput,
        { transaction }
      );
      let createdLayananformfile;
      if (datafile) {
        createdLayananformfile = await Layanan_form_input.bulkCreate(datafile, {
          transaction,
        });
      }

      // Commit transaksi untuk create data
      await transaction.commit();

      // Sekarang, setelah transaksi selesai, generate PDF dan upload
      setTimeout(async () => {
        try {
          console.log("Memanggil API generate PDF...");

          // Memanggil API generate PDF menggunakan idforminput yang baru saja dibuat
          let apiURL = `${process.env.SERVER_URL}/user/surat/${idlayanan}/${idforminput}`;
          console.log(`URL: ${apiURL}`);

          const responsePDF = await axios.get(apiURL, {
            responseType: "arraybuffer",
            headers: { "Cache-Control": "no-cache" },
          });

          const pdfBuffer = responsePDF.data;
          console.log("PDF berhasil diambil dari API.");

          // Upload PDF ke AWS S3
          const timestamp = new Date().getTime();
          const uniqueFileName = `${timestamp}-${noRequest}.pdf`;

          const uploadParams = {
            Bucket: process.env.AWS_BUCKET,
            Key: `${process.env.PATH_AWS}/file_output/${uniqueFileName}`,
            Body: pdfBuffer,
            ACL: "public-read",
            ContentType: "application/pdf",
          };

          const command = new PutObjectCommand(uploadParams);
          await s3Client.send(command);

          const fileOutputPath = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;

          console.log("PDF berhasil di-upload ke AWS S3:", fileOutputPath);

          // Update field fileoutput di tabel Layanan_form_num
          const [affectedRows] = await Layanan_form_num.update(
            { fileoutput: fileOutputPath },
            { where: { id: idforminput } }
          );

          if (affectedRows === 0) {
            console.error("Gagal update field fileoutput.");
          } else {
            console.log("Field fileoutput berhasil diupdate.");
          }
        } catch (error) {
          console.error("Error fetching or uploading PDF:", error);
        }
      }, 3000); // Set timeout 1 detik (1000 ms) untuk memberi waktu sebelum memanggil API

      res.status(201).json(
        response(201, "Success create layananforminput and uploaded PDF", {
          input: createdLayananforminput,
          file: createdLayananformfile,
        })
      );
    } catch (err) {
      await transaction.rollback();
      res.status(500).json(response(500, "Internal server error", err));
      console.error(err);
    }
  },

  //get input form user
  getDetailInputForm: async (req, res) => {
    try {
      const idlayanannum = req.params.idlayanannum;

      // Fetch Layananformnum details
      let layananformnumData = await Layanan_form_num.findOne({
        where: {
          id: idlayanannum,
        },
        include: [
          {
            model: Layanan_form_input,
            include: [
              {
                model: Layanan_form,
                attributes: { exclude: ["createdAt", "updatedAt", "status"] },
              },
            ],
          },
          {
            model: User_info,
            include: [
              {
                model: Desa,
                attributes: { exclude: ["createdAt", "updatedAt"] },
              },
              {
                model: Kecamatan,
                attributes: { exclude: ["createdAt", "updatedAt"] },
              },
            ],
          },
          {
            model: User_info,
            as: "Adminupdate",
            attributes: ["id", "name", "nip"],
          },
          {
            model: Layanan,
            attributes: ["id", "nama", "desc"],
            include: [
              {
                model: Bidang,
                attributes: ["id", "nama", "desc"],
              },
            ],
          },
        ],
      });

      if (!layananformnumData) {
        res.status(404).json(response(404, "data not found"));
        return;
      }

      // Cek apakah user sudah input feedback
      let feedbackGet = await User_feedback.findOne({
        where: {
          userinfo_id: layananformnumData.userinfo_id,
          layanan_id: layananformnumData.layanan_id,
        },
      });

      // Format the Layananforminput data
      let formattedInputData = layananformnumData?.Layanan_form_inputs?.map(
        (datafilter) => {
          let data_key = null;

          if (
            datafilter?.Layananform?.tipedata === "radio" &&
            datafilter?.Layanan_form?.datajson
          ) {
            const selectedOption = datafilter?.Layanan_form?.datajson.find(
              (option) => option?.id == datafilter?.data
            );
            if (selectedOption) {
              data_key = selectedOption?.key;
            }
          }

          if (
            datafilter?.Layanan_form?.tipedata === "checkbox" &&
            datafilter?.Layanan_form?.datajson
          ) {
            const selectedOptions = JSON.parse(datafilter?.data);
            data_key = selectedOptions
              .map((selectedId) => {
                const option = datafilter?.Layanan_form?.datajson.find(
                  (option) => option?.id == selectedId
                );
                return option ? option.key : null;
              })
              .filter((key) => key !== null);
          }

          return {
            id: datafilter?.id,
            data: datafilter?.data,
            layananform_id: datafilter?.layananform_id,
            layananformnum_id: datafilter?.layananformnum_id,
            layananform_name: datafilter?.Layanan_form?.field,
            layananform_datajson: datafilter?.Layanan_form?.datajson,
            layananform_tipedata: datafilter?.Layanan_form?.tipedata,
            data_key: data_key ?? null,
          };
        }
      );

      // Embed the formatted Layananforminput data into the Layananformnum data
      let result = {
        id: layananformnumData?.id,
        no_request: layananformnumData?.no_request,
        layanan_id: layananformnumData?.layanan_id,
        layanan: layananformnumData?.Layanan,
        tgl_selesai: layananformnumData?.tgl_selesai,
        userinfo_id: layananformnumData?.userinfo_id,
        userinfo: layananformnumData?.User_info,
        admin_updated: layananformnumData?.Adminupdate,
        createdAt: layananformnumData?.createdAt,
        updatedAt: layananformnumData?.updatedAt,
        Layanan_form_inputs: formattedInputData ?? null,
        status: layananformnumData?.status,
        fileoutput: layananformnumData?.fileoutput,
        user_feedback: feedbackGet ? true : false, 
      };

      res.status(200).json(response(200, "success get data", result));
    } catch (err) {
      res.status(500).json(response(500, "Internal server error", err));
      console.log(err);
    }
  },

  updateDataForm: async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { datainput, status } = req.body;
      const idlayanannum = req.params.idlayanannum;

      // Update data yang masuk
      let updateDataPromises = [];
      if (datainput && Array.isArray(datainput)) {
        updateDataPromises = datainput.map((item) =>
          Layanan_form_input.update(
            { data: item.data, layananform_id: item.layananform_id },
            {
              where: { id: item.id, layananformnum_id: idlayanannum },
              transaction,
            }
          ).catch((err) => {
            console.error("Error updating data permohonan:", err);
            return null;
          })
        );
      }

      const files = req.files;
      const folderPath = { fileinput: "dir_bkd/file_pemohon" };

      let redisUploadPromises = files.map(async (file) => {
        const { fieldname, mimetype, buffer, originalname } = file;
        const base64 = Buffer.from(buffer).toString("base64");
        const dataURI = `data:${mimetype};base64,${base64}`;

        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:.]/g, "");
        const uniqueFilename = `${originalname.split(".")[0]}_${timestamp}`;

        const redisKey = `upload:${idlayanannum}:${fieldname}`;
        await redisClient.set(
          redisKey,
          JSON.stringify({
            buffer,
            mimetype,
            originalname,
            uniqueFilename,
            folderPath: folderPath.fileinput,
          }),
          "EX",
          60 * 60
        ); // Expire in 1 hour

        const fileUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${folderPath.fileinput}/${uniqueFilename}`;

        // Extract index
        const index = parseInt(fieldname.match(/\d+/)[0], 10);

        await Layanan_form_input.update(
          { data: fileUrl },
          {
            where: {
              id: req.body.datafile[index].id,
              layananformnum_id: idlayanannum,
            },
            transaction,
          }
        );
      });

      Layanan_form_num.update(
        { status: status },
        { where: { id: idlayanannum }, transaction }
      );

      await Promise.all([...updateDataPromises, ...redisUploadPromises]);

      await transaction.commit();

      // Mulai proses background untuk mengunggah ke S3
      setTimeout(async () => {
        for (const file of files) {
          const { fieldname } = file;
          const redisKey = `upload:${idlayanannum}:${fieldname}`;
          const fileData = await redisClient.get(redisKey);

          if (fileData) {
            const {
              buffer,
              mimetype,
              originalname,
              uniqueFilename,
              folderPath,
            } = JSON.parse(fileData);
            const uploadParams = {
              Bucket: process.env.AWS_BUCKET,
              Key: `${folderPath}/${uniqueFilename}`,
              Body: Buffer.from(buffer),
              ACL: "public-read",
              ContentType: mimetype,
            };
            const command = new PutObjectCommand(uploadParams);
            await s3Client.send(command);
            await redisClient.del(redisKey);
          }
        }
      }, 0);

      res.status(200).json(response(200, "Success update layanan form input"));
    } catch (err) {
      await transaction.rollback();
      res.status(500).json(response(500, "Internal server error", err));
      console.log(err);
    }
  },

  updateStatusPengajuan: async (req, res) => {
    try {
      // Mendapatkan data layanan untuk pengecekan
      let layananGet = await Layanan_form_num.findOne({
        where: {
          id: req.params.idlayanannum,
        },
        include: [
          {
            model: User_info,
            attributes: ["id", "email", "name"],
          },
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
      });

      // Cek apakah data layanan ada
      if (!layananGet) {
        res.status(404).json(response(404, "layanan not found"));
        return;
      }

      // Membuat schema untuk validasi
      const schema = {
        status: {
          type: "number",
        },
        pesan: {
          type: "string",
          optional: true,
        },
      };

      // Buat object layanan
      let layananUpdateObj = {
        status: Number(req.body.status),
        pesan: req.body.pesan,
        updated_by: req.user.userId,
      };

      // Validasi menggunakan module fastest-validator
      const validate = v.validate(layananUpdateObj, schema);
      if (validate.length > 0) {
        res.status(400).json(response(400, "validation failed", validate));
        return;
      }

      // Update layanan
      await Layanan_form_num.update(layananUpdateObj, {
        where: {
          id: req.params.idlayanannum,
        },
      });

      // Menentukan pesan socket berdasarkan status

      let pesansocket;
      switch (Number(req.body.status)) {
        case 1:
          pesansocket = "Menunggu";
          break;
        case 2:
          pesansocket = "Sedang Diproses";
          break;
        case 3:
          pesansocket = "Butuh Perbaikan";
          break;
        case 4:
          pesansocket = "Sudah Diperbaiki";
          break;
        case 5:
          pesansocket = "Sedang Divalidasi";
          break;
        case 6:
          pesansocket = "Sudah Divalidasi";
          break;
        case 7:
          pesansocket = "Sedang Ditandatangani";
          break;
        case 8:
          pesansocket = "Sudah Ditandatangani";
          break;
        case 9:
          pesansocket = "Sudah Selesai";
          break;
        case 10:
          pesansocket = "Ditolak";
          break;
        default:
          pesansocket = "Status tidak dikenal";
      }

      // Mendapatkan data layanan setelah update
      let layananAfterUpdate = await Layanan_form_num.findOne({
        where: {
          id: req.params.idlayanannum,
        },
      });

      // Response menggunakan helper response.formatter dengan tambahan pesansocket
      res.status(200).json(
        response(200, "success update layanan", {
          layanan: layananAfterUpdate,
          pesan: pesansocket,
        })
      );
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  uploadSign: async (req, res) => {
    try {
      // Mendapatkan data layanan form num untuk pengecekan
      let signGet = await Layanan_form_num.findOne({
        where: {
          id: req.params.idlayanannum,
        },
      });

      // Cek apakah data layanan form num ada
      if (!signGet) {
        return res
          .status(404)
          .json(response(404, "Layanan form num not found"));
      }

      // Membuat schema untuk validasi
      const schema = {
        sign: { type: "string", optional: true },
      };

      let signKey;

      // Cek apakah file diterima dari request
      if (!req.file) {
        return res
          .status(400)
          .json(response(400, "File tidak ditemukan dalam request"));
      }

      if (req.file) {
        console.log("File diterima:", req.file);

        const timestamp = new Date().getTime();
        const uniqueFileName = `${timestamp}-${req.file.originalname}`;

        // Pengaturan upload ke AWS S3
        const uploadParams = {
          Bucket: process.env.AWS_BUCKET,
          Key: `${process.env.PATH_AWS}/sign/${uniqueFileName}`,
          Body: req.file.buffer,
          ACL: "public-read",
          ContentType: req.file.mimetype,
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // Menyimpan URL file yang diunggah
        signKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
        console.log("Sign key setelah upload:", signKey); // Debug untuk memastikan signKey terbentuk
      }

      // Buat object untuk update
      let signUpdateObj = {
        sign: signKey || signGet.sign, // Pakai file baru jika ada, jika tidak, pakai file lama
      };

      // Validasi menggunakan fastest-validator
      const validate = v.validate(signUpdateObj, schema);
      if (validate !== true) {
        return res
          .status(400)
          .json(response(400, "Validation failed", validate));
      }

      // Update data di database
      await Layanan_form_num.update(signUpdateObj, {
        where: {
          id: req.params.idlayanannum,
        },
      });

      // Set timeout untuk memanggil API generate PDF dan upload hasilnya
      setTimeout(async () => {
        try {
          console.log("Memanggil API generate PDF...");

          // Memanggil API generate PDF menggunakan idlayanan dan idforminput yang baru saja dibuat
          let idlayanan = signGet?.layanan_id;
          let idforminput = signGet?.id;

          let apiURL = `${process.env.SERVER_URL}/user/surat/${idlayanan}/${idforminput}`;
          console.log(`URL: ${apiURL}`);

          const responsePDF = await axios.get(apiURL, {
            responseType: "arraybuffer",
            headers: { "Cache-Control": "no-cache" },
          });

          const pdfBuffer = responsePDF.data;
          console.log("PDF berhasil diambil dari API.");

          // Upload PDF ke AWS S3
          const timestamp = new Date().getTime();
          const uniqueFileName = `${timestamp}-${idforminput}.pdf`;

          const uploadParams = {
            Bucket: process.env.AWS_BUCKET,
            Key: `${process.env.PATH_AWS}/file_output/${uniqueFileName}`,
            Body: pdfBuffer,
            ACL: "public-read",
            ContentType: "application/pdf",
          };

          const command = new PutObjectCommand(uploadParams);
          await s3Client.send(command);

          const fileOutputPath = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
          console.log("PDF berhasil di-upload ke AWS S3:", fileOutputPath);

          // Update field fileoutput di tabel Layanan_form_num
          const [affectedRows] = await Layanan_form_num.update(
            { fileoutput: fileOutputPath },
            { where: { id: idforminput } }
          );

          if (affectedRows === 0) {
            console.error("Gagal update field fileoutput.");
          } else {
            console.log("Field fileoutput berhasil diupdate.");
          }
        } catch (error) {
          console.error("Error fetching or uploading PDF:", error);
        }
      }, 5000);

      // Mendapatkan data layanan form num setelah update
      let signAfterUpdate = await Layanan_form_num.findOne({
        where: {
          id: req.params.idlayanannum, // Menggunakan ID dari params
        },
      });

      // Debug data setelah update
      console.log("Data setelah update:", signAfterUpdate);

      // Response sukses
      return res
        .status(200)
        .json(response(200, "Success upload sign", signAfterUpdate));
    } catch (err) {
      console.error("Error:", err);
      return res
        .status(500)
        .json(response(500, "Internal server error", err.message));
    }
  },

  //upload surat hasil permohonan
  uploadFileHasil: async (req, res) => {
    try {
      let dataGet = await Layanan_form_num.findOne({
        where: {
          id: req.params.idlayanannum,
        },
      });

      if (!dataGet) {
        res.status(404).json(response(404, "data not found"));
        return;
      }

      //membuat schema untuk validasi
      const schema = {
        fileoutput: { type: "string", optional: true },
      };

      if (req.files && req.files.file) {
        const file = req.files.file[0];
        const timestamp = new Date().getTime();
        const uniqueFileName = `${timestamp}-${file.originalname}`;

        const uploadParams = {
          Bucket: process.env.AWS_BUCKET,
          Key: `${process.env.PATH_AWS}/file_output/${uniqueFileName}`,
          Body: file.buffer,
          ACL: "public-read",
          ContentType: file.mimetype,
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        dataKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
      }

      //buat object instansi
      let fileUpdateObj = {
        fileoutput: req.files.file ? dataKey : undefined,
      };

      //validasi menggunakan module fastest-validator
      const validate = v.validate(fileUpdateObj, schema);
      if (validate.length > 0) {
        res.status(400).json(response(400, "validation failed", validate));
        return;
      }

      //update instansi
      await Layanan_form_num.update(fileUpdateObj, {
        where: {
          id: req.params.idlayanannum,
        },
      });

      //response menggunakan helper response.formatter
      res.status(200).json(response(200, "success upload output surat"));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  generateQRCode: async (req, res) => {
    try {
        // Mendapatkan data layanan form num untuk pengecekan
        let signGet = await Layanan_form_num.findOne({
            where: {
                id: req.params.idlayanannum,
            },
        });

        // Cek apakah data layanan form num ada
        if (!signGet) {
            return res
                .status(404)
                .json({ message: "Layanan form num not found" });
        }

        const qrContent = `${process.env.SERVER_URL}/user/form/${req.params.idlayanannum}/data/barcode`;

        // Generate QR code ke dalam bentuk data buffer
        const qrCodeBuffer = await QRCode.toBuffer(qrContent);

        const timestamp = new Date().getTime();
        const uniqueFileName = `${timestamp}-${req.params.idlayanannum}.png`;

        // Pengaturan upload ke AWS S3
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET,
            Key: `${process.env.PATH_AWS}/sign/${uniqueFileName}`,
            Body: qrCodeBuffer,
            ACL: "public-read",
            ContentType: "image/png",
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // Menyimpan URL QR code yang diunggah
        const qrCodeURL = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
        console.log("QR Code URL setelah upload:", qrCodeURL);

        // Buat object untuk update
        let signUpdateObj = {
            sign: qrCodeURL, // QR code URL disimpan di field `sign`
        };

        // Update data di database
        await Layanan_form_num.update(signUpdateObj, {
            where: {
                id: req.params.idlayanannum,
            },
        });

        // Set timeout untuk memanggil API generate PDF dan upload hasilnya
        setTimeout(async () => {
            try {
                console.log("Memanggil API generate PDF...");

                // Memanggil API generate PDF menggunakan idlayanan dan idforminput yang baru saja dibuat
                let idlayanan = signGet?.layanan_id;
                let idforminput = signGet?.id;

                let apiURL = `${process.env.SERVER_URL}/user/surat/${idlayanan}/${idforminput}`;
                console.log(`URL: ${apiURL}`);

                const responsePDF = await axios.get(apiURL, {
                    responseType: "arraybuffer",
                    headers: { "Cache-Control": "no-cache" },
                });

                const pdfBuffer = responsePDF.data;
                console.log("PDF berhasil diambil dari API.");

                // Upload PDF ke AWS S3
                const pdfFileName = `${timestamp}-${idforminput}.pdf`;

                const pdfUploadParams = {
                    Bucket: process.env.AWS_BUCKET,
                    Key: `${process.env.PATH_AWS}/file_output/${pdfFileName}`,
                    Body: pdfBuffer,
                    ACL: "public-read",
                    ContentType: "application/pdf",
                };

                const pdfCommand = new PutObjectCommand(pdfUploadParams);
                await s3Client.send(pdfCommand);

                const fileOutputPath = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${pdfUploadParams.Key}`;
                console.log("PDF berhasil di-upload ke AWS S3:", fileOutputPath);

                // Update field fileoutput di tabel Layanan_form_num
                const [affectedRows] = await Layanan_form_num.update(
                    { fileoutput: fileOutputPath },
                    { where: { id: idforminput } }
                );

                if (affectedRows === 0) {
                    console.error("Gagal update field fileoutput.");
                } else {
                    console.log("Field fileoutput berhasil diupdate.");
                }
            } catch (error) {
                console.error("Error fetching or uploading PDF:", error);
            }
        }, 5000);

        // Mendapatkan data layanan form num setelah update
        let signAfterUpdate = await Layanan_form_num.findOne({
            where: {
                id: req.params.idlayanannum,
            },
        });

        // Response sukses
        return res.status(200).json({status: 200, message: "Success upload QR code",data: signAfterUpdate});
      } catch (err) {
        console.error("Error:", err);
        return res
            .status(500)
            .json({ message: "Internal server error", error: err.message });
    }
  },

  getBarcode: async (req, res) => {
    try {
        let signGet = await Layanan_form_num.findOne({
            where: {
                id: req.params.idlayanannum,
            },
            attributes: ['id', 'sign', 'createdAt', 'updatedAt'],
        });

        if (!signGet) {
            return res.status(404).json({ message: "Layanan form num not found" });
        }

        const sign = signGet.sign;

        if (!sign) {
            return res.status(404).json({ message: "Sign not found" });
        }

        // Mengembalikan sign
        return res.status(200).json({ sign });
    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({ message: "Internal server error", error: err.message });
    }
  },
  
  getDataBarcode: async (req, res) => {
    try {
      let signGet = await Layanan_form_num.findOne({
          where: {
              id: req.params.idlayanannum,
          },
          include: [
              {
                  model: Layanan,
                  include: [
                      {
                          model: Layanan_surat,
                          attributes: ['footer'],
                      },
                  ],
              },
          ],
      });

      if (!signGet) {
          return res.status(404).json({ message: "Layanan form num not found" });
      }

      const footerText = signGet.Layanan?.Layanan_surat?.footer;
      if (!footerText) {
          return res.status(404).json({ message: "Footer not found for the given service" });
      }

      // Mengembalikan hanya footer dalam JSON
      return res.status(200).json({ footerText });
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).json({ message: "Internal server error", error: err.message });
    }
  },

  //get history input form user
  getHistoryFormUser: async (req, res) => {
    try {
      const search = req.query.search ?? null;
      const status = req.query.status ?? null;
      const range = req.query.range;
      const isonline = req.query.isonline ?? null;
      const userinfo_id = req.user.role === "User" ? req.user.userId : null;
      const bidang_id = Number(req.query.bidang_id);
      const layanan_id = Number(req.query.layanan_id);
      const start_date = req.query.start_date;
      let end_date = req.query.end_date;
      const year = req.query.year ? parseInt(req.query.year) : null;
      const month = req.query.month ? parseInt(req.query.month) : null;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      let history;
      let totalCount;

      const WhereClause = {};
      const WhereClause2 = {};
      const WhereClause3 = {};

      if (
        req.user.role === "Kepala Bidang" ||
        req.user.role === "Admin Verifikasi"
      ) {
        WhereClause2.bidang_id = req.user.bidang_id;
      } else if (
        req.user.role === "Super Admin" ||
        req.user.role === "Kepala Dinas" ||
        req.user.role === "Sekretaris Dinas"
      ) {
      }

      // if (req.user.role === 'Admin Verifikasi' || req.user.role === 'Kepala Bidang') {
      //     WhereClause.layanan_id = req.user.layanan_id;
      // }

      if (range == "today") {
        WhereClause.createdAt = {
          [Op.between]: [
            moment().startOf("day").toDate(),
            moment().endOf("day").toDate(),
          ],
        };
      }

      if (isonline) {
        WhereClause.isonline = isonline;
      }
      if (userinfo_id) {
        WhereClause.userinfo_id = userinfo_id;
      }
      if (status) {
        WhereClause.status = status;
      }
      if (layanan_id) {
        WhereClause.layanan_id = layanan_id;
      }

      if (start_date && end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        WhereClause.createdAt = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      } else if (start_date) {
        WhereClause.createdAt = {
          [Op.gte]: new Date(start_date),
        };
      } else if (end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        WhereClause.createdAt = {
          [Op.lte]: new Date(end_date),
        };
      }

      if (bidang_id) {
        WhereClause2.bidang_id = bidang_id;
      }

      if (search) {
        WhereClause3[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { "$Layanan.nama$": { [Op.like]: `%${search}%` } },
          { "$Layanan->Bidang.nama$": { [Op.like]: `%${search}%` } },
        ];
      }

      if (year && month) {
        WhereClause.createdAt = {
          [Op.between]: [
            new Date(year, month - 1, 1),
            new Date(year, month, 0, 23, 59, 59, 999),
          ],
        };
      } else if (year) {
        WhereClause.createdAt = {
          [Op.between]: [
            new Date(year, 0, 1),
            new Date(year, 11, 31, 23, 59, 59, 999),
          ],
        };
      } else if (month) {
        const currentYear = new Date().getFullYear();
        WhereClause.createdAt = {
          [Op.and]: [
            { [Op.gte]: new Date(currentYear, month - 1, 1) },
            { [Op.lte]: new Date(currentYear, month, 0, 23, 59, 59, 999) },
          ],
        };
      }

      [history, totalCount] = await Promise.all([
        Layanan_form_num.findAll({
          where: WhereClause,
          include: [
            {
              model: Layanan,
              attributes: { exclude: ["createdAt", "updatedAt", "slug"] },
              include: [
                {
                  model: Bidang,
                  attributes: { exclude: ["createdAt", "updatedAt", "slug"] },
                },
              ],
              where: WhereClause2,
            },
            {
              model: User_info,
              attributes: ["name", "nip"],
              where: WhereClause3,
            },
            {
              model: User_info,
              as: "Adminupdate",
              attributes: ["id", "name", "nip"],
            },
          ],
          limit: limit,
          offset: offset,
          order: [["id", "DESC"]],
        }),
        Layanan_form_num.count({
          where: WhereClause,
          include: [
            {
              model: Layanan,
              include: [
                {
                  model: Bidang,
                },
              ],
              where: WhereClause2,
            },
            {
              model: User_info,
              where: WhereClause3,
            },
            {
              model: User_info,
              as: "Adminupdate",
              attributes: ["id", "name", "nik"],
            },
          ],
        }),
      ]);

      let formattedData = history.map((data) => {
        return {
          id: data.id,
          userinfo_id: data?.userinfo_id,
          name: data?.User_info?.name,
          nip: data?.User_info?.nip,
          pesan: data?.pesan,
          admin_updated: data?.Adminupdate,
          status: data?.status,
          tgl_selesai: data?.tgl_selesai,
          // isonline: data?.isonline,
          fileoutput: data?.fileoutput,
          no_request: data?.no_request,
          layanan_id: data?.layanan_id,
          layanan_name: data?.Layanan ? data?.Layanan?.nama : null,
          bidang_id:
            data?.Layanan && data?.Layanan?.Bidang
              ? data?.Layanan?.Bidang.id
              : null,
          bidang_name:
            data?.Layanan && data?.Layanan?.Bidang
              ? data?.Layanan?.Bidang.nama
              : null,
          createdAt: data?.createdAt,
          updatedAt: data?.updatedAt,
        };
      });

      const pagination = generatePagination(
        totalCount,
        page,
        limit,
        `/api/user/history/form`
      );

      res.status(200).json({
        status: 200,
        message: "success get",
        data: formattedData,
        pagination: pagination,
      });
    } catch (err) {
      res.status(500).json(response(500, "Internal server error", err));
      console.log(err);
    }
  },

  //get history dokumen pengajuan user
  getHistoryDokumen: async (req, res) => {
    try {
      const search = req.query.search ?? null;
      const status = req.query.status ?? null;
      const range = req.query.range;
      const year = req.query.year ? parseInt(req.query.year) : null;
      const month = req.query.month ? parseInt(req.query.month) : null;
      let userinfo_id;
      if (req.user.role === "User") {
        userinfo_id = req.user.userId;
      } else {
        userinfo_id = req.query.userId;
      }

      const bidang_id = Number(req.query.bidang_id);
      const layanan_id = Number(req.query.layanan_id);
      const start_date = req.query.start_date;
      let end_date = req.query.end_date;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      let history;
      let totalCount;

      const WhereClause = {};
      const WhereClause2 = {};
      const WhereClause3 = {};

      if (
        req.user.role === "Admin Verifikasi" ||
        req.user.role === "Kepala Bidang"
      ) {
        WhereClause2.bidang_id = req.user.bidang_id;
      }

      WhereClause.status = 9;

      if (range == "today") {
        WhereClause.createdAt = {
          [Op.between]: [
            moment().startOf("day").toDate(),
            moment().endOf("day").toDate(),
          ],
        };
      }

      if (userinfo_id) {
        WhereClause.userinfo_id = userinfo_id;
      }
      if (status) {
        WhereClause.status = status;
      }
      if (layanan_id) {
        WhereClause.layanan_id = layanan_id;
      }

      if (year && month) {
        WhereClause.createdAt = {
          [Op.between]: [
            new Date(year, month - 1, 1),
            new Date(year, month, 0, 23, 59, 59, 999),
          ],
        };
      } else if (year) {
        WhereClause.createdAt = {
          [Op.between]: [
            new Date(year, 0, 1),
            new Date(year, 11, 31, 23, 59, 59, 999),
          ],
        };
      } else if (month) {
        const currentYear = new Date().getFullYear();
        WhereClause.createdAt = {
          [Op.and]: [
            { [Op.gte]: new Date(currentYear, month - 1, 1) },
            { [Op.lte]: new Date(currentYear, month, 0, 23, 59, 59, 999) },
          ],
        };
      }


      if (start_date && end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        WhereClause.createdAt = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      } else if (start_date) {
        WhereClause.createdAt = {
          [Op.gte]: new Date(start_date),
        };
      } else if (end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        WhereClause.createdAt = {
          [Op.lte]: new Date(end_date),
        };
      }

      if (bidang_id) {
        WhereClause2.bidang_id = bidang_id;
      }

      if (search) {
        WhereClause3.name = {
          [Op.like]: `%${search}%`,
        };
      }

      [history, totalCount] = await Promise.all([
        Layanan_form_num.findAll({
          where: WhereClause,
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
              where: WhereClause2,
            },
            {
              model: User_info,
              attributes: ["name", "nip"],
              where: WhereClause3,
            },
          ],
          limit: limit,
          offset: offset,
          order: [["id", "DESC"]],
        }),
        Layanan_form_num.count({
          where: WhereClause,
          include: [
            {
              model: Layanan,
              where: WhereClause2,
            },
            {
              model: User_info,
              where: WhereClause3,
            },
          ],
        }),
      ]);

      // Restructure the data to show Instansi first
      let bidangMap = {};

      history.forEach((data) => {
        const bidangId = data?.Layanan?.Bidang?.id;
        const bidangName = data?.Layanan?.Bidang?.nama;

        if (!bidangMap[bidangId]) {
          bidangMap[bidangId] = {
            bidang_id: bidangId,
            bidang_name: bidangName,
            dokumen: [],
          };
        }

        bidangMap[bidangId].dokumen.push({
          id: data.id,
          userinfo_id: data?.userinfo_id,
          tgl_selesai: data?.tgl_selesai,
          layanan_name: data?.Layanan ? data?.Layanan?.nama : null,
          createdAt: data?.createdAt,
          updatedAt: data?.updatedAt,
          fileoutput: data?.fileoutput,
          no_request: data?.no_request,
        });
      });

      const formattedData = Object.values(bidangMap);

      const pagination = generatePagination(
        totalCount,
        page,
        limit,
        `/api/user/history/dokumen`
      );

      res.status(200).json({
        status: 200,
        message: "success get",
        data: formattedData,
        pagination: pagination,
      });
    } catch (err) {
      res.status(500).json(response(500, "Internal server error", err));
      console.log(err);
    }
  },

  getHistoryById: async (req, res) => {
    try {
      let Layananformnumget = await Layanan_form_num.findOne({
        where: {
          id: req.params.idforminput,
        },
        include: [
          {
            model: Layanan,
            attributes: { exclude: ["createdAt", "updatedAt", "slug"] },
            include: [
              {
                model: Bidang,
                attributes: { exclude: ["createdAt", "updatedAt", "slug"] },
              },
            ],
          },
          {
            model: User_info,
            attributes: ["name"],
          },
          {
            model: User_info,
            as: "Adminupdate",
            attributes: ["id", "name", "nip"],
          },
        ],
      });

      if (!Layananformnumget) {
        res.status(404).json(response(404, "data not found"));
        return;
      }

      let feedbackGet = await User_feedback.findOne({
        where: {
          userinfo_id: Layananformnumget.userinfo_id,
          layanan_id: Layananformnumget.layanan_id,
        },
      });

      let formattedData = {
        id: Layananformnumget?.id,
        userinfo_id: Layananformnumget?.userinfo_id,
        name: Layananformnumget?.User_info
          ? Layananformnumget?.User_info?.name
          : null,
        no_request: Layananformnumget?.no_request,
        status: Layananformnumget?.status,
        pesan: Layananformnumget?.pesan,
        admin_updated: Layananformnumget?.Adminupdate,
        tgl_selesai: req.user?.tgl_selesai,
        layanan_id: Layananformnumget?.layanan_id,
        layanan_name: Layananformnumget?.Layanan
          ? Layananformnumget?.Layanan?.nama
          : null,
        bidang_id:
          Layananformnumget?.Layanan && Layananformnumget?.Layanan?.Bidang
            ? Layananformnumget?.Layanan?.Bidang.id
            : null,
        bidang_name:
          Layananformnumget?.Layanan && Layananformnumget?.Layanan?.Bidang
            ? Layananformnumget?.Layanan?.Bidang.nama
            : null,
        fileoutput: Layananformnumget?.fileoutput,
        user_feedback: feedbackGet ? true : false,
        createdAt: Layananformnumget?.createdAt,
        updatedAt: Layananformnumget?.updatedAt,
      };

      res.status(200).json(response(200, "success get", formattedData));
    } catch (err) {
      res.status(500).json(response(500, "Internal server error", err));
      console.log(err);
    }
  },

  pdfHistoryFormUser: async (req, res) => {
    try {
      const search = req.query.search ?? null;
      const status = req.query.status ?? null;
      const range = req.query.range;
      const isonline = req.query.isonline ?? null;
      const userinfo_id = data.role === "User" ? data.userId : null;
      let instansi_id = Number(req.query.instansi_id);
      let layanan_id = Number(req.query.layanan_id);
      const start_date = req.query.start_date;
      let end_date = req.query.end_date;
      const year = req.query.year ? parseInt(req.query.year) : null;
      const month = req.query.month ? parseInt(req.query.month) : null;

      let history;

      const WhereClause = {};
      const WhereClause2 = {};
      const WhereClause3 = {};

      if (
        data.role === "Admin Instansi" ||
        data.role === "Admin Verifikasi" ||
        data.role === "Admin Layanan"
      ) {
        instansi_id = data.instansi_id;
      }

      if (data.role === "Admin Layanan") {
        layanan_id = data.layanan_id;
      }

      if (range == "today") {
        WhereClause.createdAt = {
          [Op.between]: [
            moment().startOf("day").toDate(),
            moment().endOf("day").toDate(),
          ],
        };
      }

      if (isonline) {
        WhereClause.isonline = isonline;
      }
      if (userinfo_id) {
        WhereClause.userinfo_id = userinfo_id;
      }
      if (status) {
        WhereClause.status = status;
      }
      if (layanan_id) {
        WhereClause.layanan_id = layanan_id;
      }

      if (start_date && end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        WhereClause.createdAt = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      } else if (start_date) {
        WhereClause.createdAt = {
          [Op.gte]: new Date(start_date),
        };
      } else if (end_date) {
        end_date = new Date(end_date);
        end_date.setHours(23, 59, 59, 999);
        WhereClause.createdAt = {
          [Op.lte]: new Date(end_date),
        };
      }

      if (instansi_id) {
        WhereClause2.instansi_id = instansi_id;
      }

      if (search) {
        WhereClause3[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { "$Layanan.name$": { [Op.like]: `%${search}%` } },
          { "$Layanan->Instansi.name$": { [Op.like]: `%${search}%` } },
        ];
      }

      if (year && month) {
        WhereClause.createdAt = {
          [Op.between]: [
            new Date(year, month - 1, 1),
            new Date(year, month, 0, 23, 59, 59, 999),
          ],
        };
      } else if (year) {
        WhereClause.createdAt = {
          [Op.between]: [
            new Date(year, 0, 1),
            new Date(year, 11, 31, 23, 59, 59, 999),
          ],
        };
      } else if (month) {
        // Hanya bulan ditentukan
        const currentYear = new Date().getFullYear();
        WhereClause.createdAt = {
          [Op.and]: [
            { [Op.gte]: new Date(currentYear, month - 1, 1) },
            { [Op.lte]: new Date(currentYear, month, 0, 23, 59, 59, 999) },
          ],
        };
      }

      history = await Promise.all([
        Layananformnum.findAll({
          where: WhereClause,
          include: [
            {
              model: Layanan,
              attributes: {
                exclude: ["createdAt", "updatedAt", "status", "slug"],
              },
              include: [
                {
                  model: Instansi,
                  attributes: {
                    exclude: ["createdAt", "updatedAt", "status", "slug"],
                  },
                },
              ],
              where: WhereClause2,
            },
            {
              model: Userinfo,
              attributes: ["name", "nik"],
              where: WhereClause3,
            },
          ],
          order: [["id", "DESC"]],
        }),
      ]);

      let formattedData = history[0].map((data) => {
        return {
          id: data.id,
          userinfo_id: data?.userinfo_id,
          name: data?.Userinfo?.name,
          nik: data?.Userinfo?.nik,
          pesan: data?.pesan,
          status: data?.status,
          tgl_selesai: data?.tgl_selesai,
          isonline: data?.isonline,
          layanan_id: data?.layanan_id,
          layanan_name: data?.Layanan ? data?.Layanan?.name : null,
          layanan_image: data?.Layanan ? data?.Layanan?.image : null,
          instansi_id:
            data?.Layanan && data?.Layanan?.Instansi
              ? data?.Layanan?.Instansi.id
              : null,
          instansi_name:
            data?.Layanan && data?.Layanan?.Instansi
              ? data?.Layanan?.Instansi.name
              : null,
          instansi_image:
            data?.Layanan && data?.Layanan?.Instansi
              ? data?.Layanan?.Instansi.image
              : null,
          createdAt: data?.createdAt,
          updatedAt: data?.updatedAt,
          fileoutput: data?.fileoutput,
          filesertif: data?.filesertif,
          no_request: data?.no_request,
        };
      });

      // Generate HTML content for PDF
      const templatePath = path.resolve(
        __dirname,
        "../views/permohonanperlayanan.html"
      );
      let htmlContent = fs.readFileSync(templatePath, "utf8");
      let layananGet, instansiGet;

      if (layanan_id) {
        layananGet = await Layanan.findOne({
          where: {
            id: layanan_id,
          },
        });
      }

      if (instansi_id) {
        instansiGet = await Instansi.findOne({
          where: {
            id: instansi_id,
          },
        });
      }

      const instansiInfo = instansiGet?.name
        ? `<p>Instansi : ${instansiGet?.name}</p>`
        : "";
      const layananInfo = layananGet?.name
        ? `<p>Layanan : ${layananGet?.name}</p>`
        : "";
      let tanggalInfo = "";
      if (start_date || end_date) {
        const startDateFormatted = start_date
          ? new Date(start_date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "";
        const endDateFormatted = end_date
          ? new Date(end_date).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "";
        tanggalInfo = `<p>Periode Tanggal : ${startDateFormatted} s.d. ${
          endDateFormatted ? endDateFormatted : "Hari ini"
        } </p>`;
      }

      if (range === "today") {
        tanggalInfo = `<p>Periode Tanggal : Hari ini </p>`;
      }

      const getStatusText = (status) => {
        switch (status) {
          case 0:
            return "Belum Divalidasi";
          case 1:
            return "Sudah Divalidasi";
          case 2:
            return "Sudah Disetujui";
          case 3:
            return "Proses Selesai";
          case 4:
            return "Ditolak";
          case 5:
            return "Perbaikan/Revisi";
          case 6:
            return "Diperbaiki";
          default:
            return "Status Tidak Diketahui";
        }
      };

      const reportTableRows = formattedData
        ?.map((permohonan) => {
          const createdAtDate = new Date(
            permohonan.createdAt
          ).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
          const createdAtTime = new Date(
            permohonan.createdAt
          ).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          const statusText = getStatusText(permohonan.status);

          return `
                    <tr>
                        <td class="center">${createdAtDate}</td>
                        <td class="center">${createdAtTime} WIB</td>
                        <td>${permohonan.nik}</td>
                        <td>${permohonan.name}</td>
                        <td class="center">${statusText}</td>
                    </tr>
                `;
        })
        .join("");

      htmlContent = htmlContent.replace("{{instansiInfo}}", instansiInfo);
      htmlContent = htmlContent.replace("{{layananInfo}}", layananInfo);
      htmlContent = htmlContent.replace("{{tanggalInfo}}", tanggalInfo);
      htmlContent = htmlContent.replace("{{reportTableRows}}", reportTableRows);

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      // Set HTML content
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        margin: {
          top: "1.16in",
          right: "1.16in",
          bottom: "1.16in",
          left: "1.16in",
        },
      });

      await browser.close();

      // Generate filename
      const currentDate = new Date().toISOString().replace(/:/g, "-");
      const filename = `surat-output-${currentDate}.pdf`;

      // Send PDF buffer
      res.setHeader(
        "Content-disposition",
        'attachment; filename="' + filename + '"'
      );
      res.setHeader("Content-type", "application/pdf");
      res.send(pdfBuffer);
    } catch (err) {
      res.status(500).json(response(500, "Internal server error", err));
      console.log(err);
    }
  },
};
