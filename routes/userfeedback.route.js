const userfeedbackController = require('../controllers/userfeedback.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.post('/user/feedback/create', [mid.checkRolesAndLogout(['Super Admin', 'User'])], userfeedbackController.createFeedback);

module.exports = route;