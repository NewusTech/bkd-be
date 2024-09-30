const layanansuratController = require('../controllers/layanansurat.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/surat/detail/:idlayanan', [mid.checkRolesAndLogout(['Super Admin', 'User'])], layanansuratController.get); 

//untuk admin get template pdf
route.get('/user/surat/:idlayanan', [mid.checkRolesAndLogout(['Super Admin'])], layanansuratController.getSurat); 

//untuk print pdf berserta permohonan user
route.get('/user/surat/:idlayanan/:idforminput', [mid.checkRolesAndLogout(['Super Admin', 'User'])], layanansuratController.getSurat); 

route.put('/user/surat/edit/:idlayanan', [mid.checkRolesAndLogout([ 'Super Admin', 'User',])], layanansuratController.editInfoSurat); 

module.exports = route;