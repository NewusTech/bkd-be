const userinfoController = require('../controllers/userinfo.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.get('/user/info/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userinfoController.getUserData); 
route.get('/user/info/get/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userinfoController.getUserBySlug); 
route.delete('/user/info/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userinfoController.deleteUser);
route.post('/user/info/create', [mid.checkRolesAndLogout(['Super Admin'])],  upload.single('image_profile'), userinfoController.createUserInfo); 
route.put('/user/info/update', [mid.checkRolesAndLogout(['Super Admin', 'User'])], upload.single('image_profile'), userinfoController.updateUserInfo);

route.get('/user/info/admin/get', [mid.checkRolesAndLogout(['Super Admin'])], userinfoController.getAdminData); 
route.get('/user/info/admin/get/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userinfoController.getAdminBySlug); 
route.put('/user/info/admin/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], userinfoController.updateAdminById); 


module.exports = route;