const layananformController = require('../controllers/layananform.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

//get from by layanan
route.get('/user/layanan/form/:layananid', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin', 'User'])], layananformController.getformbylayanan); 

route.post('/user/layananform/create', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.createlayananform);
route.post('/user/layananform/createmulti', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.createmultilayananform);
route.put('/user/layananform/update/:id', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.updatelayananform); 
route.put('/user/layananform/updatemulti', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.updatemultilayananform); 
route.delete('/user/layananform/delete/:id', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.deletelayananform);

//get from docs by layanan
route.get('/user/layanan/docs/:layananid', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin', 'User'])], layananformController.getdocsbylayanan); 

route.post('/user/layanandocs/create', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.createlayanandocs);
route.post('/user/layanandocs/createmulti', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.createmultilayanandocs);
route.put('/user/layanandocs/update/:id', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.updatelayanandocs); 
route.put('/user/layanandocs/updatemulti', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.updatemultilayanandocs); 

//get semua from --> gak bakal kepake
route.get('/user/layananform/get', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.getlayananform); 
//get form by id --> gak bakal kepake
route.get('/user/layananform/get/:id', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananformController.getlayananformById); 

module.exports = route;