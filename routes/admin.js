const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin");
const isAuth = require("../middlewares/is-auth");

const router = express.Router();

// /admin/add-product => GET
// node: after path, there is middlewares that executed from left to right
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/add-product => POST
router.post(
  "/add-product",
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    // body("imageUrl").isURL(),
    body("price").isFloat(),
    body("description").isLength({ min: 5, max: 360 }).trim(),
  ],
  isAuth,
  adminController.postAddProduct,
);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

// /admin/edit-product/:productId => GET
router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

// /admin/edit-product => POST
router.post(
  "/edit-product",
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 5, max: 360 }).trim(),
  ],
  isAuth,
  adminController.postEditProduct,
);

// /admin/delete-product => POST
router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
