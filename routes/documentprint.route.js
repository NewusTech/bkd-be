const DocumentPrintController = require("../controllers/documentprint.controller");

const mid = require("../middlewares/auth.middleware");

const express = require("express");
const route = express.Router();

route.get("/admin/document/print/application/get", [
  mid.checkRolesAndLogout(["Super Admin"]),
  DocumentPrintController.getApplicationHistoryPrint,
]);

route.get(
  "/admin/document/print/staff-bkd/get",
  mid.checkRolesAndLogout(["Super Admin"]),
  DocumentPrintController.getStaffBKDPrint
);

route.get("/admin/document/print/user-complaint/get", [
  mid.checkRolesAndLogout(["Super Admin"]),
  DocumentPrintController.getUserComplaintPrint,
]);

route.get(
  "/admin/document/excel/print/application/get",
  mid.checkRolesAndLogout(["Super Admin"]),
  DocumentPrintController.getApplicationHistoryExcelPrint
);

route.get(
  "/admin/document/excel/print/user-complaint/get",
  mid.checkRolesAndLogout(["Super Admin"]),
  DocumentPrintController.getUserComplaintExcelPrint
);

route.get(
  "/admin/document/excel/print/staff-bkd/get",
  mid.checkRolesAndLogout(["Super Admin"]),
  DocumentPrintController.getStaffBKDExcelPrint
);

route.get("/admin/document/print/satisfaction-index/:layananId/get", [
  mid.checkRolesAndLogout(["Super Admin"]),
  DocumentPrintController.getSatisfactionHistoryDetailPrint,
]);

route.get("/admin/document/excel/print/satisfaction-index/:layananId/get", [
  mid.checkRolesAndLogout(["Super Admin"]),
  DocumentPrintController.getSatisfactionHistoryDetailExcelPrint,
]);

module.exports = route;
