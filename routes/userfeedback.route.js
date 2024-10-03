const userfeedbackController = require('../controllers/userfeedback.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.post('/user/feedback/create/:idlayanan', [mid.checkRolesAndLogout(['User'])], userfeedbackController.createFeedback);
route.get('/user/history/feedback', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userfeedbackController.getHistoryByBidang);

module.exports = route;