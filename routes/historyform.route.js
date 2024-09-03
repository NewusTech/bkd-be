const layananforminput = require('../controllers/layananforminput.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/historyform', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin', 'User'])], layananforminput.gethistoryformuser);

route.get('/user/historydokumen', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin', 'User'])], layananforminput.gethistorydokumen);

route.get('/user/historyform/:idforminput', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin', 'User'])], layananforminput.gethistorybyid);

route.get('/historyform/pdf', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananforminput.pdfhistoryformuser);

module.exports = route;