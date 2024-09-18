const userpenghargaanController = require('../controllers/userpenghargaan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/penghargaan/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpenghargaanController.getUserDataPenghargaan); 
route.get('/user/penghargaan/get/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpenghargaanController.getUserPenghargaanByID); 
route.delete('/user/penghargaan/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userpenghargaanController.deleteUserPenghargaan);
route.post('/user/penghargaan/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpenghargaanController.createUserPenghargaan); 
route.post('/user/penghargaan/update', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpenghargaanController.updateUserPenghargaan);

module.exports = route;