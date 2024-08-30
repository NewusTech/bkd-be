const bidangController = require('../controllers/bidang.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/bidang/create', [mid.checkRolesAndLogout(['Super Admin'])], bidangController.createbidang);
route.get('/user/bidang/get', [mid.checkRoles()], bidangController.getbidang);
route.get('/user/bidang/get/:slug', [mid.checkRoles()], bidangController.getbidangBySlug); 
route.put('/user/bidang/update/:slug', [mid.checkRolesAndLogout(['Admin Instansi', 'Super Admin'])], bidangController.updatebidang); 
route.delete('/user/bidang/delete/:slug', [mid.checkRolesAndLogout(['Admin Instansi', 'Super Admin'])], bidangController.deletebidang);

module.exports = route;