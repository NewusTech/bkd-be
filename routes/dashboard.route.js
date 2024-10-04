const dashboardController = require('../controllers/dashboard.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/dashboard/webuser', dashboardController.web_user);
route.get('/user/dashboard/superadmin', [mid.checkRolesAndLogout(['Super Admin'])], dashboardController.getDashboardSuperadmin); 
route.get('/user/dashboard/admin/dinas', [mid.checkRolesAndLogout(['Kepala Bidang'])], dashboardController.getDashboardKepalaBidang); 
route.get('/user/dashboard/admindinas-survey', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi'])], dashboardController.web_admin_survey); 
route.get('/user/dashboard/admindinas-antrian', [mid.checkRolesAndLogout(['Admin Instansi', 'Admin Verifikasi'])], dashboardController.web_admin_antrian); 

route.get('/user/dashboard/admlayanan-antrian', [mid.checkRolesAndLogout(['Admin Layanan'])], dashboardController.web_admantrian); 
route.get('/user/dashboard/admlayanan-survey', [mid.checkRolesAndLogout(['Admin Layanan'])], dashboardController.web_admlayanan_survey); 
route.get('/user/dashboard/admlayanan-layanan', [mid.checkRolesAndLogout(['Admin Layanan'])], dashboardController.web_admlayanan_layanan); 

module.exports = route;