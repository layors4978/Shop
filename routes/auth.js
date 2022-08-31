const express = require('express');
const { body } = require('express-validator');//destructure

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post('/login',
[
    body('email')
    .isEmail()
    .withMessage('信箱格式錯誤，請輸入正確的信箱')
    .normalizeEmail(),
    body('password', '密碼格式錯誤，請輸入最少八個英數字密碼，不得使用特殊符號')
    .trim()
    .isLength({min: 8})
    .isAlphanumeric()
],
authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignup);

router.post('/signup',
[
    body('email')
    .isEmail()
    .withMessage('信箱格式錯誤，請輸入正確的信箱')
    .normalizeEmail()
    .custom((value, {req}) => {
        return User.findOne({email: value})
        .then((userData) => {
            if(userData){
                return Promise.reject('此信箱已被使用');
            }
        });
    }),
    body('password', '密碼格式錯誤，請輸入最少八個英數字密碼，不得使用特殊符號')
    .trim()
    .isLength({min: 8})
    .isAlphanumeric(),
    body('confirmPassword')
    .trim()
    .custom((value, {req}) => {
        if(value !== req.body.password){
            throw new Error('密碼不同，請重新輸入')
        };
        return true;
    })
],
authController.postSignup);

router.get('/reset-password', authController.getResetPassword);

router.post('/reset-password', authController.postResetPassword);

router.get('/reset-password/:token', authController.getNewPassword);

router.post('/new-Password', authController.postNewPassword);

module.exports = router;