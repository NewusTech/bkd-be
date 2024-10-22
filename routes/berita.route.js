const beritaController = require('../controllers/berita.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 } });

route.post('/user/berita/create', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('image'), beritaController.createBerita);
route.get('/user/berita/get', beritaController.getBerita); 
route.get('/user/berita/get/:slug', beritaController.getBeritaBySlug); 
route.put('/user/berita/update/:slug', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('image'), beritaController.updateBerita); 
route.delete('/user/berita/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], beritaController.deleteBerita);

module.exports = route;