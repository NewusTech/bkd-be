const userController = require('../controllers/user.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/register', userController.createUser);
route.post('/login', userController.loginUser);
route.post('/logout', [mid.checkRolesAndLogout(['Super Admin', 'User', 'Admin Verifikasi', 'Kepala Bidang', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah'])], userController.logoutUser); 

// API UNTUK ADMIN / SUPER ADMIN
route.get('/getforuser', [mid.checkRolesAndLogout(['Super Admin', 'Admin Verifikasi'])], userController.getUser); 
route.get('/user/get/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userController.getUserBySlug); 
route.delete('/user/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userController.deleteUser);

//API BUAT USER
route.get('/user/get', [mid.checkRolesAndLogout(['User', 'Admin Verifikasi', 'Super Admin', 'Kepala Bidang', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah'])], userController.getForUser); 

route.post('/user/forgot/password', userController.forgotPassword); 
route.post('/user/reset/password/:token', userController.resetPassword); 
route.post('/user/change/password/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userController.changePassword); 
route.post('/user/change/password/by/admin/:slug', [mid.checkRolesAndLogout([ 'Super Admin', 'User'])], userController.changePasswordFromAdmin); 

route.post('/user/info/import/excel', [mid.checkRolesAndLogout(['Super Admin'])], upload.single('file'), userController.importExcel);

module.exports = route;