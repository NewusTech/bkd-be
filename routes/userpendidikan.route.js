const userpendidikanController = require('../controllers/userpendidikan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/pendidikan/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpendidikanController.getUserDataPendidikan); 
route.get('/user/pendidikan/get/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpendidikanController.getUserPendidikanByID); 
route.delete('/user/pendidikan/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userpendidikanController.deleteUserPendidikan);

route.post('/user/pendidikan/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpendidikanController.createUserPendidikan); 
route.put('/user/pendidikan/update/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userpendidikanController.updateUserPendidikan);

module.exports = route;