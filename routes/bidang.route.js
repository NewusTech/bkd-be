const bidangController = require('../controllers/bidang.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/bidang/create', [mid.checkRolesAndLogout(['Super Admin'])], bidangController.createBidang);
route.get('/user/bidang/get', bidangController.getBidang);
route.get('/user/bidang/get/:slug', bidangController.getBidangBySlug); 
route.put('/user/bidang/update/:slug', [mid.checkRolesAndLogout(['Super Admin'])], bidangController.updateBidang); 
route.delete('/user/bidang/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], bidangController.deleteBidang);

module.exports = route;