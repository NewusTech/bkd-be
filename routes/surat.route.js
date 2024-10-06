const suratController = require('../controllers/surat.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/detail/surat/:idlayanan', [mid.checkRolesAndLogout([ 'Super Admin', 'User'])], suratController.getTemplate); 
//untuk admin get template pdf
route.get('/user/:idlayanan/surat', [mid.checkRolesAndLogout(['Super Admin'])], suratController.getOutputSurat); 

//untuk print pdf berserta permohonan user
route.get('/user/surat/:idlayanan/:idforminput', [mid.checkRolesAndLogout(['Super Admin', 'User'])], suratController.getOutputSurat); 

route.put('/user/edit/surat/:idlayanan', [mid.checkRolesAndLogout(['Super Admin', 'User'])], suratController.editTemplateSurat); 

module.exports = route;