const selectedstrukturController = require("../controllers/selectedstruktur.controller");

const mid = require("../middlewares/auth.middleware");

const express = require("express");
const route = express.Router();

const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.post(
  "/user/selected/struktur/create",
  [mid.checkRolesAndLogout(["Super Admin", "Kepala Dinas"])],
  selectedstrukturController.createSelectedStruktur
);
route.get(
  "/user/selected/struktur/get",
  selectedstrukturController.getSelectedStruktur
);
route.get(
  "/user/selected/struktur/get/:id",
  selectedstrukturController.getSelectedStrukturByID
);
route.put(
  "/user/selected/struktur/update/:id",
  [mid.checkRolesAndLogout(["Super Admin", "Kepala Dinas"])],
  selectedstrukturController.updateSelectedStruktur
);
route.delete(
  "/user/selected/struktur/delete/:id",
  [mid.checkRolesAndLogout(["Super Admin", "Kepala Dinas"])],
  selectedstrukturController.deleteSelectedStruktur
);

module.exports = route;
