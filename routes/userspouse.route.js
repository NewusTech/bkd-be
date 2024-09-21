const userspouseController = require('../controllers/userspouse.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/spouse/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userspouseController.getUserDataSpouse); 
route.get('/user/spouse/get/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userspouseController.getUserSpouseByID); 
route.delete('/user/spouse/delete/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userspouseController.deleteUserSpouse);
route.post('/user/spouse/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userspouseController.createUserSpouse); 
route.put('/user/spouse/update/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userspouseController.updateUserSpouse);

module.exports = route;