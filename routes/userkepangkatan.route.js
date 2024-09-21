const userkepangkatanController = require('../controllers/userkepangkatan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/kepangkatan/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkepangkatanController.getUserDataPangkat); 
route.get('/user/kepangkatan/get/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkepangkatanController.getUserPangkatByID); 
route.delete('/user/kepangkatan/delete/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkepangkatanController.deleteUserPangkat);
route.post('/user/kepangkatan/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkepangkatanController.createUserPangkat); 
route.put('/user/kepangkatan/update/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkepangkatanController.updateUserPangkat);

module.exports = route;