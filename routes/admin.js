const express = require("express");
const { body } = require("express-validator"); //destructure

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

//validator
const productSanitizer = [
  body("title").trim().not().isEmpty().withMessage("商品名稱不得為空"),
  body("price").isInt({ min: 0 }).withMessage("價格必須為數字"),
  body("description")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("敘述須至少5個字，最多200個字"),
];

// /admin/add-product get
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/add-product post
router.post(
  "/add-product",
  isAuth,
  productSanitizer,
  adminController.postAddProduct
);

router.get("/products", isAuth, adminController.getProducts);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  isAuth,
  productSanitizer,
  adminController.postEditProduct
);

router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
