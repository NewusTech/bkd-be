const kecamatanController = require('../controllers/kecamatan.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/kecamatan/get', kecamatanController.getkecamatan); 
route.get('/user/kecamatan/get/:id', kecamatanController.getkecamatanById); 

module.exports = route;