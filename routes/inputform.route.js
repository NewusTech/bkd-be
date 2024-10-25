const layananforminput = require('../controllers/layananforminput.controller.js');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.post('/user/input/form/create/:idlayanan', [mid.checkRolesAndLogout(['User', 'Super Admin'])], upload.any(), layananforminput.inputForm);
route.put('/user/input/form/update/:idlayanannum', [mid.checkRolesAndLogout(['User', 'Super Admin'])], upload.any(), layananforminput.updateDataForm);
route.get('/user/input/form/detail/:idlayanannum', [mid.checkRolesAndLogout(['User', 'Super Admin', 'Admin Verifikasi', 'Kepala Bidang', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah'])], layananforminput.getDetailInputForm);

route.put('/user/input/form/updatestatus/:idlayanannum', [mid.checkRolesAndLogout(['Super Admin', 'Admin Verifikasi', 'Kepala Bidang', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah'])], upload.any(), layananforminput.updateStatusPengajuan);
route.put('/user/form/:idlayanannum/signing', [mid.checkRolesAndLogout(['Super Admin', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah' ])], upload.single('sign'), layananforminput.uploadSign);
route.put('/user/form/:idlayanannum/barcode', [mid.checkRolesAndLogout(['Super Admin', 'Sekretaris Dinas', 'Kepala Dinas', 'Sekretaris Daerah' ])], layananforminput.generateQRCode);
route.put('/user/input/form/file/:idlayanannum', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([{ name: 'file', maxCount: 1 }]), layananforminput.uploadFileHasil);

module.exports = route;