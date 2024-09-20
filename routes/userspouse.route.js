const userspouseController = require('../controllers/userspouse.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/spouse/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userspouseController.getUserDataSpouse); 
route.get('/user/spouse/get/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userspouseController.getUserSpouseByID); 
route.delete('/user/spouse/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userspouseController.deleteUserSpouse);
route.post('/user/spouse/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userspouseController.createUserSpouse); 
route.post('/user/spouse/update', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userspouseController.updateUserSpouse);

module.exports = route;