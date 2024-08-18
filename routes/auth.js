const express = require("express");
const { check, body } = require("express-validator");

const authController = require("../controllers/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password", "Invalid email or password")
      .isLength({ min: 8, max: 16 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin,
);

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((value, { req }) => {
        // if (value === "test@test.com") {
        //   throw new Error("This email address is forbidden");
        // }
        // return true;

        // validator will wait for this promise to fulfill
        return User.findOne({ email: value }).then((user) => {
          if (user) {
            return Promise.reject(
              "E-Mail already exists, please pick a different one",
            );
          }
        });
      })
      .normalizeEmail(),
    body(
      "password",
      "Please enter a password with only number and text and length between 8 and 16 characters",
    )
      .isLength({ min: 8, max: 16 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords have to match!");
        }
        return true;
      }),
  ],
  authController.postSignup,
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getResetPassword);

router.post("/reset", authController.postResetPassword);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
