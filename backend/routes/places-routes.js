const express = require("express");
const { check } = require("express-validator");

// places-controller.js'deki fonksiyonları import et
const placesControllers = require("../controller/places-controller");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/:pid", placesControllers.getPlaceById);
router.get("/user/:uid", placesControllers.getPlacesByUserId);
// authMiddleware'den gelen token'ı kontrol ediyoruz.
router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty().withMessage("title can not be empty"),
    check("description")
      .isLength({ min: 5 })
      .withMessage("minimum 5 characters"),
    check("address").not().isEmpty().withMessage("address can not be empty"),
  ],
  placesControllers.createPlace
);

router.patch(
  "/:pid",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty().withMessage("title can not be empty"),
    check("description")
      .isLength({ min: 5 })
      .withMessage("minimum 5 characters"),
  ],
  placesControllers.updatePlace
);

router.delete("/:pid", placesControllers.deletePlace);

module.exports = router;
