const fs = require('fs');
const path = require('path');

const PDFfile = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');

const errorHandler500 = require('../util/errorHandler');

const product_per_page = 2;

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalProducts;

    Product.find().count().then((productNum) => {
        totalProducts = productNum;
        return Product
        .find()
        .skip((page-1) * product_per_page)
        .limit(product_per_page)
    })
    .then((products) => {
        res.render('shop/index', {
            pageTitle: '商店主頁',
            path: '/',
            products: products,
            paginationData: {
                currentPage: page,
                lastPage: Math.ceil(totalProducts / product_per_page)
            }
        });
    })
    .catch((err) => errorHandler500(next, err));
};

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalProducts;

    Product.find().count().then((productNum) => {
        totalProducts = productNum;
        return Product
        .find()
        .skip((page-1) * product_per_page)
        .limit(product_per_page)
    })
    .then((products) => {
        res.render('shop/product-list', {
            pageTitle: '商品總覽',
            path: '/products',
            products: products,
            paginationData: {
                currentPage: page,
                lastPage: Math.ceil(totalProducts / product_per_page)
            }
        });
    })
    .catch((err) => errorHandler500(next, err));
}

exports.getProductDetail = (req, res, next) => {
    const productId = req.params.productId;
    Product
    .findById(productId)
    .then((product) => {
        res.render('shop/product-detail', {
            pageTitle: product.title,
            path: '/products',
            product: product,
        })
    })
    .catch((err) => errorHandler500(next, err));
};

exports.getMyCart = (req, res, next) => {
    // {
    //     productId:{},
    //     quantity:number
    // }
    req.user
    .populate('cart.items.productId')
    .then((user) => {
        const products = user.cart.items;
        res.render('shop/my-cart', {
            pageTitle: '我的購物車',
            path: '/my-cart',
            products: products,
        });
    })
    .catch((err) => errorHandler500(next, err));
};

exports.postMyCart = (req, res, next) => {
    const productId = req.body.productId;
    Product.findById(productId)
    .then((product) => {
        return req.user.addToCart(product);
    })
    .then((result) => {
        res.redirect('/my-cart');
    })
    .catch((err) => errorHandler500(next, err));
}

exports.deleteCartItem = (req, res, next) => {
    const productId = req.params.productId;

    req.user.deleteCartItem(productId)
    .then((result) => {
        res.status(200).json({message: '刪除成功'});
    })
    .catch((err) => {
        res.status(500).json({message: '刪除失敗'})
    });
}

exports.getOrders = (req, res, next) => {
    Order.find({'user.userId': req.session.user._id})
    .then((orders) => {
        res.render('shop/orders', {
            pageTitle: '確認',
            path: '/orders',
            orders: orders
        });
    })
    .catch((err) => errorHandler500(next, err));
};

exports.postOrder = (req, res, next) => {
    if(!req.user.cart.item){
        return res.redirect('/orders');
    }
    req.user
    .populate('cart.items.productId')
    .then((user) => {
        const products = user.cart.items.map((item) => {
            return {
                product: {...item.productId._doc},
                quantity: item.quantity}
        });
        const order = new Order({
            products: products,
            user: {
                email: req.user.email,
                userId: req.user
            }
        });
        return order.save();
    })
    .then((result) => {
        return req.user.clearCart();
    })
    .then((result) => {
        res.redirect('/orders');
    })
    .catch((err) => errorHandler500(next, err))
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;

    Order.findById(orderId)
    .then((order) => {
        if(!order){
            return next(new Error('找不到該訂單'))
        }
        if(order.user.userId.toString() !== req.user._id.toString()){
            return next(new Error('無權限'))
        }
        const invoiceName = '付款通知-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', invoiceName)
        const pdfDoc = new PDFfile();

        res.setHeader('Content-Type', 'application/pdf');

        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        pdfDoc.font('NotoSansTC-Regular.otf')
        pdfDoc.fontSize(26).text('付款通知')
        pdfDoc.text('--------------')
        let totalPrice = 0;
        order.products.forEach((p) => {
            totalPrice += p.product.price * p.quantity;
            pdfDoc.fontSize(16).text(p.product.title + '-' +p.quantity + '個  ' + p.product.price * p.quantity + '元')
        });
        pdfDoc.fontSize(26).text('--------------');
        pdfDoc.text('共' + totalPrice + '元');

        pdfDoc.end();


        // res.download(invoicePath);
    })
    .catch((err) => errorHandler500(next, err));
}