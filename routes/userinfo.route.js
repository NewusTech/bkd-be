const userinfoController = require('../controllers/userinfo.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.get('/userinfo/get', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userinfoController.getUserData); 
route.get('/userinfo/get/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userinfoController.getUserBySlug); 
route.delete('/userinfo/delete/:slug', [mid.checkRolesAndLogout(['Super Admin'])], userinfoController.deleteUser);

route.post('/userinfo/create', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'aktalahir', maxCount: 1 },
    { name: 'filektp', maxCount: 1 },
    { name: 'filekk', maxCount: 1 },
    { name: 'fileijazahsd', maxCount: 1 },
    { name: 'fileijazahsmp', maxCount: 1 },
    { name: 'fileijazahsma', maxCount: 1 },
    { name: 'fileijazahlain', maxCount: 1 }
]), userinfoController.createUserInfo); 
route.put('/userinfo/update/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], upload.single('image_profile'), userinfoController.updateUserInfo);
route.put('/userinfo/updatedocs/:slug', [mid.checkRolesAndLogout(['Super Admin', 'User'])], upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'aktalahir', maxCount: 1 },
    { name: 'filektp', maxCount: 1 },
    { name: 'filekk', maxCount: 1 },
    { name: 'fileijazahsd', maxCount: 1 },
    { name: 'fileijazahsmp', maxCount: 1 },
    { name: 'fileijazahsma', maxCount: 1 },
    { name: 'fileijazahlain', maxCount: 1 }
]), userinfoController.updateUserDocs);

module.exports = route;