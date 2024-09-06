const termconditionController = require('../controllers/termcondition.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
 
route.get('/user/term-condition/get', termconditionController.getTermCondition); 
route.put('/user/term-condition/update', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([{ name: 'desc', maxCount: 1 }, { name: 'privacy', maxCount: 1 }]), termconditionController.updateTermCondition); 

module.exports = route;