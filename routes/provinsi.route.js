const provinsiController = require('../controllers/provinsi.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/provinsi/get', provinsiController.getprovinsi); 
route.get('/user/provinsi/get/:id', provinsiController.getprovinsiById); 

module.exports = route;