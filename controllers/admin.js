const Product = require('../models/product');
const User = require('../models/user');

const errorHandler500 = require('../util/errorHandler');
const fileHelper = require('../util/file');

const { validationResult } = require('express-validator');

const product_per_page = 2;

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalProducts;

    Product
    .find({userId: req.user._id}).count().then((productNum) => {
        totalProducts = productNum;
        return Product
        .find({userId: req.user._id})
        .skip((page-1) * product_per_page)
        .limit(product_per_page)
    })
    .then((products) => {
        // console.log(products);
        res.render('admin/admin-product-list', {
            pageTitle: '管理商品總覽',
            path: '/admin/products',
            products: products,
            paginationData: {
                currentPage: page,
                lastPage: Math.ceil(totalProducts / product_per_page)
            }
        });
    })
    .catch((err) => errorHandler500(next, err));
}

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: '新增商品',
        path: '/admin/add-product',
        editMode: false,
        lastInput: null,
        errorMessage: null,
        validationErrors: []
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const price = req.body.price;
    const image = req.file;
    const description = req.body.description;
    const errors = validationResult(req);

    if(!image){
        return res.status(422).render('admin/edit-product', {
            pageTitle: '新增商品',
            path: '/admin/add-product',
            editMode: false,
            lastInput: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: '圖片副檔名必須為jpg, jpeg或png',
            validationErrors: []
        });
    }

    const imgUrl = image.path;

    if(!errors.isEmpty()){
        return res.status(422).render('admin/edit-product', {
            pageTitle: '新增商品',
            path: '/admin/add-product',
            editMode: false,
            lastInput: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    };

    const product = new Product({
        title: title,
        price: price,
        imgUrl: imgUrl,
        description: description,
        userId: req.user
    });
    product
    .save()
    .then((result) => {
        console.log('Created');
        res.redirect('/admin/products');
    })
    .catch((err) => errorHandler500(next, err));
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if(!editMode){
        return res.redirect('/');
    }
    const productId = req.params.productId;

    Product
    .findById(productId)
    .then((product) => {
        if(!product){
            return res.redirect('/');
        };
        res.render('admin/edit-product', {
            pageTitle: '編輯商品',
            path: '/admin/edit-product',
            editMode: editMode,
            product: product,
            lastInput: null,
            errorMessage: null,
            validationErrors: []
        });
    })
    .catch((err) => errorHandler500(next, err));
};

exports.postEditProduct = async (req, res, next) => {
    const productId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const image = req.file;
    const updatedDescription = req.body.description;
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        return res.status(422).render('admin/edit-product', {
            pageTitle: '編輯商品',
            path: '/admin/edit-product',
            editMode: true,
            lastInput: {
                _id: productId,
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDescription
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    };

    try{
        product = await Product.findById(productId)
        if(product.userId.toString() !== req.user._id.toString()){
            return res.redirect('/');
        }
        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDescription;

        if(image){
            fileHelper.deleteFile(product.imgUrl)
            product.imgUrl = image.path;
        };
        
        await product.save()
        console.log('updated');
        return res.redirect('/admin/products');
    }
    catch(err){
        errorHandler500(next, err);
    }
}

exports.deleteProduct = async (req, res, next) => {
    const productId = req.params.productId;
    try{
        product = await Product.findById(productId);
        if(!product){
            return next(new Error('找無該商品'))
        };
        const imgUrl = product.imgUrl;
        result = await Product.deleteOne({_id: productId, userId: req.user._id})
        if(result.deletedCount > 0){
            fileHelper.deleteFile(imgUrl)
            console.log('cart product deleted');
            User.updateMany({}, {$pull: {'cart.items': {productId: productId} } } );
        };
        res.status(200).json({message: '刪除成功'});
    }
    catch(err){
        res.status(500).json({message: '刪除失敗'});
    };
}