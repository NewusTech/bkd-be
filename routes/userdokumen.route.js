const userdokumenController = require('../controllers/userdokumen.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.get('/user/dokumen/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userdokumenController.getUserDataDokumen); 
route.get('/user/dokumen/get/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userdokumenController.getUserDokumenByID); 
route.post('/user/dokumen/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], upload.fields([{ name: 'sk_80', maxCount: 1 }, { name: 'sk_100', maxCount: 1 }, { name: 'kartu_pegawai', maxCount: 1 },
    { name: 'ktp', maxCount: 1 }, { name: 'kk', maxCount: 1 },{ name: 'npwp', maxCount: 1 }]), userdokumenController.createUserDokumen); 
route.put('/user/dokumen/update', [mid.checkRolesAndLogout(['Super Admin', 'User'])], upload.fields([{ name: 'sk_80', maxCount: 1 }, { name: 'sk_100', maxCount: 1 }, { name: 'kartu_pegawai', maxCount: 1 },
    { name: 'ktp', maxCount: 1 }, { name: 'kk', maxCount: 1 },{ name: 'npwp', maxCount: 1 }]), userdokumenController.updateUserDokumen);
route.delete('/user/dokumen/delete/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userdokumenController.deleteUserDokumen);

module.exports = route;