const layananController = require('../controllers/layanan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/layanan/create', [mid.checkRolesAndLogout(['Super Admin'])], layananController.createLayanan);
route.get('/user/layanan/get', [mid.checkRoles()], layananController.getLayanan);
route.get('/user/layanan/bidang/get/:bidang_id', [mid.checkRoles()], layananController.getLayananByBidang); 
route.get('/user/layanan/get/:id', [mid.checkRoles()], layananController.getLayananById);
route.put('/user/layanan/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], layananController.updateLayanan); 
route.delete('/user/layanan/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], layananController.deleteLayanan);


module.exports = route;