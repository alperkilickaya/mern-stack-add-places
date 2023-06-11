const express = require("express");
const { check } = require("express-validator");

const usersControllers = require("../controller/users-controller");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.get("/", usersControllers.getAllUsers);
router.get("/:uid", usersControllers.getUserById);
router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty().withMessage("name can not be empty"),
    check("email").normalizeEmail().isEmail().withMessage("email is not valid"),
    check("password").isLength({ min: 6 }).withMessage("minimum 6 characters"),
  ],
  usersControllers.signup
);
router.post("/login", usersControllers.login);

module.exports = router;
