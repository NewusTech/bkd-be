const faqController = require('../controllers/faq.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.post('/user/faq/create', [mid.checkRolesAndLogout(['Super Admin'])], faqController.createFaq);
route.get('/user/faq/get', faqController.getFaq); 
route.get('/user/faq/get/:id', faqController.getFaqById); 
route.put('/user/faq/update/:id', [mid.checkRolesAndLogout(['Super Admin'])], faqController.updateFaq); 
route.delete('/user/faq/delete/:id', [mid.checkRolesAndLogout(['Super Admin'])], faqController.deleteFaq);

module.exports = route;