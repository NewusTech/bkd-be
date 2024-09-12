const baseConfig = require('../config/base.config');
const { response } = require('../helpers/response.formatter');
const { Token } = require('../models');
const jwt = require('jsonwebtoken');

const checkRolesAndLogout = (allowedRoles) => async (req, res, next) => {
    let token;
    try {
        if (req.headers.authorization && req.headers.authorization.split(' ')[1]) {
            token = req.headers.authorization.split(' ')[1];
        } else {
            throw new Error('Token not found');
        }
    } catch (err) {
        return res.status(403).json(response(403, 'Unauthorized: invalid or missing token'));
    }

    jwt.verify(token, baseConfig.auth_secret, async (err, decoded) => {
        if (err) {
            return res.status(403).json(response(403, 'Unauthorized: token expired or invalid'));
        }

        req.user = decoded; // Menyimpan data user di req
        const tokenCheck = await Token.findOne({ where: { token } });

        if (tokenCheck) {
            return res.status(403).json(response(403, 'Unauthorized: already logged out'));
        }

        if (allowedRoles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json(response(403, 'Forbidden: insufficient access rights'));
        }
    });
};


const checkRoles = () => async (req, res, next) => {
    let token;
    try {
        if (req.headers.authorization && req.headers.authorization.split(' ')[1]) {
            token = req.headers.authorization.split(' ')[1];
        } else {
            throw new Error('Token not found');
        }
    } catch (err) {
        return res.status(403).json(response(403, 'Unauthorized: invalid or missing token'));
    }

    jwt.verify(token, baseConfig.auth_secret, (err, decoded) => {
        if (err) {
            return res.status(403).json(response(403, 'Unauthorized: token expired or invalid'));
        }

        req.user = decoded; // Menyimpan data user di req untuk digunakan di route handler
        next();
    });
};

module.exports = {
    checkRolesAndLogout,
    checkRoles
};
