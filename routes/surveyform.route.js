const surveyformController = require('../controllers/surveyform.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.post('/user/survey/form/create', [mid.checkRolesAndLogout(['Super Admin'])], surveyformController.createSurveyForm);
route.post('/user/survey/form/createmulti', [mid.checkRolesAndLogout(['Super Admin'])], surveyformController.createMultiSurveyForm);

route.get('/user/survey/form/:instansiId', surveyformController.getSurveyByDinas); 
route.get('/user/survey/form/id/:idsurvey', [mid.checkRolesAndLogout(['Super Admin', 'User'])], surveyformController.getSurveyByIdSurvey); 

route.put('/user/survey/form/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], surveyformController.updateSurveyForm); 
route.put('/user/survey/form/update/multi', [mid.checkRolesAndLogout(['Super Admin'])], surveyformController.updateMultiSurveyForm); 

route.delete('/user/survey/form/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], surveyformController.deleteSurveyForm);

module.exports = route;