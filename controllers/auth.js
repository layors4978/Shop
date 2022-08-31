const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');

const User = require('../models/user');

const errorHandler500 = require('../util/errorHandler');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nodeproject4978@gmail.com',
        pass: 'qhpbkughincsfdhv'
    }
});
// const transporter = nodemailer.createTransport({
//     host: "smtp.mailtrap.io",
//     port: 2525,
//     auth: {
//       user: "88180487f43cf1",
//       pass: "41016e9b0a7754"
//     }
// });

exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        pageTitle: '登入',
        path: '/login',
        errorMessage: null,
        lastInput: {
            email: '',
            password: ''
        },
        validationErrors: []
    });
}

exports.postLogin = (req, res, next) => {
    email = req.body.email;
    password = req.body.password;

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        // console.log(errors.array());
        return res.status(422).render('auth/login', {
            pageTitle: '登入',
            path: '/login',
            errorMessage: errors.array()[0].msg,
            lastInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()
        });
    };

    User.findOne({email: email})
    .then((user) => {
        if(!user){
            return res.status(422).render('auth/login', {
                pageTitle: '登入',
                path: '/login',
                errorMessage: '電子信箱或密碼錯誤',
                lastInput: {
                    email: email,
                    password: password
                },
                validationErrors: []
            });
        }
        bcrypt.compare(password, user.password)
        .then((isMatch) => {
            if(isMatch){
                req.session.user = user;
                req.session.isLoggedIn = true;
                return req.session.save((err) => {
                    res.redirect('/');
                });
            };
            return res.status(422).render('auth/login', {
                pageTitle: '登入',
                path: '/login',
                errorMessage: '電子信箱或密碼錯誤',
                lastInput: {
                    email: email,
                    password: password
                },
                validationErrors: []
            });
        })
        .catch((err) => {
            console.log(err);
            res.redirect('/login');
        });
        
    })
    .catch((err) => errorHandler500(next, err));
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(() => {
        res.redirect('/');
    })
};

exports.getSignup = (req, res, next) => {
    // let message = req.flash('error');
    // message.length > 0 ? (message = message[0]) : message = null;
    res.render('auth/signup', {
        pageTitle: '註冊',
        path: '/signup',
        errorMessage: null,
        lastInput: {
            email: '',
            password: '',
            confirmPassword: ''
        },
        validationErrors: []
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        // console.log(errors.array());
        return res.status(422).render('auth/signup', {
            pageTitle: '註冊',
            path: '/signup',
            errorMessage: errors.array()[0].msg,
            lastInput: {
                email: email,
                password: password,
                confirmPassword: confirmPassword
            },
            validationErrors: errors.array()
        });
    };

    bcrypt.hash(password, 12)
    .then((hashedPassword) => {
        const user = new User({
            email: email,
            password: hashedPassword,
            cart:{
                items:[]
            }
        });
        return user.save();
    })
    .then((result) => {
        res.redirect('/login');
        const mailOptions = {
            from: 'nodeProject4978@gmail.com',
            to: email,
            subject: '已成功註冊！',
            html:'<h1>您已成功註冊！</h1>'
        };
        return transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    })
    .catch((err) => errorHandler500(next, err))
};

exports.getResetPassword = (req, res, next) => {
    let message = req.flash('error');
    message.length > 0 ? (message = message[0]) : message = null;
    res.render('auth/reset-password', {
        pageTitle: '忘記密碼',
        path: '/reset-password',
        errorMessage: message
    });
};

exports.postResetPassword = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if(err){
            console.log(err);
            return res.redirect('/reset-password');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
        .then((user) => {
            if(!user){
                req.flash('error', '此電子信箱尚未被註冊');
                return res.redirect('/reset-password');
            }
            else{
                user.resetPasswordToken = token;
                user.resetPasswordTokenExpiration = Date.now() + 3600000;
                user.save()
                .then((result) => {
                    res.redirect('/');
                    const mailOptions = {
                        from: 'nodeProject4978@gmail.com',
                        to: req.body.email,
                        subject: '重設您的密碼',
                        html:`
                        <p>親愛的用戶您好：</p>
                        <p>請點選以下的連結，進行密碼重設。</p>
                        <a href="http://localhost:3000/reset-password/${token}">重新設置密碼</a>
                        `
                    };
                    return transporter.sendMail(mailOptions, function(error, info){
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                        }
                    });
                })
            }
        })
        .catch((err) => errorHandler500(next, err));
    });
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
        resetPasswordToken: token,
        resetPasswordTokenExpiration: {$gt: Date.now()}
    })
    .then((user) => {
        if(!user){
            req.flash('error', '此連結已無法使用，請重新寄出重設密碼信件');
            return res.redirect('/reset-password');
        };
        let message = req.flash('error');
        message.length > 0 ? (message = message[0]) : message = null;
        res.render('auth/new-password', {
            pageTitle: '重設密碼',
            path: '/new-password',
            errorMessage: message,
            userId: user._id.toString(),
            passwordToken: token
        });
    })
    .catch((err) => errorHandler500(next, err)); 
};

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;

    User.findOne({
        resrtPasswordToken: passwordToken,
        resetPasswordTokenExpiration: {$gt: Date.now()},
        _id: userId
    })
    .then((user) => {
        if(!user){
            req.flash('error', '此連結已無法使用，請重新寄出重設密碼信件');
            return res.redirect('/reset-password');
        }
        else{
            bcrypt.hash(newPassword, 12)
            .then((hashedPassword) => {
                user.password = hashedPassword;
                user.resetPasswordToken = undefined;
                user.resetPasswordTokenExpiration = undefined;
                return user.save();
            })
            .then((result) => {
                res.redirect('/login');
            })
        }
    })
    .catch((err) => errorHandler500(next, err));
};