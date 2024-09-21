const userdescendantController = require('../controllers/userdescendant.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/descendant/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userdescendantController.getUserDataDescendant); 
route.get('/user/descendant/get/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userdescendantController.getUserDescendantByID); 
route.delete('/user/descendant/delete/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userdescendantController.deleteUserDescendant);
route.post('/user/descendant/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userdescendantController.createUserDescendant); 
route.put('/user/descendant/update/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userdescendantController.updateUserDescendant);

module.exports = route;