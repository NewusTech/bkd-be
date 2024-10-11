const suratController = require('../controllers/surat.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/detail/surat/:idlayanan', [mid.checkRolesAndLogout([ 'Super Admin', 'User'])], suratController.getTemplate);
route.get('/user/pdf/:idlayananformnum/surat', [mid.checkRolesAndLogout([ 'Super Admin', 'User'])], suratController.getPdf);  
//untuk admin get template pdf
route.get('/user/surat/:idlayanan/:idforminput', suratController.getOutputSurat); 

//untuk print pdf berserta permohonan user

route.put('/user/edit/surat/:idlayanan', [mid.checkRolesAndLogout(['Super Admin', 'User'])], suratController.editTemplateSurat); 

module.exports = route;