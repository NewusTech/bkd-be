const { response } = require("../helpers/response.formatter");

const { Manual_book, Role } = require("../models");

const Validator = require("fastest-validator");
const v = new Validator();
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
  //mendapatkan data manualbook berdasarkan id
  getManualBook: async (req, res) => {
    try {
      let { search } = req.query;

      const whereCondition = {};

      if (search) {
        whereCondition[Op.or] = [
          { "$Role.name$": { [Op.like]: `%${search}%` } },
        ];
      }

      let manualbookGet = await Manual_book.findAll({
        include: [
          {
            model: Role,
          },
        ],
        where: whereCondition,
      });

      //cek jika manualbook tidak ada
      if (!manualbookGet) {
        res.status(404).json(response(404, "manual book not found"));
        return;
      }

      let modifiedManualbookGet = manualbookGet.map((item) => ({
        id: item?.id,
        title: item?.title,
        dokumen: item?.dokumen,
        video_tutorial: item.video_tutorial,
        role_id: item?.role_id,
        createdAt: item?.createdAt,
        updatedAt: item?.updatedAt,
        role_name: item?.Role?.name,
      }));

      res.status(200).json(response(200, "success get", modifiedManualbookGet));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  getManualBookById: async (req, res) => {
    try {
      //mendapatkan data manualbook berdasarkan id
      let manualbookGet = await Manual_book.findOne({
        where: {
          id: req.params.id,
        },
        include: [
          {
            model: Role,
          },
        ],
      });

      //cek jika manualbook tidak ada
      if (!manualbookGet) {
        res.status(404).json(response(404, "manual book not found"));
        return;
      }

      let modifiedManualbookGet = {
        id: manualbookGet?.id,
        title: manualbookGet?.title,
        dokumen: manualbookGet?.dokumen,
        video_tutorial: manualbookGet?.video_tutorial,
        role_id: manualbookGet?.role_id,
        createdAt: manualbookGet?.createdAt,
        updatedAt: manualbookGet?.updatedAt,
        role_name: manualbookGet?.Role?.name,
      };

      res.status(200).json(response(200, "success get", modifiedManualbookGet));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },

  //mengupdate manualbook berdasarkan id
  updateManualBook: async (req, res) => {
    try {
      let manualbookGet = await Manual_book.findOne({
        where: {
          id: req.params.id,
        },
      });
  
      // Cek apakah data manualbook ada
      if (!manualbookGet) {
        res.status(404).json(response(404, "manual book not found"));
        return;
      }
  
      // Membuat schema untuk validasi
      const schema = {
        title: { type: "string", optional: true },
        dokumen: { type: "string", optional: true },
        video_tutorial: { type: "string", optional: true },
      };
  
      let manualbookKey;
      let videoTutorialKey;
  
      // Proses upload dokumen jika ada
      if (req.files && req.files.dokumen) {
        const file = req.files.dokumen[0];
        const timestamp = new Date().getTime();
        const uniqueFileName = `${timestamp}-${file.originalname}`;
  
        const uploadParams = {
          Bucket: process.env.AWS_BUCKET,
          Key: `${process.env.PATH_AWS}/manualbook/${uniqueFileName}`,
          Body: file.buffer,
          ACL: "public-read",
          ContentType: file.mimetype,
        };
  
        const command = new PutObjectCommand(uploadParams);

        const uploadResponse = await s3Client.send(command);
        console.log("Upload Response:", uploadResponse);
  
        manualbookKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
      }
  
      // Proses upload video_tutorial jika ada
      if (req.files && req.files.video_tutorial) {
        const file = req.files.video_tutorial[0];
        const timestamp = new Date().getTime();
        const uniqueFileName = `${timestamp}-${file.originalname}`;
  
        const uploadParams = {
          Bucket: process.env.AWS_BUCKET,
          Key: `${process.env.PATH_AWS}/manualbook/${uniqueFileName}`,
          Body: file.buffer,
          ACL: "public-read",
          ContentType: file.mimetype,
        };
  
        const command = new PutObjectCommand(uploadParams);
  
        const uploadResponse = await s3Client.send(command);
        console.log("Upload Response Video:", uploadResponse);
  
        videoTutorialKey = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${uploadParams.Key}`;
      }
  
      let manualbookUpdateObj = {
        title: req.body.title,
      };
  
      if (manualbookKey) {
        manualbookUpdateObj.dokumen = manualbookKey;
      }
  
      if (videoTutorialKey) {
        manualbookUpdateObj.video_tutorial = videoTutorialKey;
      }

      const validate = v.validate(manualbookUpdateObj, schema);
      if (validate.length > 0) {
        res.status(400).json(response(400, "validation failed", validate));
        return;
      }
  
      await Manual_book.update(manualbookUpdateObj, {
        where: { id: req.params.id },
      });
  
      // Mendapatkan data manualbook setelah update
      let manualbookAfterUpdate = await Manual_book.findOne({
        where: {
          id: req.params.id,
        },
      });
  
      res.status(200).json( response(200, "success update manual book", manualbookAfterUpdate));
    } catch (err) {
      res.status(500).json(response(500, "internal server error", err));
      console.log(err);
    }
  },
  
};
