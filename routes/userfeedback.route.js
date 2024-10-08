const userfeedbackController = require('../controllers/userfeedback.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.post('/user/feedback/create/:idlayanan', [mid.checkRolesAndLogout(['User'])], userfeedbackController.createFeedback);
route.get('/user/get/history/feedback', [mid.checkRolesAndLogout(['User'])], userfeedbackController.getHistoryForUser);
route.get('/user/history/feedback/detail/:idfeedback', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userfeedbackController.getDetailHistoryFeedback);

route.get('/user/history/feedback', [mid.checkRolesAndLogout(['Super Admin'])], userfeedbackController.getHistoryByBidang);
route.get('/user/history/feedback/:idlayanan', [mid.checkRolesAndLogout(['Super Admin'])], userfeedbackController.getHistoryByLayanan);

module.exports = route;