const layananfile = require('../controllers/layananfile.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.post('/user/layanan/file/create/:idlayanan', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('file'), layananfile.createLayananFile);
route.get('/user/layanan/file/get/:idlayanan', layananfile.getLayananFile);
route.get('/user/layanan/file/:id/get', layananfile.getLayananFileById);
route.delete('/user/layanan/file/delete/:idlayanan', [mid.checkRolesAndLogout(['Super Admin'])], layananfile.deleteLayananFile);
route.put('/user/layanan/file/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('file'), layananfile.updateLayananFile);

module.exports = route;