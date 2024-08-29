//kode dari file role.route.js

//import controller user.controller.js 
const roleController = require('../controllers/role.controller');

//import middleware dari auth.middleware.js
const mid = require('../middlewares/auth.middleware');

//express
const express = require('express');
const route = express.Router();

route.post('/role/create', [mid.checkRolesAndLogout(['Super Admin'])], roleController.createrole);
route.get('/role/get', [mid.checkRolesAndLogout(['Super Admin'])], roleController.getrole); 
route.get('/role/get/:id', [mid.checkRolesAndLogout(['Super Admin'])], roleController.getroleById); 
route.put('/role/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], roleController.updaterole); 
route.delete('/role/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], roleController.deleterole);

module.exports = route;