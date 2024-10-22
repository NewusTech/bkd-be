const bkdstrukturController = require("../controllers/bkdstruktur.controller");

const mid = require("../middlewares/auth.middleware");

const express = require("express");
const route = express.Router();

const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 }  });

route.post(
  "/user/bkd/struktur/create",
  [mid.checkRolesAndLogout(["Super Admin", "Kepala Dinas"])],
  upload.single("image"),
  bkdstrukturController.createBkdStruktur
);
route.get("/user/bkd/struktur/get", bkdstrukturController.getBkdStruktur);
route.get(
  "/user/bkd/struktur/get/:slug",
  bkdstrukturController.getBkdStrukturBySlug
);
route.put(
  "/user/bkd/struktur/update/:slug",
  [mid.checkRolesAndLogout(["Super Admin", "Kepala Dinas"])],
  upload.single("image"),
  bkdstrukturController.updateBkdStruktur
);
route.delete(
  "/user/bkd/struktur/delete/:slug",
  [mid.checkRolesAndLogout(["Super Admin", "Kepala Dinas"])],
  bkdstrukturController.deleteBkdStruktur
);

module.exports = route;
