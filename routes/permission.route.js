//kode dari file permission.route.js

//import controller user.controller.js 
const permissionController = require('../controllers/permission.controller');

//import middleware dari auth.middleware.js
const mid = require('../middlewares/auth.middleware');

//express
const express = require('express');
const route = express.Router();

route.post('/permission/create', [mid.checkRolesAndLogout(['Super Admin'])], permissionController.createpermission);
route.get('/permission/get', [mid.checkRolesAndLogout(['Super Admin'])], permissionController.getpermission); 
route.get('/permission/get/:id', [mid.checkRolesAndLogout(['Super Admin'])], permissionController.getpermissionById); 
route.put('/permission/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], permissionController.updatepermission); 
route.delete('/permission/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], permissionController.deletepermission);

module.exports = route;