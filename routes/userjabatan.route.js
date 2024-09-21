const userjabatanController = require('../controllers/userjabatan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/jabatan/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userjabatanController.getUserDataJabatan); 
route.get('/user/jabatan/get/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userjabatanController.getUserJabatanByID); 
route.delete('/user/jabatan/delete/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userjabatanController.deleteUserJabatan);
route.post('/user/jabatan/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userjabatanController.createUserJabatan); 
route.put('/user/jabatan/update/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userjabatanController.updateUserJabatan);

module.exports = route;