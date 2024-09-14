const userinfoController = require('../controllers/userinfo.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/user/pendidikan/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userinfoController.getUserData); 
route.get('/user/pendidikan/get/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userinfoController.getUserBySlug); 
route.delete('/user/pendidikan/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], userinfoController.deleteUser);

route.post('/user/pendidikan/create', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([ ]), userinfoController.createUserInfo); 
route.put('/user/pendidikan/update/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], upload.single('image_profile'), userinfoController.updateUserInfo);
route.put('/user/pendidikan/updatedocs/:id', [mid.checkRolesAndLogout(['Super Admin', 'User'])], upload.fields([ ]), userinfoController.updateUserDocs);

module.exports = route;