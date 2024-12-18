const userfeedbackController = require('../controllers/userfeedback.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.post('/user/feedback/create/:idlayanan', [mid.checkRolesAndLogout(['User'])], userfeedbackController.createFeedback);
route.get('/user/get/history/feedback', [mid.checkRolesAndLogout(['User', 'Super Admin', 'Admin Verifikasi', 'Kepala Bidang', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah'])], userfeedbackController.getHistoryForUser);
route.get('/user/history/feedback/detail/:idfeedback', [mid.checkRolesAndLogout(['User', 'Super Admin', 'Admin Verifikasi', 'Kepala Bidang', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah'])], userfeedbackController.getDetailHistoryFeedback);

route.get('/user/history/feedback', [mid.checkRolesAndLogout(['Super Admin', 'Admin Verifikasi', 'Kepala Bidang', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah'])], userfeedbackController.getHistoryByBidang);
route.get('/user/history/feedback/:idlayanan', [mid.checkRolesAndLogout(['Super Admin', 'Admin Verifikasi', 'Kepala Bidang', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah'])], userfeedbackController.getHistoryByLayanan);

route.get('/user/history/feedback/get/pdf', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi', 'Admin Layanan', 'Super Admin'])], userfeedbackController.getPDFHistoryByBidang);
module.exports = route;