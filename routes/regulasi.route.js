const RegulasiController = require('../controllers/regulasi.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.post('/user/regulasi/create', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('file'), RegulasiController.createRegulasi);
route.get('/user/regulasi/get', RegulasiController.getRegulasi); 
route.get('/user/regulasi/get/:id', RegulasiController.getRegulasiByID); 
route.put('/user/regulasi/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('file'), RegulasiController.updateRegulasi); 
route.delete('/user/regulasi/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], RegulasiController.deleteRegulasi);

module.exports = route;