const userkepangkatanController = require('../controllers/userkepangkatan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/kepangkatan/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkepangkatanController.getUserDataPangkat); 
route.get('/user/kepangkatan/get/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkepangkatanController.getUserPangkatByID); 
route.delete('/user/kepangkatan/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userkepangkatanController.deleteUserPangkat);

route.post('/user/kepangkatan/create', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([ ]), userkepangkatanController.createUserPangkat); 
route.put('/user/kepangkatan/update/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], upload.single('image_profile'), userkepangkatanController.updateUserPangkat);
route.put('/user/kepangkatan/updatedocs/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], upload.fields([ ]), userkepangkatanController.updateUserDocs);

module.exports = route;