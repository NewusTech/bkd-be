const BkdProfileController = require('../controllers/bkdprofile.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

route.post('/user/bkd/profile/create', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([{ name: 'image_bkd', maxCount: 1 },{ name: 'logo', maxCount: 1 },]), BkdProfileController.createProfile);
route.get('/user/bkd/profile/get', BkdProfileController.getProfile); 
route.get('/user/bkd/profile/get/:id', BkdProfileController.getProfileById); 
route.put('/user/bkd/profile/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([{ name: 'image_bkd', maxCount: 1 },{ name: 'logo', maxCount: 1 },]), BkdProfileController.updateProfile); 
route.delete('/user/bkd/profile/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], BkdProfileController.deleteProfile);

module.exports = route;