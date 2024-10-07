const { response } = require('../helpers/response.formatter');

const { User, Token, User_permission, Permission, sequelize } = require('../models');
const baseConfig = require('../config/base.config');
const passwordHash = require('password-hash');
const jwt = require('jsonwebtoken');
const { generatePagination } = require('../pagination/pagination');
const Validator = require("fastest-validator");
const v = new Validator();
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const logger = require('../errorHandler/logger');

module.exports = {

    //membuat permission
    createpermission: async (req, res) => {
        try {

            //membuat schema untuk validasi
            const schema = {
                name: {
                    type: "string",
                    min: 3,
                },
            }

            //buat object permission
            let permissionCreateObj = {
                name: req.body.name,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(permissionCreateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //buat permission
            let permissionCreate = await Permission.create(permissionCreateObj);

            res.status(201).json(response(201, 'success create permission', permissionCreate));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan semua data permission
    getpermission: async (req, res) => {
        try {
            //mendapatkan data semua permission
            let permissionGets = await Permission.findAll({
                order: [['id', 'ASC']]
            });

            res.status(200).json(response(200, 'success get permission', permissionGets));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mendapatkan data permission berdasarkan id
    getpermissionById: async (req, res) => {
        try {
            //mendapatkan data permission berdasarkan id
            let permissionGet = await Permission.findOne({
                where: {
                    id: req.params.id
                },
            });

            //cek jika permission tidak ada
            if (!permissionGet) {
                res.status(404).json(response(404, 'permission not found'));
                return;
            }

            res.status(200).json(response(200, 'success get permission by id', permissionGet));
        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //mengupdate permission berdasarkan id
    updatepermission: async (req, res) => {
        try {
            //mendapatkan data permission untuk pengecekan
            let permissionGet = await Permission.findOne({
                where: {
                    id: req.params.id
                }
            })

            //cek apakah data permission ada
            if (!permissionGet) {
                res.status(404).json(response(404, 'permission not found'));
                return;
            }

            //membuat schema untuk validasi
            const schema = {
                name: {
                    type: "string",
                    min: 3,
                    optional: true
                },
            }

            //buat object permission
            let permissionUpdateObj = {
                name: req.body.name,
            }

            //validasi menggunakan module fastest-validator
            const validate = v.validate(permissionUpdateObj, schema);
            if (validate.length > 0) {
                res.status(400).json(response(400, 'validation failed', validate));
                return;
            }

            //update permission
            await Permission.update(permissionUpdateObj, {
                where: {
                    id: req.params.id,
                }
            })

            //mendapatkan data permission setelah update
            let permissionAfterUpdate = await Permission.findOne({
                where: {
                    id: req.params.id,
                }
            })

            res.status(200).json(response(200, 'success update permission', permissionAfterUpdate));

        } catch (err) {
            res.status(500).json(response(500, 'internal server error', err));
            console.log(err);
        }
    },

    //menghapus permission berdasarkan id
    deletepermission: async (req, res) => {
        try {

            //mendapatkan data permission untuk pengecekan
            let permissionGet = await Permission.findOne({
                where: {
                    id: req.params.id
                }
            })

            //cek apakah data permission ada
            if (!permissionGet) {
                res.status(404).json(response(404, 'permission not found'));
                return;
            }

            await Permission.destroy({
                where: {
                    id: req.params.id,
                }
            })

            res.status(200).json(response(200, 'success delete permission'));

        } catch (err) {
            if (err.name === 'SequelizeForeignKeyConstraintError') {
                res.status(400).json(response(400, 'Data tidak bisa dihapus karena masih digunakan pada tabel lain'));
            } else {
                res.status(500).json(response(500, 'Internal server error', err));
                console.log(err);
            }
        }
    },

    // get permission berdasarkan user id
    getUserPermissions: async (req, res) => {
        const { userId } = req.params;

        try {
            // Find the user
            const user = await User.findByPk(userId, {
                include: {
                    model: Permission,
                    through: User_permission,
                    as: 'permissions'
                }
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json(response(200, 'success get data', { permissions: user?.permissions }));
        } catch (error) {
            logger.error(`Error : ${error}`);
            logger.error(`Error message: ${error.message}`);
            console.error('Error fetching user permissions:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    updateUserPermissions: async (req, res) => {
        const { userId, permissions } = req.body;

        try {
            // Find the user
            const user = await User.findByPk(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Find all permission records that match the given permission names
            const permissionRecords = await Permission.findAll({
                where: {
                    id: permissions
                }
            });

            if (permissionRecords.length !== permissions.length) {
                return res.status(400).json({ message: 'Some permissions not found' });
            }

            // Get the ids of the found permissions
            const permissionIds = permissionRecords.map(permission => permission.id);

            // Remove old permissions
            await User_permission.destroy({
                where: { user_id: userId }
            });

            // Add new permissions
            const userPermissions = permissionIds.map(permissionId => ({
                user_id: userId,
                permission_id: permissionId
            }));

            await User_permission.bulkCreate(userPermissions);

            res.status(200).json({ message: 'Permissions updated successfully' });
        } catch (error) {
            logger.error(`Error : ${error}`);
            logger.error(`Error message: ${error.message}`);
            console.error('Error updating permissions:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}