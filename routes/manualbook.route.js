const manualbookController = require('../controllers/manualbook.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });
 
route.get('/user/manual/book/get', manualbookController.getManualBook);
route.get('/user/manual/book/get/:id', manualbookController.getManualBookById); 
route.put('/user/manual/book/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], upload.fields([{ name: 'dokumen', maxCount: 1 },{ name: 'video_tutorial', maxCount: 1 }]), manualbookController.updateManualBook);

module.exports = route;