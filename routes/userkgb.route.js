const userkgbController = require('../controllers/userkgb.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/gaji/berkala/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkgbController.getUserDataKGB); 
route.get('/user/gaji/berkala/get/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkgbController.getUserKGBByID); 
route.delete('/user/gaji/berkala/delete/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkgbController.deleteUserKGB);
route.post('/user/gaji/berkala/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkgbController.createUserKGB); 
route.put('/user/gaji/berkala/update/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userkgbController.updateUserKGB);

module.exports = route;