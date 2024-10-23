const layananformController = require('../controllers/layananform.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

//get from by layanan
route.get('/user/layanan/form/:layananid', [mid.checkRolesAndLogout(['Super Admin', 'User', 'Kepala Bidang'])], layananformController.getFormByLayanan); 

route.post('/user/layanan/form/create', [mid.checkRolesAndLogout(['Super Admin', 'Kepala Bidang'])], layananformController.createLayananForm);
route.post('/user/layanan/form/createmulti', [mid.checkRolesAndLogout(['Super Admin', 'Kepala Bidang'])], layananformController.createMultiLayananForm);
route.put('/user/layanan/form/update/:id', [mid.checkRolesAndLogout([ 'Super Admin', 'Kepala Bidang'])], layananformController.updateLayananForm); 
route.put('/user/layanan/form/updatemulti/:layananid', [mid.checkRolesAndLogout(['Super Admin', 'Kepala Bidang'])], layananformController.updateMultiLayananForm); 
route.delete('/user/layanan/form/delete/:id', [mid.checkRolesAndLogout(['Super Admin', 'Kepala Bidang'])], layananformController.deleteLayananForm);

//get from docs by layanan
route.get('/user/layanan/docs/:layananid', [mid.checkRolesAndLogout(['Super Admin', 'User', 'Kepala Bidang'])], layananformController.getDocsByLayanan); 

route.post('/user/layanan/docs/create', [mid.checkRolesAndLogout(['Super Admin', 'Kepala Bidang'])], layananformController.createLayananDocs);
route.post('/user/layanan/docs/createmulti', [mid.checkRolesAndLogout(['Super Admin', 'Kepala Bidang'])], layananformController.createMultiLayananDocs);
route.put('/user/layanan/docs/update/:id', [mid.checkRolesAndLogout(['Super Admin', 'Kepala Bidang'])], layananformController.updateLayananDocs); 
route.put('/user/layanan/docs/updatemulti', [mid.checkRolesAndLogout(['Super Admin', 'Kepala Bidang'])], layananformController.updateMultiLayananDocs); 

//get semua from --> gak bakal kepake
route.get('/user/layanan/formulir/get', [mid.checkRolesAndLogout(['Super Admin'])], layananformController.getLayananForm); 
//get form by id --> gak bakal kepake
route.get('/user/layanan/formulir/get/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], layananformController.getLayananFormById); 

module.exports = route;