const BkdProfileController = require('../controllers/bkdprofile.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/profile/create', [mid.checkRolesAndLogout(['Super Admin'])], BkdProfileController.createProfile);
route.get('/user/profile/get', BkdProfileController.getProfile); 
route.get('/user/profile/get/:id', BkdProfileController.getProfileById); 
route.put('/user/profile/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], BkdProfileController.updateProfile); 
route.delete('/user/profile/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], BkdProfileController.deleteProfile);

module.exports = route;