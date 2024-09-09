const pengaduanController = require('../controllers/pengaduan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/pengaduan/create', [mid.checkRolesAndLogout(['User'])], upload.single('image'), pengaduanController.createPengaduan);
route.get('/user/pengaduan/get', [mid.checkRolesAndLogout(['User', 'Super Admin'])], pengaduanController.getPengaduan); 
route.get('/user/pengaduan/get/:id', pengaduanController.getPengaduanById); 
route.put('/user/pengaduan/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], pengaduanController.updatePengaduan); 
route.delete('/user/pengaduan/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], pengaduanController.deletePengaduan);

module.exports = route;