const pengaduanController = require('../controllers/pengaduan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.post('/user/pengaduan/create', [mid.checkRolesAndLogout(['User'])], upload.single('image'), pengaduanController.createPengaduan);
route.get('/user/pengaduan/get', [mid.checkRolesAndLogout(['User', 'Super Admin', 'Kepala Dinas', 'Sekretaris Dinas', 'Kepala Bidang', 'Admin Verifikasi'])], pengaduanController.getPengaduan); 
route.get('/user/pengaduan/get/:id', pengaduanController.getPengaduanById); 
route.put('/user/pengaduan/update/:id', [mid.checkRolesAndLogout(['Super Admin', 'Kepala Bidang', 'Admin Verifikasi'])], pengaduanController.updatePengaduan); 
route.delete('/user/pengaduan/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], pengaduanController.deletePengaduan);

route.get('/user/pengaduan/pdfget', [mid.checkRolesAndLogout(['Super Admin', 'Admin Verifikasi', 'Kepala Bidang'])], pengaduanController.pdfPengaduan);
route.get('/user/bidang/report/pengaduan', [mid.checkRolesAndLogout(['Kepala Bidang','Sekretaris Bidang', 'Admin Verifikasi', 'Super Admin'])], pengaduanController.getReportPermasalahan); 

module.exports = route;