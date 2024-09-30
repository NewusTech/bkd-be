const userfeedbackController = require('../controllers/userfeedback.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.post('/user/feedback/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userfeedbackController.createFeedback);
route.get('/user/feedback/:bidangid', userfeedbackController.getsurveybydinas); 
route.get('/user/feedback/detail/:idsurvey', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin', 'User'])], userfeedbackController.getsurveybyidsurvey); 

route.put('/user/feedback/update/:id', [mid.checkRolesAndLogout(['Admin Instansi', 'Super Admin'])], userfeedbackController.updatesurveyform); 
route.put('/user/feedback/updatemulti', [mid.checkRolesAndLogout(['Admin Instansi', 'Super Admin'])], userfeedbackController.updatemultisurveyform); 

route.delete('/user/feedback/delete/:id', [mid.checkRolesAndLogout(['Admin Instansi', 'Super Admin'])], userfeedbackController.deletesurveyform);

module.exports = route;