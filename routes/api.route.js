const userRoute = require('./user.route');
const userinfoRoute = require('./userinfo.route');
const roleRoute = require('./role.route');
const permissionRoute = require('./permission.route');
const bidangRoute = require('./bidang.route');
const layananRoute = require('./layanan.route');
const layananformRoute = require('./layananform.route');
const layananfileRoute = require('./layananfile.route');
const inputformRoute = require('./inputform.route');
const historyformRoute = require('./historyform.route');
const layanansuratRoute = require('./layanansurat.route');
const kecamatanRoute = require('./kecamatan.route');
const desaRoute = require('./desa.route');
const termconditionRoute = require('./termcondition.route');
const pengaduanRoute = require('./pengaduan.route');
const galeriRoute = require('./galeri.route');

module.exports = function (app, urlApi) {
    app.use(urlApi, userRoute);
    app.use(urlApi, userinfoRoute);
    app.use(urlApi, roleRoute);
    app.use(urlApi, permissionRoute);
    app.use(urlApi, bidangRoute);
    app.use(urlApi, layananRoute);
    app.use(urlApi, layananformRoute);
    app.use(urlApi, layananfileRoute);
    app.use(urlApi, inputformRoute);
    app.use(urlApi, historyformRoute);
    app.use(urlApi, layanansuratRoute);
    app.use(urlApi, kecamatanRoute);
    app.use(urlApi, desaRoute);
    app.use(urlApi, termconditionRoute);
    app.use(urlApi, pengaduanRoute);
    app.use(urlApi, galeriRoute);
}