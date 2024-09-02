const suratController = require('../controllers/surat.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/detailsurat/:idlayanan', [mid.checkRolesAndLogout(['Admin Instansi', 'Super Admin', 'User', 'Admin Layanan'])], suratController.get); 

//untuk admin get template pdf
route.get('/user/surat/:idlayanan', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], suratController.getsurat); 

//untuk print pdf berserta permohonan user
route.get('/user/surat/:idlayanan/:idforminput', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin', 'User'])], suratController.getsurat); 

route.put('/user/editsurat/:idlayanan', [mid.checkRolesAndLogout(['Admin Instansi', 'Super Admin', 'User', 'Admin Layanan'])], suratController.editinfosurat); 

module.exports = route;