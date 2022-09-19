const Product = require("../models/product");
const User = require("../models/user");

const fileHelper = require("../util/file");

const { validationResult } = require("express-validator");

const product_per_page = 2;

//管理商品列表
exports.getProducts = async (req, res, next) => {
  const page = +req.query.page || 1;

  try {
    const productsNum = await Product.find({ userId: req.user._id }).count();
    const products = await Product.find({ userId: req.user._id })
      .skip((page - 1) * product_per_page)
      .limit(product_per_page);
    res.render("admin/admin-product-list", {
      pageTitle: "管理商品列表",
      path: "/admin/products",
      products: products,
      paginationData: {
        currentPage: page,
        lastPage: Math.ceil(productsNum / product_per_page),
      },
    });
  } catch (err) {
    next(err);
  }
};

//新增商品頁面
exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "新增商品",
    path: "/admin/add-product",
    editMode: false,
    lastInput: null,
    errorMessage: null,
    validationErrors: [],
  });
};

//新增商品中
exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  const price = req.body.price;
  const image = req.file;
  const description = req.body.description;
  const errors = validationResult(req);

  //圖片形式不符則重新render新增商品頁面，並保留原本的輸入
  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "新增商品",
      path: "/admin/add-product",
      editMode: false,
      lastInput: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: "圖片副檔名必須為jpg, jpeg或png",
      validationErrors: [],
    });
  }

  const imgUrl = image.path;

  //若其他欄位形式不符則重新render新增商品頁面，並保留原本的輸入
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "新增商品",
      path: "/admin/add-product",
      editMode: false,
      lastInput: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  //新增商品
  const product = new Product({
    title: title,
    price: price,
    imgUrl: imgUrl,
    description: description,
    userId: req.user,
  });

  try {
    await product.save();
    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

//編輯商品頁面
exports.getEditProduct = async (req, res, next) => {
  const editMode = req.query.edit;
  //如果不是編輯模式則跳回首頁
  if (!editMode) {
    return res.redirect("/");
  }
  const productId = req.params.productId;

  try {
    const product = await Product.findById(productId);
    //若查無商品則跳回首頁
    if (!product) {
      return res.redirect("/");
    }
    res.render("admin/edit-product", {
      pageTitle: "編輯商品",
      path: "/admin/edit-product",
      editMode: editMode,
      product: product,
      lastInput: null,
      errorMessage: null,
      validationErrors: [],
    });
  } catch (err) {
    next(err);
  }
};

//編輯商品中
exports.postEditProduct = async (req, res, next) => {
  const productId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDescription = req.body.description;
  const errors = validationResult(req);

  //如果輸入欄位形式不符，則導回編輯商品頁面，並保留原本的輸入
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "編輯商品",
      path: "/admin/edit-product",
      editMode: true,
      lastInput: {
        _id: productId,
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDescription,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  try {
    product = await Product.findById(productId);
    //若商品ID跟現在的使用者ID不符則跳回首頁
    if (product.userId.toString() !== req.user._id.toString()) {
      return res.redirect("/");
    }
    product.title = updatedTitle;
    product.price = updatedPrice;
    product.description = updatedDescription;

    //如果換了圖片則刪掉原本的圖片並換成新的
    if (image) {
      fileHelper.deleteFile(product.imgUrl);
      product.imgUrl = image.path;
    }

    await product.save();
    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

//刪除商品鈕
exports.deleteProduct = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    product = await Product.findById(productId);
    if (!product) {
      return next(new Error("找無該商品"));
    }
    const imgUrl = product.imgUrl;
    result = await Product.deleteOne({ _id: productId, userId: req.user._id });
    //如果有刪到商品，則把圖片刪除，並把所有用戶購物車裡的此商品一並刪掉
    if (result.deletedCount > 0) {
      fileHelper.deleteFile(imgUrl);
      User.updateMany(
        {},
        { $pull: { "cart.items": { productId: productId } } }
      );
    }
    res.status(200).json({ message: "刪除成功" });
  } catch (err) {
    res.status(500).json({ message: "刪除失敗" });
  }
};
