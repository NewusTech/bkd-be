const GaleriController = require('../controllers/galeri.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.post('/user/galeri/create', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('image'), GaleriController.createGaleri);
route.get('/user/galeri/get', GaleriController.getGaleri); 
route.get('/user/galeri/get/:slug', GaleriController.getGaleriBySlug); 
route.put('/user/galeri/update/:slug', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('image'), GaleriController.updateGaleri); 
route.delete('/user/galeri/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], GaleriController.deleteGaleri);

module.exports = route;