const dashboardController = require('../controllers/dashboard.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/dashboard/superadmin', [mid.checkRolesAndLogout(['Super Admin'])], dashboardController.getDashboardSuperadmin); 
route.get('/user/dashboard/kepala/bidang', [mid.checkRolesAndLogout(['Kepala Bidang'])], dashboardController.getDashboardKepalaBidang);
route.get('/user/dashboard/admin/verifikasi', [mid.checkRolesAndLogout(['Admin Verifikasi'])], dashboardController.getDashboardAdminVerifikasi);
route.get('/user/dashboard/kepala/dinas', [mid.checkRolesAndLogout(['Kepala Dinas'])], dashboardController.getDashboardKepalaDinas);
route.get('/user/dashboard/sekretaris/dinas', [mid.checkRolesAndLogout(['Sekretaris Dinas'])], dashboardController.getDashboardSekretarisDinas);

module.exports = route;