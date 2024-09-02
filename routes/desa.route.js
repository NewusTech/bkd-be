const desaController = require('../controllers/desa.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/desa/get', desaController.getdesa); 
route.get('/user/desa/get/:id', desaController.getdesaById); 

module.exports = route;