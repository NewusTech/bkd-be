const BannerController = require('../controllers/banner.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 } });

route.post('/user/banner/create', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([{ name: 'image', maxCount: 1 },{ name: 'image_potrait', maxCount: 1 },]), BannerController.createBanner);
route.get('/user/banner/get', BannerController.getBanner); 
route.get('/user/banner/get/:id', BannerController.getBannerById); 
route.put('/user/banner/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([{ name: 'image', maxCount: 1 },{ name: 'image_potrait', maxCount: 1 },]), BannerController.updateBanner); 
route.delete('/user/banner/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], BannerController.deleteBanner);

module.exports = route;