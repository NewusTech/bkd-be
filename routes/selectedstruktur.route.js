const selectedstrukturController = require('../controllers/selectedstruktur.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/selected/struktur/create', [mid.checkRolesAndLogout(['Super Admin'])], selectedstrukturController.createSelectedStruktur);
route.get('/user/selected/struktur/get', selectedstrukturController.getSelectedStruktur); 
route.get('/user/selected/struktur/get/:id', selectedstrukturController.getSelectedStrukturByID); 
route.put('/user/selected/struktur/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], selectedstrukturController.updateSelectedStruktur); 
route.delete('/user/selected/struktur/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], selectedstrukturController.deleteSelectedStruktur);

module.exports = route;