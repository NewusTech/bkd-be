const userjabatanController = require('../controllers/userjabatan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/jabatan/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userjabatanController.getUserDataJabatan); 
route.get('/user/jabatan/get/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userjabatanController.getUserJabatanByID); 
route.delete('/user/jabatan/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userjabatanController.deleteUserJabatan);


module.exports = route;