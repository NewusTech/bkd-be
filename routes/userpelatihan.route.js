const userpelatihanController = require('../controllers/userpelatihan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/pelatihan/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpelatihanController.getUserDataPelatihan); 
route.get('/user/pelatihan/get/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpelatihanController.getUserPelatihanByID); 
route.delete('/user/pelatihan/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userpelatihanController.deleteUserPelatihan);
route.post('/user/pelatihan/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpelatihanController.createUserPelatihan); 
route.post('/user/pelatihan/update', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpelatihanController.updateUserPelatihan);

module.exports = route;