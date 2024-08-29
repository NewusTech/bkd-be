const userRoute = require('./user.route');
const userinfoRoute = require('./userinfo.route');
const roleRoute = require('./role.route');
const permissionRoute = require('./permission.route');

module.exports = function (app, urlApi) {
    app.use(urlApi, userRoute);
    app.use(urlApi, userinfoRoute);
    app.use(urlApi, roleRoute);
    app.use(urlApi, permissionRoute);
}