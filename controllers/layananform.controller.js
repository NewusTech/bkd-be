const { response } = require('../helpers/response.formatter');

const { Layanan, Layanan_form, sequelize } = require('../models');
require('dotenv').config()

const { Op } = require('sequelize');
const Validator = require("fastest-validator");
const v = new Validator();

module.exports = {

    // LAYANAN FORM

    //membuat layananform
    createLayananForm: async (req, res) => {
        try {

            //membuat schema untuk validasi
            const schema = {
                field: {
                    type: "string",
                    min: 1,
                },
                tipedata: {
                    type: "string",
                    min: 1,
                    optional: true
                },
                maxinput: {
                    type: "number",
                    optional: true
                },
                mininput: {
                    type: "number",
                    optional: true
                },
                status: {
                    type: "boolean",
                    optional: true
                },
                isrequired: {
                    type: "number",
                    optional: true
                },
                layanan_id: {
                    type: "number",
                    optional: true
                },
                datajson: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "number" },
                            key: { type: "string" }
                        },
                        required: ["id", "key"]
                    },
                    optional: true
                }
            }

            //buat object layananform
            let layananformCreateObj = {
                field: req.body.field,
                tipedata: req.body.tipedata,
                maxinput: req.body.maxinput ? Number(req.body.maxinput) : null,
                mininput: req.body.mininput ? Number(req.body.mininput) : null,
                isrequired: req.body.isrequired ? Number(req.body.isrequired) : null,
                status: req.body.status !== undefined ? Boolean(req.body.status) : true, 
                layanan_id: req.body.layanan_id !== undefined ? Number(req.body.layanan_id) : null,
                datajson: req.body.datajson || null
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(layananformCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //buat layananform
            let layananformCreate = await Layanan_form.create(layananformCreateObj);

            //response menggunakan helper response.formatter
            res.status(201).json(response(201, 'success create layananform', layananformCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    createMultiLayananForm: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            // Define schema for validation
            const schema = {
                field: { type: "string", min: 1 },
                tipedata: { type: "string", min: 1 },
                maxinput: { type: "number", optional: true },
                mininput: { type: "number", optional: true },
                status: { type: "boolean", optional: true },
                isrequired: { type: "number", optional: true },
                layanan_id: { type: "number", optional: true },
                datajson: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "number" },
                            key: { type: "string" }
                        },
                        required: ["id", "key"]
                    },
                    optional: true
                }
            };

            // Check if the request body is an array
            if (!Array.isArray(req.body)) {
                res.status(400).json(response(400, 'Request body must be an array of objects'));
                return;
            }

            // Initialize arrays for validation errors and successfully created objects
            let errors = [];
            let createdForms = [];

            // Validate and process each object in the input array
            for (let input of req.body) {
                // Create the layananform object
                let layananformCreateObj = {
                    field: input.field,
                    tipedata: input.tipedata,
                    maxinput: input.maxinput ? Number(input.maxinput) : null,
                    mininput: input.mininput ? Number(input.mininput) : null,
                    isrequired: input.isrequired ? Number(input.isrequired) : null,
                    status: input.status !== undefined ? Boolean(input.status) : true,
                    layanan_id: input.layanan_id !== undefined ? Number(input.layanan_id) : null,
                    datajson: input.datajson || null
                };

                // Validate the object
                const validate = v.validate(layananformCreateObj, schema);
                if (validate.length > 0) {
                    errors.push({ input, errors: validate });
                    continue;
                }

                // Create layananform in the database
                let layananformCreate = await Layanan_form.create(layananformCreateObj, { transaction });
                createdForms.push(layananformCreate);
            }

            // If there are validation errors, respond with them
            if (errors.length > 0) {
                res.status(400).json(response(400, 'Validation failed', errors));
                return;
            }

            // Respond with the successfully created objects
            await transaction.commit();
            res.status(201).json(response(201, 'Successfully created layananform(s)', createdForms));
        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua form berdasarkan layanan
    getFormByLayanan: async (req, res) => {
        try {
            const { layananid } = req.params;
    
            let formWhereCondition = {
                tipedata: {
                    [Op.ne]: "file"
                },
                status: true
            };
    
            if (req.user.role === 'User') {
                formWhereCondition.status = true;
            }
    
            let layananData = await Layanan.findOne({
                where: {
                    id: layananid,
                    deletedAt: null
                },
                attributes: ['nama', 'slug', 'desc'],
                include: [{
                    model: Layanan_form,
                    attributes: { exclude: ['createdAt', 'updatedAt'] },
                    where: formWhereCondition,
                    required: false,
                }],
                order: [[{ model: Layanan_form }, 'id', 'ASC']]
            });
    
            if (!layananData) {
                return res.status(404).json(response(404, 'Layanan not found'));
            }
    
            res.status(200).json(response(200, 'Success get layanan with forms', layananData));
        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua data layananform
    getLayananForm: async (req, res) => {
        try {
            //mendapatkan data semua layananform
            let layananformGets = await Layanan_form.findAll({
                where: {
                    status: true
                }});
            

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get layananform', layananformGets));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan data layananform berdasarkan id
    getLayananFormById: async (req, res) => {
        try {
            //mendapatkan data layananform berdasarkan id
            let layananformGet = await Layanan_form.findOne({
                where: {
                    id: req.params.id,
                    status: true
                },
            });

            if (req.user.role !== 'Super Admin') {
                return res.status(403).send("Unauthorized: Insufficient role");
            }
            

            //cek jika layananform tidak ada
            if (!layananformGet) {
                res.status(404).json(response(404, 'layananform not found'));
                return;
            }

            //response menggunakan helper response.formatter
            res.status(200).json(response(200, 'success get layananform by id', layananformGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate layananform berdasarkan id
    updateLayananForm: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            // Mendapatkan data layananform untuk pengecekan
            let layananformGet = await Layanan_form.findOne({
                where: {
                    id: req.params.id
                }
            });
    
            // Cek apakah data layananform ada
            if (!layananformGet) {
                await transaction.rollback();
                return res.status(404).json(response(404, 'layananform not found'));
            }
    
            await Layanan_form.update({ status: 0 }, {
                where: {
                    id: req.params.id
                },
                transaction
            });
    
            // Membuat schema untuk validasi
            const schema = {
                field: {
                    type: "string",
                    min: 1,
                    optional: true
                },
                tipedata: {
                    type: "string",
                    min: 1,
                    optional: true
                },
                maxinput: {
                    type: "number",
                    optional: true
                },
                mininput: {
                    type: "number",
                    optional: true
                },
                status: {
                    type: "boolean",
                    optional: true
                },
                isrequired: {
                    type: "number",
                    optional: true
                },
                layanan_id: {
                    type: "number",
                    optional: true
                },
                datajson: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "number" },
                            key: { type: "string" }
                        },
                        required: ["id", "key"]
                    },
                    optional: true
                }
            };
    
            // Buat object layananform baru
            let layananformCreateObj = {
                field: req.body.field,
                tipedata: req.body.tipedata,
                maxinput: req.body.maxinput ? Number(req.body.maxinput) : null,
                mininput: req.body.mininput ? Number(req.body.mininput) : null,
                isrequired: req.body.isrequired ? Number(req.body.isrequired) : null,
                status: true,
                layanan_id: req.body.layanan_id !== undefined ? Number(req.body.layanan_id) : layananformGet.layanan_id,
                datajson: req.body.datajson || null
            };
   
            const validate = v.validate(layananformCreateObj, schema);
            if (validate.length > 0) {
                await transaction.rollback();
                return res.status(400).json(response(400, 'validation failed', validate));
            }
    
            // Membuat form baru di database
            let layananformCreate = await Layanan_form.create(layananformCreateObj, { transaction });
    
            await transaction.commit();
    
            // Mendapatkan data layananform baru yang dibuat
            let layananformAfterCreate = await Layanan_form.findOne({
                where: {
                    id: layananformCreate.id,
                }
            });

            return res.status(200).json(response(200, 'success update and create new layananform', layananformAfterCreate));
        } catch (err) {
            await transaction.rollback();
            return res.status(500).json(response(500, 'internal server error', err));
        }
    },

    //mengupdate layanan form
    updateMultiLayananForm: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const schema = {
                id: { type: "number", min: 1, optional: true },
                field: { type: "string", min: 1 },
                tipedata: { type: "string", min: 1, optional: true },
                maxinput: { type: "number", optional: true },
                mininput: { type: "number", optional: true },
                status: { type: "boolean", optional: true },
                isrequired: { type: "number", optional: true },
                datajson: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "number" },
                            key: { type: "string" }
                        },
                        required: ["id", "key"]
                    },
                    optional: true
                }
            };
    
            // Ambil layanan_id dari URL parameter
            // const layanan_id = req.params.layananid;
            // if (!layanan_id) {
            //     return res.status(400).json(response(400, 'layanan_id URL param is required'));
            // }
    
            // Check if the request body is an array
            if (!Array.isArray(req.body)) {
                return res.status(400).json(response(400, 'Request body must be an array of objects'));
            }
    
            // Initialize arrays for validation errors and successfully updated objects
            let errors = [];
            let updatedForms = [];
            let createdForms = [];
    
            // Validate and process each object in the input array
            for (let input of req.body) {
                // Check if the layananform exists
                let layananformGet = await Layanan_form.findOne({
                    where: {
                        id: input.id
                    }
                });
    
                if (!layananformGet) {
                    errors.push({ input, errors: ['layananform not found'] });
                    continue;
                }
    
                // Update the status of the existing form to 0
                await Layanan_form.update(
                    { status: 0 }, // Update status to 0
                    { where: { id: input.id }, transaction }
                );
    
                // Create the new layananform object for insertion
                let layananformCreateObj = {
                    field: input.field,
                    tipedata: input.tipedata,
                    maxinput: input.maxinput ? Number(input.maxinput) : null,
                    mininput: input.mininput ? Number(input.mininput) : null,
                    isrequired: input.isrequired ? Number(input.isrequired) : null,
                    status: input.status !== undefined ? Boolean(input.status) : true,
                    layanan_id: req.body.layanan_id !== undefined ? Number(req.body.layanan_id) : layananformGet.layanan_id,
                    datajson: input.datajson || null
                };
    
                // Validate the new object
                const validate = v.validate(layananformCreateObj, schema);
                if (validate.length > 0) {
                    errors.push({ input, errors: validate });
                    continue;
                }
    
                // Create new layananform in the database
                let layananformCreate = await Layanan_form.create(layananformCreateObj, { transaction });
                createdForms.push(layananformCreate);
            }
    
            // If there are validation errors, respond with them
            if (errors.length > 0) {
                await transaction.rollback();
                return res.status(400).json(response(400, 'Validation failed', errors));
            }
    
            // Commit transaction if everything is fine
            await transaction.commit();
            return res.status(200).json(response(200, 'Successfully updated and created new layananform(s)', { createdForms }));
        } catch (err) {
            await transaction.rollback();
            console.log(err);
            return res.status(500).json(response(500, 'Internal server error', err));
        }
    },

    //menghapus layananform berdasarkan id
    deleteLayananForm: async (req, res) => {
        try {
            let layananformGet = await Layanan_form.findOne({
                where: {
                    id: req.params.id
                }
            });
    
            // Cek apakah data layananform ada
            if (!layananformGet) {
                res.status(404).json(response(404, 'layananform not found'));
                return;
            }
    
            await Layanan_form.update(
                { status: false },
                {
                    where: { id: req.params.id }
                }
            );
    
            // Response sukses
            res.status(200).json(response(200, 'Success delete layanan form')); 
        } catch (err) {
            if (err.name === 'SequelizeForeignKeyConstraintError') {
                res.status(400).json(response(400, 'Data tidak bisa diubah karena masih digunakan pada tabel lain'));
            } else {
                res.status(500).json(response(500, 'Internal server error', err));
                console.log(err);
            }
        }
    },
    

    // LAYANAN DOCS

    //membuat layanandocs
    createLayananDocs: async (req, res) => {
        try {

            //membuat schema untuk validasi
            const schema = {
                field: {
                    type: "string",
                    min: 1,
                },
                tipedata: {
                    type: "string",
                    min: 1,
                    optional: true
                },
                status: {
                    type: "boolean",
                    optional: true
                },
                isrequired: {
                    type: "number",
                    optional: true
                },
                layanan_id: {
                    type: "number",
                    optional: true
                },
            }

            //buat object layanandocs
            let layanandocsCreateObj = {
                field: req.body.field,
                tipedata: req.body.tipedata,
                isrequired: Number(req.body.isrequired),
                status: req.body.status !== undefined ? Boolean(req.body.status) : true, 
                layanan_id: req.body.layanan_id !== undefined ? Number(req.body.layanan_id) : null,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(layanandocsCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //buat layanandocs
            let layanandocsCreate = await Layanan_form.create(layanandocsCreateObj);

            //response menggunakan helper response.docsatter
            res.status(201).json(response(201, 'success create layanan docs', layanandocsCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    createMultiLayananDocs: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            // Define schema for validation
            const schema = {
                field: { type: "string", min: 1 },
                tipedata: { type: "string", min: 1 },
                maxinput: { type: "number", optional: true },
                mininput: { type: "number", optional: true },
                status: { type: "boolean", optional: true },
                isrequired: { type: "number", optional: true },
                layanan_id: { type: "number", optional: true }
            };

            // Check if the request body is an array
            if (!Array.isArray(req.body)) {
                res.status(400).json(response(400, 'Request body must be an array of objects'));
                return;
            }

            // Initialize arrays for validation errors and successfully created objects
            let errors = [];
            let createdForms = [];

            // Validate and process each object in the input array
            for (let input of req.body) {
                // Create the layananform object
                let layananformCreateObj = {
                    field: input.field,
                    tipedata: input.tipedata,
                    maxinput: input.maxinput ? Number(input.maxinput) : null,
                    mininput: input.mininput ? Number(input.mininput) : null,
                    isrequired: input.isrequired ? Number(input.isrequired) : null,
                    status: input.status !== undefined ? Boolean(input.status) : true,
                    layanan_id: input.layanan_id !== undefined ? Number(input.layanan_id) : null
                };

                // Validate the object
                const validate = v.validate(layananformCreateObj, schema);
                if (validate.length > 0) {
                    errors.push({ input, errors: validate });
                    continue;
                }

                // Create layananform in the database
                let layananformCreate = await Layanan_form.create(layananformCreateObj, { transaction });
                createdForms.push(layananformCreate);
            }

            // If there are validation errors, respond with them
            if (errors.length > 0) {
                res.status(400).json(response(400, 'Validation failed', errors));
                return;
            }

            // Respond with the successfully created objects
            await transaction.commit();
            res.status(201).json(response(201, 'Successfully created layananform(s)', createdForms));
        } catch (err) {
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua form docs berdasarkan layanan
    getDocsByLayanan: async (req, res) => {
        try {
            const { layananid } = req.params;

            let formWhereCondition = {
                tipedata: "file",
                status: true
            };
    
            if (req.user.role === 'User') {
                formWhereCondition.status = true;
            }

            let layananData = await Layanan.findOne({
                where: {
                    id: layananid
                },
                attributes: ['nama', 'slug', 'desc'],
                include: [{
                    model: Layanan_form,
                    attributes: { exclude: ['createdAt', 'updatedAt'] },
                    where: formWhereCondition,
                    required: false,
                }],
                order: [[{ model: Layanan_form }, 'id', 'ASC']]
            });

            if (!layananData) {
                return res.status(404).json(response(404, 'Layanan not found'));
            }

            // Response menggunakan helper response.formatter
            res.status(200).json(response(200, 'Success get layanan with forms dokumen', layananData));
        } catch (err) {
            res.status(500).json(response(500, 'Internal server error', err));
            console.log(err);
        }
    },

    //mengupdate layanandocs berdasarkan id
    updateLayananDocs: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            // Mendapatkan data layanandocs untuk pengecekan
            let layanandocsGet = await Layanan_form.findOne({
                where: {
                    id: req.params.id
                }
            });
    
            // Cek apakah data layanandocs ada
            if (!layanandocsGet) {
                await transaction.rollback();
                res.status(404).json(response(404, 'layanandocs not found'));
                return;
            }
    
            // Mengubah status form yang ada menjadi false
            await Layanan_form.update(
                { status: false },
                { where: { id: req.params.id }, transaction }
            );
    
            // Membuat schema untuk validasi
            const schema = {
                field: { type: "string", min: 1 },
                tipedata: { type: "string", min: 1, optional: true },
                isrequired: { type: "number", optional: true },
                status: { type: "boolean", optional: true },
                layanan_id: { type: "number", optional: true }
            };
    
            // Membuat object layanandocs baru
            let layanandocsCreateObj = {
                field: req.body.field,
                tipedata: req.body.tipedata,
                isrequired: Number(req.body.isrequired),
                status: true,
                layanan_id: req.body.layanan_id !== undefined ? Number(req.body.layanan_id) : layanandocsGet.layanan_id,
            };
    
            // Validasi
            const validate = v.validate(layanandocsCreateObj, schema);
            if (validate.length > 0) {
                await transaction.rollback(); // Rollback jika validasi gagal
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }
    
            // Membuat form baru di database
            let layanandocsCreate = await Layanan_form.create(layanandocsCreateObj, { transaction });
    
            // Commit transaksi jika semua berhasil
            await transaction.commit();
    
            // Mendapatkan data layanandocs baru setelah create
            let layanandocsAfterUpdate = await Layanan_form.findOne({
                where: {
                    id: layanandocsCreate.id,
                }
            });

            res.status(200).json(response(200, 'success update and create new layanandocs', layanandocsAfterUpdate));
        } catch (err) {
            await transaction.rollback(); // Rollback jika terjadi error
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate layanan doc
    updateMultiLayananDocs: async (req, res) => {
        const transaction = await sequelize.transaction();
    
        try {
            // Define schema for validation
            const schema = {
                field: { type: "string", min: 1 },
                tipedata: { type: "string", min: 1, optional: true },
                status: { type: "boolean", optional: true },
                isrequired: { type: "number", optional: true },
                layanan_id: { type: "number", optional: true }
            };
    
            // Check if the request body is an array
            if (!Array.isArray(req.body)) {
                res.status(400).json(response(400, 'Request body must be an array of objects'));
                return;
            }

            let errors = [];
            let updatedDocuments = [];
            let createdDocuments = [];
    
            // Validasi
            for (let input of req.body) {
                let layanandocsGet = await Layanan_form.findOne({
                    where: { id: input.id }
                });
    
                if (!layanandocsGet) {
                    errors.push({ input, errors: ['layanandocs not found'] });
                    continue;
                }
    
                await Layanan_form.update(
                    { status: false }, // Set status to false
                    { where: { id: input.id }, transaction }
                );
    
                let layanandocsCreateObj = {
                    field: input.field,
                    tipedata: input.tipedata,
                    isrequired: input.isrequired !== undefined ? Number(input.isrequired) : null,
                    status: true,
                    layanan_id: req.body.layanan_id !== undefined ? Number(req.body.layanan_id) : layanandocsGet.layanan_id,
                };
    
                // Validate the new object
                const validate = v.validate(layanandocsCreateObj, schema);
                if (validate.length > 0) {
                    errors.push({ input, errors: validate });
                    continue;
                }
    
                // Create new layanandocs in the database
                let newLayanandocs = await Layanan_form.create(layanandocsCreateObj, { transaction });
                createdDocuments.push(newLayanandocs);
            }
    
            // If there are validation errors, respond with them
            if (errors.length > 0) {
                await transaction.rollback();
                res.status(400).json(response(400, 'Validation failed', errors));
                return;
            }
    
            // Commit transaction
            await transaction.commit();
            res.status(200).json(response(200, 'Successfully updated and created new layanandocs', createdDocuments));
    
        } catch (err) {
            // Rollback transaction on error
            await transaction.rollback();
            res.status(500).json(response(500, 'Internal server error', err));
            console.error(err);
        }
    },
    
    //menghapus layanan doc
    deleteLayananDocs: async (req, res) => {
        try {
            // Mendapatkan data layanandocs untuk pengecekan
            let layanandocsGet = await Layanan_form.findOne({
                where: {
                    id: req.params.id
                }
            });
    
            // Cek apakah data layanandocs ada
            if (!layanandocsGet) {
                res.status(404).json(response(404, 'layanandocs not found'));
                return;
            }
    
            // Update status menjadi false
            await Layanan_form.update(
                { status: false }, 
                {
                    where: { id: req.params.id },
                    hooks: false
                }
            );
    
            // Response sukses
            res.status(200).json(response(200, 'Success delete layanan docs')); 
        } catch (err) {
            if (err.name === 'SequelizeForeignKeyConstraintError') {
                res.status(400).json(response(400, 'Data tidak bisa diubah karena masih digunakan pada tabel lain'));
            } else {
                res.status(500).json(response(500, 'Internal server error', err));
                console.log(err);
            }
        }
    }
    

}