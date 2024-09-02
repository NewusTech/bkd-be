const layananfile = require('../controllers/layananfile.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/layananfile/create/:idlayanan', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], upload.single('file'), layananfile.input);
route.get('/user/layananfile/get/:idlayanan', layananfile.get);
route.get('/user/layananfile/get/id/:id', layananfile.getbyid);
route.delete('/user/layananfile/delete/:idlayanan', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], layananfile.delete);
route.put('/user/layananfile/update/:id', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], upload.single('file'), layananfile.update);

module.exports = route;