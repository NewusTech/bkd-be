const layananController = require('../controllers/layanan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/layanan/create', [mid.checkRolesAndLogout(['Super Admin'])], layananController.createLayanan);
route.get('/user/layanan/get', layananController.getLayanan);
route.get('/user/layanan/bidang/get/:bidang_id',  layananController.getLayananByBidang); 
route.get('/user/layanan/get/:id', layananController.getLayananById);
route.put('/user/layanan/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], layananController.updateLayanan); 
route.delete('/user/layanan/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], layananController.deleteLayanan);

//history
route.get('/user/layanan/report/get', [mid.checkRolesAndLogout(['Super Admin'])], layananController.getReportLayanan); 
// route.get('/user/layanan/report-pdf', [mid.checkRolesAndLogout(['Admin Instansi','Admin Layanan', 'Admin Verifikasi', 'Super Admin'])], layananController.pdfreportlayanan); 


module.exports = route;