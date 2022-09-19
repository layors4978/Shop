const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");

const User = require("../models/user");

const errorHandler500 = require("../util/errorHandler");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "nodeproject4978@gmail.com",
    pass: "qhpbkughincsfdhv",
  },
});
// const transporter = nodemailer.createTransport({
//   host: "smtp.mailtrap.io",
//   port: 2525,
//   auth: {
//     user: "88180487f43cf1",
//     pass: "41016e9b0a7754",
//   },
// });

//登入頁面
exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    pageTitle: "登入",
    path: "/login",
    errorMessage: null,
    lastInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

//登入中
exports.postLogin = async (req, res, next) => {
  email = req.body.email;
  password = req.body.password;

  const errors = validationResult(req);
  //若沒通過validation則重新render登入頁面，並保留上次的輸入
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      pageTitle: "登入",
      path: "/login",
      errorMessage: errors.array()[0].msg,
      lastInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }

  try {
    const user = await User.findOne({ email: email });
    //若找無user則重新render登入頁面，並保留上次的輸入
    if (!user) {
      return res.status(422).render("auth/login", {
        pageTitle: "登入",
        path: "/login",
        errorMessage: "電子信箱或密碼錯誤",
        lastInput: {
          email: email,
          password: password,
        },
        //validationErrors留空，代表不告訴使用者哪裡出錯
        validationErrors: [],
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(422).render("auth/login", {
        pageTitle: "登入",
        path: "/login",
        errorMessage: "電子信箱或密碼錯誤",
        lastInput: {
          email: email,
          password: password,
        },
        //validationErrors留空，代表不告訴使用者哪裡出錯
        validationErrors: [],
      });
    }
    req.session.user = user;
    req.session.isLoggedIn = true;
    //確認session已經建立後再導回首頁
    return req.session.save((err) => {
      res.redirect("/");
    });
  } catch (err) {
    next(err);
  }
};

//登出
exports.postLogout = (req, res, next) => {
  //刪掉session
  req.session.destroy(() => {
    res.redirect("/");
  });
};

//註冊頁面
exports.getSignup = (req, res, next) => {
  // let message = req.flash('error');
  // message.length > 0 ? (message = message[0]) : message = null;
  res.render("auth/signup", {
    pageTitle: "註冊",
    path: "/signup",
    errorMessage: null,
    lastInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

//註冊中
exports.postSignup = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //若沒通過validation則重新render註冊頁面，並保留上次的輸入
    return res.status(422).render("auth/signup", {
      pageTitle: "註冊",
      path: "/signup",
      errorMessage: errors.array()[0].msg,
      lastInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  try {
    //第二個參數代表hash幾次
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      password: hashedPassword,
      cart: {
        items: [],
      },
    });
    await user.save();

    res.redirect("/login");
    //信件內容
    const mailOptions = {
      from: "nodeProject4978@gmail.com",
      to: email,
      subject: "已成功註冊！",
      html: "<h1>您已成功註冊！</h1>",
    };
    return transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  } catch (err) {
    next(err);
  }
};

//忘記密碼
exports.getResetPassword = (req, res, next) => {
  let message = req.flash("error");
  message.length > 0 ? (message = message[0]) : (message = null);
  res.render("auth/reset-password", {
    pageTitle: "忘記密碼",
    path: "/reset-password",
    errorMessage: message,
  });
};

//寄送重設密碼信件中
exports.postResetPassword = (req, res, next) => {
  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset-password");
    }
    //重設密碼的token
    const token = buffer.toString("hex");

    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        req.flash("error", "此電子信箱尚未被註冊");
        return res.redirect("/reset-password");
      }
      user.resetPasswordToken = token;
      //token有效期限:3600000毫秒 === 1小時
      user.resetPasswordTokenExpiration = Date.now() + 3600000;
      await user.save();
      res.redirect("/");
      //信件內容
      const mailOptions = {
        from: "nodeProject4978@gmail.com",
        to: req.body.email,
        subject: "重設您的密碼",
        html: `
                <p>親愛的用戶您好：</p>
                <p>請點選以下的連結，進行密碼重設。</p>
                <a href="http://localhost:3000/reset-password/${token}">重新設置密碼</a>
                `,
      };
      return transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    } catch (err) {
      next(err);
    }
  });
};

//重設密碼頁面
exports.getNewPassword = async (req, res, next) => {
  const token = req.params.token;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpiration: { $gt: Date.now() },
    });
    //若token錯誤或超過有效日期
    if (!user) {
      req.flash("error", "此連結已無法使用，請重新寄出重設密碼信件");
      return res.redirect("/reset-password");
    }
    let message = req.flash("error");
    message.length > 0 ? (message = message[0]) : (message = null);
    res.render("auth/new-password", {
      pageTitle: "重設密碼",
      path: "/new-password",
      errorMessage: message,
      validationErrors: [],
      lastInput: {
        password: "",
      },
      userId: user._id.toString(),
      passwordToken: token,
    });
  } catch (err) {
    next(err);
  }
};

exports.postNewPassword = async (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //若沒通過validation則重新render註冊頁面，並保留上次的輸入
    return res.status(422).render("auth/new-password", {
      pageTitle: "重設密碼",
      path: "/new-password",
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
      lastInput: {
        password: newPassword,
      },
      userId: userId,
      passwordToken: passwordToken,
    });
  }

  try {
    //檢查token是否無效了
    const user = await User.findOne({
      resetPasswordToken: passwordToken,
      resetPasswordTokenExpiration: { $gt: Date.now() },
      _id: userId,
    });
    //若無效則導回忘記密碼頁面
    if (!user) {
      req.flash("error", "此連結已無法使用，請重新寄出重設密碼信件");
      return res.redirect("/reset-password");
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpiration = undefined;

    await user.save();
    res.redirect("/login");
  } catch (err) {
    next(err);
  }
};
