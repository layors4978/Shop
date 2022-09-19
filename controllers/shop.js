const PDFfile = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");

const product_per_page = 2;

//商店主頁
exports.getIndex = async (req, res, next) => {
  const page = +req.query.page || 1;
  try {
    const productsNum = await Product.find().count();
    const products = await Product.find()
      .skip((page - 1) * product_per_page)
      .limit(product_per_page);
    res.render("shop/index", {
      pageTitle: "商店主頁",
      path: "/",
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

//商品總覽
exports.getProducts = async (req, res, next) => {
  const page = +req.query.page || 1;
  try {
    const productsNum = await Product.find().count();
    const products = await Product.find()
      .skip((page - 1) * product_per_page)
      .limit(product_per_page);
    res.render("shop/product-list", {
      pageTitle: "商品總覽",
      path: "/products",
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

//商品詳細敘述
exports.getProductDetail = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    product = await Product.findById(productId);
    res.render("shop/product-detail", {
      pageTitle: product.title,
      path: "/products",
      product: product,
    });
  } catch (err) {
    next(err);
  }
};

//購物車
exports.getMyCart = async (req, res, next) => {
  //populate後的型式
  // {
  //     productId:{},
  //     quantity:number
  // }
  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items;
    res.render("shop/my-cart", {
      pageTitle: "我的購物車",
      path: "/my-cart",
      products: products,
    });
  } catch (err) {
    next(err);
  }
};

//加入購物車
exports.postMyCart = async (req, res, next) => {
  const productId = req.body.productId;
  try {
    const product = await Product.findById(productId);
    await req.user.addToCart(product);
    res.redirect("/my-cart");
  } catch (err) {
    next(err);
  }
};

//刪除商品
exports.deleteCartItem = async (req, res, next) => {
  const productId = req.params.productId;

  try {
    await req.user.deleteCartItem(productId);
    res.status(200).json({ message: "刪除成功" });
  } catch (err) {
    res.status(500).json({ message: "刪除失敗" });
  }
};

//購買紀錄
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ "user.userId": req.session.user._id });
    res.render("shop/orders", {
      pageTitle: "確認",
      path: "/orders",
      orders: orders,
    });
  } catch (err) {
    next(err);
  }
};

//結帳，新增購買紀錄
exports.postOrder = async (req, res, next) => {
  //購物車裡沒東西的話就導去購買紀錄頁面
  if (req.user.cart.items.length === 0) {
    return res.redirect("/orders");
  }

  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items.map((item) => {
      //雖然populate過了，但直接存item.productId只會存到ID，所以要用spread
      return {
        product: { ...item.productId },
        quantity: item.quantity,
      };
    });
    const order = new Order({
      products: products,
      user: {
        email: req.user.email,
        userId: req.user,
      },
    });
    await order.save();
    await req.user.clearCart();
    res.redirect("/orders");
  } catch (err) {
    next(err);
  }
};

//購買紀錄的pdf
exports.getInvoice = async (req, res, next) => {
  const orderId = req.params.orderId;

  try {
    const order = await Order.findById(orderId);
    //若查無購買紀錄
    if (!order) {
      return next(new Error("找不到該購買紀錄"));
    }
    //若order不是現在使用者的order
    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error("無權限"));
    }

    const pdfDoc = new PDFfile();

    //把header設成pdf
    res.setHeader("Content-Type", "application/pdf");

    pdfDoc.pipe(res);

    pdfDoc.font("NotoSansTC-Regular.otf");
    pdfDoc.fontSize(26).text("購買紀錄");
    pdfDoc.text("--------------");
    let totalPrice = 0;
    order.products.forEach((p) => {
      totalPrice += p.product.price * p.quantity;
      pdfDoc
        .fontSize(16)
        .text(
          p.product.title +
            "-" +
            p.quantity +
            "個  " +
            p.product.price * p.quantity +
            "元"
        );
    });
    pdfDoc.fontSize(26).text("--------------");
    pdfDoc.text("共" + totalPrice + "元");

    pdfDoc.end();
  } catch (err) {
    next(err);
  }
};
