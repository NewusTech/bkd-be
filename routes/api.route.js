const userRoute = require('./user.route');
const userinfoRoute = require('./userinfo.route');
const roleRoute = require('./role.route');
const permissionRoute = require('./permission.route');
const bidangRoute = require('./bidang.route');
const layananRoute = require('./layanan.route');
const layananformRoute = require('./layananform.route');
const layananfileRoute = require('./layananfile.route');
const kecamatanRoute = require('./kecamatan.route');
const desaRoute = require('./desa.route');



module.exports = function (app, urlApi) {
    app.use(urlApi, userRoute);
    app.use(urlApi, userinfoRoute);
    app.use(urlApi, roleRoute);
    app.use(urlApi, permissionRoute);
    app.use(urlApi, bidangRoute);
    app.use(urlApi, layananRoute);
    app.use(urlApi, layananformRoute);
    app.use(urlApi, layananfileRoute);
    app.use(urlApi, kecamatanRoute);
    app.use(urlApi, desaRoute);
}