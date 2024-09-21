const pangkatController = require('../controllers/pangkat.controller');

const mid = require('../middlewares/auth.middleware');

const express = require('express');
const route = express.Router();

route.get('/user/pangkat/get', pangkatController.getPangkat); 
route.get('/user/pangkat/get/:id', pangkatController.getPangkatById); 

module.exports = route;