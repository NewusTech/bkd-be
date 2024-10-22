const StrukturController = require('../controllers/struktur.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.post('/user/struktur/file/create', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('file'), StrukturController.createStruktur);
route.get('/user/struktur/file/get', StrukturController.getStruktur); 
route.get('/user/struktur/file/get/:id', StrukturController.getStrukturByID); 
route.put('/user/struktur/file/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('file'), StrukturController.updateStruktur); 
route.delete('/user/struktur/file/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], StrukturController.deleteStruktur);

module.exports = route;