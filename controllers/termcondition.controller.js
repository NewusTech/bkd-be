const { response } = require('../helpers/response.formatter');

const { Term_condition } = require('../models');

const Validator = require("fastest-validator");
const v = new Validator();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    useAccelerateEndpoint: true
});

module.exports = {
    getTermCondition: async (req, res) => {
        try {
            //get data by id
            let termcondGet = await Term_condition.findOne();

            if (!termcondGet) {
                res.status(404).json(response(404, 'term condition not found'));
                return;
            }
            res.status(200).json(response(200, 'success get term condition by id', termcondGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate berdasarkan id
    updateTermCondition: async (req, res) => {
        try {
            let termcondGet = await Term_condition.findOne()

            //cek apakah data termcond ada
            if (!termcondGet) {
                res.status(404).json(response(404, 'term condition not found'));
                return;
            }

            const schema = {
                desc: {
                    type: "string",
                    min: 3,
                    optional: true
                },
                privacy: {
                    type: "string",
                    min: 3,
                    optional: true
                },
                privacy_text: {
                    type: "string",
                    min: 3,
                    optional: true
                },
                desc_text: {
                    type: "string",
                    min: 3,
                    optional: true
                },
            }

            let descKey, privacyKey;

            if (req.files && req.files.desc) {
                const file = req.files.desc[0];
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: `${process.env.PATH_AWS}/descterm/${uniqueFileName}`,
                    Body: file.buffer,
                    ACL: 'public-read',
                    ContentType: file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                descKey = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
            }

            if (req.files && req.files.privacy) {
                const file = req.files.privacy[0];
                const timestamp = new Date().getTime();
                const uniqueFileName = `${timestamp}-${file.originalname}`;

                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: `${process.env.PATH_AWS}/privasiterm/${uniqueFileName}`,
                    Body: file.buffer,
                    ACL: 'public-read',
                    ContentType: file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);

                await s3Client.send(command);

                privacyKey = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
            }
              let descUpdateObj = {
                desc: req.files.desc ? descKey : undefined,
                desc_text: req.body.desc_text,
                privacy: req.files.privacy ? privacyKey : undefined,
                privacy_text: req.body.privacy_text,
            };

            const validate = v.validate(descUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            // Update desc
            await Term_condition.update(descUpdateObj, {
                where: { id: termcondGet.id },
            });
            let descAfterUpdate = await Term_condition.findOne();

            res.status(200).json(response(200, 'success update term condition', descAfterUpdate));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

}