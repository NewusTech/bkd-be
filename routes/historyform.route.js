const layananforminput = require('../controllers/layananforminput.controller.js');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/history/form', [mid.checkRolesAndLogout(['Super Admin', 'User'])], layananforminput.getHistoryFormUser);

route.get('/user/history/dokumen', [mid.checkRolesAndLogout(['Super Admin', 'User'])], layananforminput.getHistoryDokumen);

route.get('/user/history/form/:idforminput', [mid.checkRolesAndLogout([ 'Super Admin', 'User'])], layananforminput.getHistoryById);

route.get('/historyform/pdf', [mid.checkRolesAndLogout(['Super Admin'])], layananforminput.pdfHistoryFormUser);

module.exports = route;