const userpenghargaanController = require('../controllers/userpenghargaan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/penghargaan/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpenghargaanController.getUserDataPenghargaan); 
route.get('/user/penghargaan/get/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpenghargaanController.getUserPenghargaanByID); 
route.delete('/user/penghargaan/delete/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpenghargaanController.deleteUserPenghargaan);
route.post('/user/penghargaan/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpenghargaanController.createUserPenghargaan); 
route.put('/user/penghargaan/update/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpenghargaanController.updateUserPenghargaan);

module.exports = route;