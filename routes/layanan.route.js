const layananController = require('../controllers/layanan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/layanan/create', [mid.checkRolesAndLogout(['Admin Instansi','Admin Layanan', 'Admin Verifikasi', 'Super Admin'])], layananController.createlayanan);
route.get('/user/layanan/get', [mid.checkRoles()], layananController.getlayanan);
route.get('/user/layanan/bidang/get/:bidang_id', [mid.checkRoles()], layananController.getlayananbybidang); 
route.get('/user/layanan/get/:id', [mid.checkRoles()], layananController.getlayananById); 

module.exports = route;