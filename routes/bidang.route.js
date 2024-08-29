const bidangController = require('../controllers/bidang.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/bidang/create', [mid.checkRolesAndLogout(['Super Admin'])], bidangController.createbidang);
route.get('/user/bidang/get', [mid.checkRoles()], bidangController.getbidang); 

module.exports = route;